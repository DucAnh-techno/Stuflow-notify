// lib/moodle.ts
import * as cheerio from "cheerio";
import { fetch as undiciFetch, Dispatcher } from "undici";
import { CookieJar as ToughCookieJar } from "tough-cookie";
import { CookieAgent } from "http-cookie-agent/undici";

/**
 * This file:
 * - uses tough-cookie as the real CookieJar
 * - uses http-cookie-agent/undici CookieAgent as the undici dispatcher so cookies are handled automatically
 * - still follows redirects MANUALLY (redirect: "manual") so we capture Set-Cookie on intermediate 3xx responses
 *
 * To avoid unsafe `any`, we declare small lightweight interfaces for headers/response shapes we access.
 */

const BASE = process.env.MOODLE_THNN || "https://thnn.ut.edu.vn";

/* ---------------------- small helper types ---------------------- */

type HeadersLike = {
  // undici may expose raw() via internal symbol; when available it returns a record of arrays
  raw?: () => Record<string, string[]>;
  get(name: string): string | null;
};

type FetchResponse = Response & {
  headers: HeadersLike;
  status: number;
  text(): Promise<string>;
};

/* ---------------------- cookie jar + agent factory ---------------------- */

function createJarAndAgent() {
  // tough-cookie jar (server-side)
  const jar = new ToughCookieJar();

  // create cookie-aware agent for undici
  const agent = new CookieAgent({
    // the `cookies` option expects an object like { jar }
    cookies: { jar }
  });

  return { jar, agent };
}

/* ---------------------- helper to collect set-cookie and store into tough-cookie jar ---------------------- */

async function collectSetCookieFromResAny(res: FetchResponse, resUrl: string, jar: ToughCookieJar) {
  // Try raw() if available (undici headers sometimes expose raw() via Symbol)
  try {
    // cast through unknown to our HeadersLike to avoid using `any`
    const headersLike = res.headers as unknown as HeadersLike;
    const rawHeaders = headersLike.raw?.();
    if (rawHeaders && Array.isArray(rawHeaders["set-cookie"])) {
      const cookies = rawHeaders["set-cookie"] as string[];
      for (const c of cookies) {
        // tough-cookie: setCookie(cookieString, url)
        try {
          // setCookie accepts cookie-string and a current URL to resolve domain/path attributes
          // tough-cookie v4+ returns a Promise
          await jar.setCookie(c, resUrl);
        } catch (err: unknown) {
          // fallback: parse name/value into our own map if setCookie fails
          console.error(err);
        }
      }
      console.log("set-cookie (raw array):", cookies);
      return;
    }
  } catch (err: unknown) {
    // ignore and continue fallback (but log)
    console.error(err);
  }

  const sc = typeof (res.headers.get) === "function" ? res.headers.get("set-cookie") : null;
  if (sc) {
    try {
      await jar.setCookie(sc, resUrl);
    } catch (err: unknown) {
      console.error(err);
    }
    console.log("set-cookie (single):", sc);
  }
}

/* ---------------------- fetchWithJar: manual redirect + cookie handling ---------------------- */

async function fetchWithJar(url: string, opts: RequestInit = {}, jar: ToughCookieJar, agent: Dispatcher): Promise<FetchResponse> {
  const baseHeaders: Record<string, string> = opts.headers ? { ...(opts.headers as Record<string, string>) } : {};
  let currentUrl = url;
  let method = opts.method ?? "GET";
  let body: unknown = typeof opts.body === "undefined" ? undefined : opts.body;
  const maxRedirects = 10;

  for (let i = 0; i < maxRedirects; i++) {
    // get cookie header for this target URL from tough-cookie
    let cookieHeader = "";
    try {
      // tough-cookie jar.getCookieString(url) returns Promise<string>
      cookieHeader = (await jar.getCookieString(currentUrl)) || "";
    } catch (err: unknown) {
      cookieHeader = "";
      console.error(err);
    }

    const headersForRequest: Record<string, string> = { ...baseHeaders };
    if (cookieHeader) headersForRequest["cookie"] = cookieHeader;

    console.log(">>> jar cookie header (will be sent if non-empty):", cookieHeader);

    // undici fetch with our CookieAgent as dispatcher; use redirect: "manual"
  const res = await undiciFetch(currentUrl, {
    method,
    // cast at the call site to undici's BodyInit type to satisfy undici's overload
    body: (body as unknown) as import("undici/types/fetch").BodyInit,
    headers: headersForRequest,
    dispatcher: agent,
    redirect: "manual"
  }) as unknown as FetchResponse;

    // collect set-cookie from this response and add to tough-cookie jar using currentUrl
    await collectSetCookieFromResAny(res, currentUrl, jar);

    // if redirect -> follow manual
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) {
        return res;
      }
      currentUrl = new URL(loc, currentUrl).toString();
      if (res.status === 303 || ((res.status === 301 || res.status === 302) && method === "POST")) {
        method = "GET";
        body = undefined;
      }
      continue;
    }

    // final response
    return res;
  }

  throw new Error("Too many redirects in fetchWithJar");
}

/* ---------------------- html helpers (unchanged) ---------------------- */

function extractLoginToken(html: string): string {
  const $ = cheerio.load(html);
  return $('input[name="logintoken"]').attr("value") || "";
}

function extractSesskey(html: string): string | null {
  const patterns = [
    /M\.cfg\.sesskey\s*=\s*['"]([a-zA-Z0-9]+)['"]/,
    /sesskey['"]?\s*[:=]\s*['"]([a-zA-Z0-9]+)['"]/,
    /data-sesskey=['"]([a-zA-Z0-9]+)['"]/,
    /var\s+sesskey\s*=\s*['"]([a-zA-Z0-9]+)['"]/
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  const $ = cheerio.load(html);
  const v = $('input[name="sesskey"]').attr("value");
  if (v) return v;
  return null;
}

/* ---------------------- RPC / main flow using fetchWithJar ---------------------- */

async function callUpcomingViewRPC(jar: ToughCookieJar, agent: Dispatcher, sesskey: string, { courseId = "0", categoryId = "0" } = {}) {
  const rpcUrl = `${BASE}/lib/ajax/service.php?sesskey=${encodeURIComponent(sesskey || "")}&info=core_calendar_get_calendar_upcoming_view`;
  const rpcBody = [{
    index: 0,
    methodname: "core_calendar_get_calendar_upcoming_view",
    args: { courseid: String(courseId), categoryid: String(categoryId) }
  }];

  // For debugging: show cookies known to tough-cookie (best-effort)
  let cookieString = "";
  try {
    cookieString = await jar.getCookieString(rpcUrl);
  } catch (err: unknown) {
    cookieString = "";
    console.error(err);
  }
  console.log("Cookie header for RPC (computed):", cookieString);
  console.log("Jar raw (best-effort):", "(cannot sync show internal tough-cookie store easily)");

  const r = await fetchWithJar(rpcUrl, {
    method: "POST",
    body: JSON.stringify(rpcBody),
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": `${BASE}/calendar/view.php`,
    }
  }, jar, agent);

  const text = await r.text();

  try {
    const parsed: unknown = JSON.parse(text);

    // helper guard
    const isObject = (v: unknown): v is Record<string, unknown> =>
      typeof v === "object" && v !== null;

    if (Array.isArray(parsed) && parsed.length > 0 && isObject(parsed[0])) {
      const p0 = parsed[0];

      // p0.error === false (note: p0.error may be undefined or any type)
      if (p0.error === false && isObject(p0.data)) {
        const data = p0.data;
        // events is expected to be an array
        if (Array.isArray(data.events)) {
          // events chắc chắn là mảng; trả về dưới dạng unknown[] (không dùng `any`)
          return data.events as unknown[];
        }
        // upcoming có thể ở dạng bất kỳ (object, array, string...), trả trực tiếp nếu tồn tại
        if (typeof data.upcoming !== "undefined") {
          return data.upcoming;
        }
      }

      // Nếu không thỏa điều kiện trên, trả về p0 nguyên vẹn (object)
      return p0;
    }

    // Nếu parsed không phải mảng hoặc rỗng, trả về parsed (unknown)
    return parsed;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      "Failed parse upcoming_view RPC JSON: " +
        msg +
        " (raw snippet: " +
        text.slice(0, 300) +
        ")"
    );
  }
}

/* ---------------------- exported main ---------------------- */

export async function loginAndFetch(username: string, password: string, { courseId = "0", categoryId = "0" } = {}) {
  const { jar, agent } = createJarAndAgent();

  // 1) GET login page
  const loginPageRes = await fetchWithJar(`${BASE}/login/index.php`, { method: "GET" }, jar, agent);
  const loginPageHtml = await loginPageRes.text();
  const loginToken = extractLoginToken(loginPageHtml);

  // 2) POST login
  const params = new URLSearchParams();
  params.append("username", username);
  params.append("password", password);
  params.append("logintoken", loginToken);

  console.log("POST__________:", params);

  const postResp = await fetchWithJar(`${BASE}/login/index.php`, {
    method: "POST",
    body: params.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Referer": `${BASE}/login/index.php`,
      "Accept": "text/html,application/xhtml+xml"
    }
  }, jar, agent);

  const postHtml = await postResp.text();

  // 3) sesskey extraction (try post-login HTML, else /my/)
  let sesskey = extractSesskey(postHtml);
  if (!sesskey) {
    const dash = await fetchWithJar(`${BASE}/my/`, { method: "GET" }, jar, agent);
    const dashHtml = await dash.text();
    sesskey = extractSesskey(dashHtml);
  }

  if (!sesskey) {
    throw new Error("Không tìm thấy sesskey sau khi đăng nhập");
  }
  console.log("sesskey:", sesskey);

  let upcoming: unknown = null;
  try {
    upcoming = await callUpcomingViewRPC(jar, agent, sesskey, { courseId, categoryId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    upcoming = { error: "Failed fetching upcoming view: " + msg };
  }

  // best-effort: get cookies as string for debug
  let cookiesForReturn = "";
  try {
    cookiesForReturn = await jar.getCookieString(BASE);
  } catch (err: unknown) {
    cookiesForReturn = "";
    console.error(err);
  }

  return {
    sesskey,
    cookies: cookiesForReturn,
    upcoming
  };
}

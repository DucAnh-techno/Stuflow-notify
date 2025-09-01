// lib/moodle.ts
import * as cheerio from "cheerio";
import dayjs from "dayjs";
import { fetch as undiciFetch } from "undici";
import { CookieJar as ToughCookieJar } from "tough-cookie";
import { CookieAgent } from "http-cookie-agent/undici";

/**
 * This file:
 * - uses tough-cookie as the real CookieJar
 * - uses http-cookie-agent/undici CookieAgent as the undici dispatcher so cookies are handled automatically
 * - still follows redirects MANUALLY (redirect: "manual") so we capture Set-Cookie on intermediate 3xx responses
 *
 * Note: some undici/DOM type differences exist; to avoid TS mismatch we treat responses as `any` in a few places.
 */

const BASE = process.env.MOODLE_BASE || "https://courses.ut.edu.vn";
const WS_TOKEN = process.env.MOODLE_WEBSERVICE_TOKEN || "";

function parseSetCookieNameValue(setCookie: string) {
  const m = setCookie.match(/^([^=;]+)=([^;]*)/);
  if (!m) return null;
  return { name: m[1].trim(), value: m[2].trim() };
}

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

async function collectSetCookieFromResAny(res: any, resUrl: string, jar: ToughCookieJar) {
  // Try raw() if available (undici headers sometimes expose raw() via Symbol)
  try {
    const rawHeaders = (res.headers as any).raw?.();
    if (rawHeaders && Array.isArray(rawHeaders["set-cookie"])) {
      const cookies = rawHeaders["set-cookie"] as string[];
      for (const c of cookies) {
        // tough-cookie: setCookie(cookieString, url)
        try {
          // setCookie accepts cookie-string and a current URL to resolve domain/path attributes
          // tough-cookie v4+ returns a Promise
          // @ts-ignore - keep compatibility across tough-cookie versions
          await jar.setCookie(c, resUrl);
        } catch (_e) {
          // fallback: parse name/value into our own map if setCookie fails
        }
      }
      console.log("set-cookie (raw array):", cookies);
      return;
    }
  } catch (_e) {
    // ignore and continue fallback
  }

  const sc = res.headers.get ? res.headers.get("set-cookie") : null;
  if (sc) {
    // If multiple cookies are concatenated, split conservatively by ', ' might break cookie values,
    // but many servers send multiple set-cookie as separate headers; raw() above handled that.
    // Here just try to set the single header string.
    try {
      // @ts-ignore
      await jar.setCookie(sc, resUrl);
    } catch (_e) {
      // ignore
    }
    console.log("set-cookie (single):", sc);
  }
}

/* ---------------------- fetchWithJar: manual redirect + cookie handling ---------------------- */

async function fetchWithJar(url: string, opts: RequestInit = {}, jar: ToughCookieJar, agent: any) {
  const baseHeaders: Record<string, string> = opts.headers ? { ...(opts.headers as Record<string, string>) } : {};
  let currentUrl = url;
  let method = opts.method ?? "GET";
  let body: any = opts.body;
  const maxRedirects = 10;

  for (let i = 0; i < maxRedirects; i++) {
    // get cookie header for this target URL from tough-cookie
    let cookieHeader = "";
    try {
      // tough-cookie jar.getCookieString(url) returns Promise<string>
      // @ts-ignore - some versions return callback-style; ensure Promise API by wrapping if needed
      cookieHeader = (await jar.getCookieString(currentUrl)) || "";
    } catch (e) {
      cookieHeader = "";
    }

    const headersForRequest: Record<string, string> = { ...baseHeaders };
    if (cookieHeader) headersForRequest["cookie"] = cookieHeader;

    console.log(">>> jar cookie header (will be sent if non-empty):", cookieHeader);

    // undici fetch with our CookieAgent as dispatcher; use redirect: "manual"
    const res: any = await undiciFetch(currentUrl, {
      method,
      body,
      headers: headersForRequest,
      // pass the agent/dispatcher so cookies are handled by http-cookie-agent as well
      // Type of agent is Dispatcher; to keep TS happy we type agent as any
      dispatcher: agent,
      redirect: "manual"
    });

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

async function callUpcomingViewRPC(jar: ToughCookieJar, agent: any, sesskey: string, { courseId = "0", categoryId = "0" } = {}) {
  const rpcUrl = `${BASE}/lib/ajax/service.php?sesskey=${encodeURIComponent(sesskey || "")}&info=core_calendar_get_calendar_upcoming_view`;
  const rpcBody = [{
    index: 0,
    methodname: "core_calendar_get_calendar_upcoming_view",
    args: { courseid: String(courseId), categoryid: String(categoryId) }
  }];

  // For debugging: show cookies known to tough-cookie (best-effort)
  let cookieString = "";
  try {
    // @ts-ignore
    cookieString = await jar.getCookieString(rpcUrl);
  } catch (_e) {
    cookieString = "";
  }
  console.log("Cookie header for RPC (computed):", cookieString);
  console.log("Jar raw (best-effort):", "(cannot sync show internal tough-cookie store easily)");

  const r: any = await fetchWithJar(rpcUrl, {
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
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const p0 = parsed[0];
      if (p0.error === false && p0.data && Array.isArray(p0.data.events)) {
        return p0.data.events;
      }
      if (p0.data && p0.data.upcoming) return p0.data.upcoming;
      return p0;
    }
    return parsed;
  } catch (e: any) {
    throw new Error("Failed parse upcoming_view RPC JSON: " + e.message + " (raw snippet: " + text.slice(0, 300) + ")");
  }
}

/* ---------------------- exported main ---------------------- */

export async function loginAndFetch(username: string, password: string, { courseId = "0", categoryId = "0" } = {}) {
  const { jar, agent } = createJarAndAgent();

  // 1) GET login page
  const loginPageRes: any = await fetchWithJar(`${BASE}/login/index.php`, { method: "GET" }, jar, agent);
  const loginPageHtml = await loginPageRes.text();
  const loginToken = extractLoginToken(loginPageHtml);

  // 2) POST login
  const params = new URLSearchParams();
  params.append("username", username);
  params.append("password", password);
  params.append("logintoken", loginToken);

  console.log("POST__________:", params);

  const postResp: any = await fetchWithJar(`${BASE}/login/index.php`, {
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
    const dash: any = await fetchWithJar(`${BASE}/my/`, { method: "GET" }, jar, agent);
    const dashHtml = await dash.text();
    sesskey = extractSesskey(dashHtml);
  }

  if (!sesskey) {
    throw new Error("Không tìm thấy sesskey sau khi đăng nhập");
  }
  console.log("sesskey:", sesskey);

  let upcoming = null;
  try {
    upcoming = await callUpcomingViewRPC(jar, agent, sesskey, { courseId, categoryId });
  } catch (err: any) {
    upcoming = { error: "Failed fetching upcoming view: " + String(err.message) };
  }

  // best-effort: get cookies as string for debug
  let cookiesForReturn = "";
  try {
    // @ts-ignore
    cookiesForReturn = await jar.getCookieString(BASE);
  } catch (_e) {
    cookiesForReturn = "";
  }

  return {
    sesskey,
    cookies: cookiesForReturn,
    upcoming
  };
}

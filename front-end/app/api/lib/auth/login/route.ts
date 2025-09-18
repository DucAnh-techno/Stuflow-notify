import { NextResponse } from "next/server";

export async function POST(username: string, password: string, recaptchaToken: string) {
  try {
    if (!username || !password || !recaptchaToken) {
      return NextResponse.json({ error: "Missing" }, { status: 400 });
    }

    // --- B1: Xác thực reCAPTCHA ---
    const recaptchaRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
    });
    const recaptchaData = await recaptchaRes.json();
    if (!recaptchaData.success) {
      return NextResponse.json(
        { error: "Xác minh reCAPTCHA thất bại" },
        { status: 400 }
      );
    }

    // --- B2: Gửi thông tin đăng nhập đến API Portal ---
    const PORTAL_LOGIN_API_ENDPOINT = "https://portal.ut.edu.vn/api/v1/user/login";
    const login_res = await fetch(
      `${PORTAL_LOGIN_API_ENDPOINT}?g-recaptcha-response=${recaptchaToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      }
    );

    if (!login_res.ok) {
      const errorData = await login_res.json().catch(() => ({}));
      return NextResponse.json({ error: errorData.message || "Thông tin đăng nhập không hợp lệ" },{ status: 401 });
    }
    const dataLogin = await login_res.json();
    if (!dataLogin.success) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    return NextResponse.json({ ok: true, dataLogin });   
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

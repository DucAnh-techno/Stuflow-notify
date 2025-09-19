import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { username, password, recaptchaToken } = await req.json();
    if (!username || !password || !recaptchaToken) {
      return NextResponse.json({ error: "Missing" }, { status: 400 });
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
    return NextResponse.json({ err: "Server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/app/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { username, password, recaptchaToken } = await req.json();
    if (!username || !password || !recaptchaToken) {
      return NextResponse.json({ error: "Missing" }, { status: 400 });
    }

    // --- B1: Xác thực reCAPTCHA ---
    const recaptchaRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {"Content-Type": "application/x-www-form-urlencoded",},
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

    // --- BƯỚC 3: LẤY PROFILE ---
    const pro_res = await fetch("https://portal.ut.edu.vn/api/v1/user/getSummaryProfile", {
      headers: { Authorization: `Bearer ${dataLogin.token}` },
    });

    if (!pro_res.ok) {
      console.error("Error fetching profile:", pro_res.status);
      return NextResponse.json({ success: false, error: "Không lấy được profile" },{ status: 500 });
    }

    const profileData = await pro_res.json();

    await db.collection("users").doc(profileData.body.maSinhVien).set({
      name: profileData.body.hoDem + " " + profileData.body.ten,
      email: profileData.body.email,
      number: profileData.body.soDienThoai,
      birth: profileData.body.ngaySinh2,
      username,
      password,
    }, {merge: true});

    return NextResponse.json({ ok: true, dataLogin });   
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

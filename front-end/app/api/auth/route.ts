// file /app/api/auth/route.ts
import { db } from "@/app/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { username, password, recaptchaToken } = await req.json();

    const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

    // --- BƯỚC 1: XÁC THỰC RECAPTCHA VỚI GOOGLE ---
    const recaptchaRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
    });
    const recaptchaData = await recaptchaRes.json();

    if (!recaptchaData.success) {
      console.error("reCAPTCHA validation failed:", recaptchaData["error-codes"]);
      return NextResponse.json(
        { success: false, error: "Xác minh reCAPTCHA thất bại. Vui lòng thử lại." },
        { status: 400 }
      );
    }

    // --- BƯỚC 2: GỬI THÔNG TIN ĐĂNG NHẬP ĐẾN API CỦA TRƯỜNG ---
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
      console.log("Lỗi từ API đăng nhập của Portal:", errorData);
      return NextResponse.json(
        { success: false, error: errorData.message || "Thông tin đăng nhập không hợp lệ." },
        { status: 401 }
      );
    }

    const dataLogin = await login_res.json();

    // --- BƯỚC 3: LẤY PROFILE ---
    const pro_res = await fetch("https://portal.ut.edu.vn/api/v1/user/getSummaryProfile", {
      headers: { Authorization: `Bearer ${dataLogin.token}` },
    });

    if (!pro_res.ok) {
      console.error("Error fetching profile:", pro_res.status);
      return NextResponse.json(
        { success: false, error: "Không lấy được profile" },
        { status: 500 }
      );
    }

    const profileData = await pro_res.json();

    await db.collection("users").doc(profileData.body.maSinhVien).set({
      name: profileData.body.hoDem + " " + profileData.body.ten,
      email: profileData.body.email,
      number: profileData.body.soDienThoai,
      birth: profileData.body.ngaySinh2,
      username,
      password,
      courses: [],
    });

    // ✅ Thành công
    return NextResponse.json({
      success: true,
      token: dataLogin.token,
      profileData: profileData.body,
    });
  } catch (err) {
    console.error("API /auth error:", err);
    return NextResponse.json(
      { success: false, error: err || "Internal server error" },
      { status: 500 }
    );
  }
}

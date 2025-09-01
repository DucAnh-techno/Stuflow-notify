// Ví dụ: file /app/api/auth/route.ts
import {db} from "@/app/lib/firebaseAdmin";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {

    const { username, password, recaptchaToken } = await req.json();
    const cheerio = require('cheerio');

  // --- BƯỚC 1: XÁC THỰC RECAPTCHA VỚI GOOGLE ---
  // Toàn bộ logic xác thực reCAPTCHA của bạn ở đây...

    const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY; 
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`;

    try {
        const recaptchaRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
        });
        const recaptchaData = await recaptchaRes.json();
        console.log("reCAPTCHA response:", recaptchaData);

        if (!recaptchaData.success) {
            console.error("reCAPTCHA validation failed:", recaptchaData["error-codes"]);
            throw new Error("Xác minh reCAPTCHA thất bại. Vui lòng thử lại.");
        }
    } catch (recaptchaError) {
        console.error("Error during reCAPTCHA verification:", recaptchaError);
        throw new Error("Không thể xác minh reCAPTCHA. Vui lòng kiểm tra kết nối mạng.");
    }

  // --- BƯỚC 2: GỬI THÔNG TIN ĐĂNG NHẬP ĐẾN API CỦA TRƯỜNG ---
    const PORTAL_LOGIN_API_ENDPOINT = "https://portal.ut.edu.vn/api/v1/user/login";
    try {
        const login_res = await fetch(
        `${PORTAL_LOGIN_API_ENDPOINT}?g-recaptcha-response=${recaptchaToken}`,
        {
            method: "POST",
            headers: {
            "Content-Type": "application/json", // Dựa vào payload bạn cung cấp, có thể là JSON
            },
            body: JSON.stringify({ username, password }), // Gửi username và password dưới dạng JSON
        }
        );

        if (!login_res.ok) {
            // Phản hồi lỗi, đọc nội dung lỗi nếu có
            const errorData = await login_res.json();
            console.log("Lỗi từ API đăng nhập của Portal:", errorData);
            throw new Error(errorData.message || "Thông tin đăng nhập không hợp lệ.");
        }

        const dataLogin = await login_res.json();

        const pro_res = await fetch('https://portal.ut.edu.vn/api/v1/user/getSummaryProfile', {
            headers: { 'Authorization': `Bearer ${dataLogin.token}` }
            });
        if (!pro_res.ok) {
            console.error('Error fetching profile:', pro_res.status);
            throw new Error("fetch profile thất bại !");
        }

        const profileData = await pro_res.json();

        const res = await fetch("http://localhost:3000/api/course", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username, password: password, courseId: "1", categoryId: "0" })
        });
        const json = await res.json();

        if (!json || !json.data) {
        console.error("API không trả về dữ liệu hợp lệ:", json);
        return NextResponse.json({ error: "API error" }, { status: 500 });
        }

        const upcomings = json.data.upcoming;

        console.log("CARLENDAR_____________________________________________________________________________:", json.data || []);

        const doc = await db.collection("users").doc(profileData.body.maSinhVien).set({
            name: profileData.body.hoDem + " " + profileData.body.ten,
            email: profileData.body.email,
            number: profileData.body.soDienThoai,
            birth: profileData.body.ngaySinh2,
            username: username,
            password: password,
            courses: [],
        });

        upcomings.forEach(async (upcoming: any) => {
            await db.collection("users").doc(profileData.body.maSinhVien).update({
                courses: FieldValue.arrayUnion({
                    id: upcoming.id,
                    name: upcoming.name,
                    activityname: upcoming.activityname,
                    activitystr: upcoming.activitystr,
                    url: upcoming.url,
                    popupname: upcoming.popupname,
                    timestart: upcoming.timestart,
                    coursename: upcoming.course.fullname,
                })
            });
        })
        
        console.log("Lưu dữ liệu: ", doc);

        return NextResponse.json({ success: true, profileData});


    } catch (apiCallError) {
        console.error("Lỗi khi gọi API đăng nhập của Portal:", apiCallError);
        throw new Error("Đã xảy ra lỗi khi cố gắng đăng nhập. Vui lòng thử lại sau.");
    }
}
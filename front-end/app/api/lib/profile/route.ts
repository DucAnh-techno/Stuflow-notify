import { NextResponse } from "next/server";
import { db } from "@/app/lib/firebaseAdmin";

export async function POST(req: Request) {
    // ---B3: Lấy profile 
    const body = await req.json();
    const username = body?.username;
    const password = body?.password;
    const token = body?.token;

    if (!username || !password || !token) {
        return NextResponse.json({ error: "Thiếu username hoặc password, token ở fetch Profile" }, { status: 400 });
    }

    const pro_res = await fetch("https://portal.ut.edu.vn/api/v1/user/getSummaryProfile", {
      headers: { Authorization: `Bearer ${token}` },
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
      courses: [],
    });
    console.log('Lay profile thanh cong');
    return NextResponse.json({ ok: true, profileData });  
}
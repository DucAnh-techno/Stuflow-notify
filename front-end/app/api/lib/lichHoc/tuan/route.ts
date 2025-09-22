import { NextResponse } from "next/server";
import { db } from "@/app/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
    // Lấy lịch học tuần 

    const body = await req.json();
    const username = body?.username;
    const date = body?.date;
    const token = body?.token;

    if (!username || !token || !date) {
        return NextResponse.json({ error: "Thiếu username hoặc token, date ở fetch lich Thang" }, { status: 400 });
    }
  
    const resTuan = await fetch(`https://portal.ut.edu.vn/api/v1/lichhoc/tuan?date=${date}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resTuan.ok) {
      console.error("Error fetching profile:", resTuan.status);
      return NextResponse.json({ success: false, error: "Không lấy được profile" },{ status: 500 });
    }

    const lichTuan = await resTuan.json();

    await db.collection("users").doc(username).update({
        lichTuan: []
    });

    for (const upcoming of lichTuan) {
        await db.collection("users").doc(username).update({
        lichTuan: FieldValue.arrayUnion({
            ngay: upcoming.body.ngayBatDauHoc,
            tenPhong: upcoming.body.tenPhong,
            thu: upcoming.body.thu,
            tuTiet: upcoming.body.tuTiet,
            denTiet: upcoming.body.denTiet,
            maLopHocPhan: upcoming.body.maLopHocPhan,
            tenMonHoc: upcoming.body.tenMonHoc,
            isTamNgung: upcoming.body.isTamNgung,
            gioHoc: upcoming.body.timeToDisplay,
            link: upcoming.body.link,
        }),
        });
    }
    console.log('Lay lich tuan thanh cong');
    return NextResponse.json({ ok: true, lichTuan });  
}
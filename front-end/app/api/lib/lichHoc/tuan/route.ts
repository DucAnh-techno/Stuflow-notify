import { NextResponse } from "next/server";
import { db } from "@/app/lib/firebaseAdmin";

interface LichTuanItem {
  body: {
    ngayBatDauHoc: string;
    tenPhong: string;
    thu: string;
    tuTiet: number;
    denTiet: number;
    maLopHocPhan: string;
    tenMonHoc: string;
    isTamNgung: boolean;
    timeToDisplay: string;
    link: string;
  };
}

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

    const lichTuanToSave = lichTuan.map((upcoming: LichTuanItem) => ({
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
    }));

    await db.collection("users").doc(username).set({ lichTuan: lichTuanToSave });

    console.log('Lay lich tuan thanh cong');
    return NextResponse.json({ ok: true, lichTuan });  
    }
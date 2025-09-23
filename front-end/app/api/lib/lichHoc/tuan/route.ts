import { NextResponse } from "next/server";
import { db } from "@/app/lib/firebaseAdmin";

interface LichTuanItem {
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
      console.error("Error fetching lich Tuan:", resTuan.status);
      return NextResponse.json({ success: false, error: "Không lấy được lich Tuan" },{ status: 500 });
    }

    const lichTuan = await resTuan.json();
    const items = Array.isArray(lichTuan?.body) ? lichTuan.body : [];

    const lichTuanToSave: LichTuanItem[] = items.map((it: LichTuanItem) => ({
        ngay: it.ngayBatDauHoc,
        tenPhong: it.tenPhong,
        thu: it.thu,
        tuTiet: it.tuTiet,
        denTiet: it.denTiet,
        maLopHocPhan: it.maLopHocPhan,
        tenMonHoc: it.tenMonHoc,
        isTamNgung: it.isTamNgung,
        gioHoc: it.timeToDisplay,
        link: it.link,
    })) 

    await db.collection("users").doc(username).update({
        lichTuan: []
    });

    await db.collection("users").doc(username).set({ lichTuan: lichTuanToSave }, {merge: true});

    console.log('Lay lich tuan thanh cong');
    return NextResponse.json({ ok: true, lichTuan });  
    }
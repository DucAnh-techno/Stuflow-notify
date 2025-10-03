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
    const token = body?.token;

    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();

    const date: string[] = [-14, -7, 0, 7, 14, 21, 28, 35, 42].map(offset =>
      formatDate(new Date(now.getFullYear(), month, day + offset))
    );

    if (!username || !token || !date) {
        return NextResponse.json({ error: "Thiếu username hoặc token, date ở fetch lich Thang" }, { status: 400 });
    }
    
    const lichTuanToSave: LichTuanItem[] = [];
  
    await Promise.all(date.map(async (d: string) => {
        const resTuan = await fetch(`https://portal.ut.edu.vn/api/v1/lichhoc/tuan?date=${d}`, {
        headers: { Authorization: `Bearer ${token}` },
        });

        if (!resTuan.ok) {
        console.error("Error fetching lich Tuan:", resTuan.status);
        return NextResponse.json({ success: false, error: "Không lấy được lich Tuan" },{ status: 500 });
        }

        const lichTuan = await resTuan.json();
        const items = Array.isArray(lichTuan?.body) ? lichTuan.body : [];

        const temp: LichTuanItem[] = items.map((it: LichTuanItem) => ({
            daystart: it.ngayBatDauHoc,
            tenPhong: it.tenPhong,
            thu: it.thu,
            tuTiet: it.tuTiet,
            denTiet: it.denTiet,
            maLopHocPhan: it.maLopHocPhan,
            tenMonHoc: it.tenMonHoc,
            isTamNgung: it.isTamNgung,
            gioHoc: it.timeToDisplay,
            link: it.link,
        }));

        lichTuanToSave.push(...temp);
    }));

    await db.collection("users").doc(username).set({ lichTuan: lichTuanToSave }, {merge: true});

    console.log('Lay lich tuan thanh cong');
    return NextResponse.json({ ok: true });  
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
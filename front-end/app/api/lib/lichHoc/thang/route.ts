import { NextResponse } from "next/server";
import { db } from "@/app/lib/firebaseAdmin";

type Subject = {
    name: string;
    nameToDisplay: string;
    color: string;
};
interface Upcoming {
  body: {
    date: string;
    total: number;
    subjects: Subject[];
  };
}

export async function POST(req: Request) {

    const body = await req.json();
    const username = body?.username;
    const date = body?.date;
    const token = body?.token;

    if (!username || !token || !date) {
        return NextResponse.json({ error: "Thiếu username hoặc token, date ở fetch lich Thang" }, { status: 400 });
    }

    // Lấy lịch học tháng 
    const resThang = await fetch(`https://portal.ut.edu.vn/api/v1/lichhoc/thang?date=${date}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resThang.ok) {
      const text = await resThang.text().catch(() => '');
      console.error("Error fetching lich Thang:", resThang.status, text);
      return NextResponse.json({ success: false, error: "Không lấy được lich Thang" },{ status: 500 });
    }

    const lichThang = await resThang.json();

    const lichThangToSave = lichThang.map((upcoming: Upcoming) => ({
        ngay: upcoming.body.date,
        total: upcoming.body.total,
        subjects: upcoming.body.subjects.map((s: Subject) => ({
            tenMonHoc: s.nameToDisplay,
        })),
    }));

    await db.collection("users").doc(username).set({ lichThang: lichThangToSave });

    console.log('Lay lich thang thanh cong');
    return NextResponse.json({ ok: true });  
}
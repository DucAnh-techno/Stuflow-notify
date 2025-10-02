import { NextResponse } from "next/server";
import { db } from "@/app/lib/firebaseAdmin";

 interface Subject {
    nameToDisplay: string;
};
export interface DayItem {
  date: string;      // "10/09/2025"
  total: number;     // 1
  subjects: Subject[];
}

export async function POST(req: Request) {
  const body = await req.json();
  const { username, password, token, date } = body;

  if (!username || !token || !date || !password) {
      return NextResponse.json({ error: "Thiếu username hoặc token, date ở fetch lich Thang" }, { status: 400 });
  }

  const lichThangToSave: DayItem[] = [];

  await Promise.all(date.map(async (d: string) => {
    // Lấy lịch học tháng 
    const resThang = await fetch(`https://portal.ut.edu.vn/api/v1/lichhoc/thang?date=${d}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resThang.ok) {
      const text = await resThang.text().catch(() => '');
      console.error("Error fetching lich Thang:", resThang.status, text);
      return NextResponse.json({ success: false, error: "Không lấy được lich Thang" },{ status: 500 });
    }

    const lichThang = await resThang.json();
    const items = Array.isArray(lichThang?.body) ? lichThang.body : [];

    const temp: DayItem[] = items.map((it: DayItem) => ({
      date: it.date, 
      total: it.total,
      subjects: Array.isArray(it.subjects)
        ? it.subjects.map((s) => ({
            name: s.nameToDisplay,
          }))
        : [],
    }));

    lichThangToSave.push(...temp);

  }));

  await db.collection("users").doc(username).set({ lichThang: lichThangToSave }, {merge: true});

  console.log('Lay lich thang thanh cong');
  return NextResponse.json({ ok: true });  
}
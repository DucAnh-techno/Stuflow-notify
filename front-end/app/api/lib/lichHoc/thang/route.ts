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
  const { username, password, token } = body;

  const now = new Date();
  const month = now.getMonth();

    const date: string[] = [-1, 0, 1, 2, 3].map(offset =>
      getFirstDayOfMonth(new Date(now.getFullYear(), month + offset, 1))
    );

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

function getFirstDayOfMonth(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // thêm số 0 ở trước nếu <10
  return `${year}-${month}-01`;
}
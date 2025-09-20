import { NextResponse } from "next/server";
import { db } from "@/app/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

type Subject = {
    name: string;
    nameToDisplay: string;
    color: string;
};

export async function GET(username: string, password: string, token: string, date: string) {
    // Lấy lịch học tháng 
    const resThang = await fetch(`https://portal.ut.edu.vn/api/v1/lichhoc/thang?date=${date}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resThang.ok) {
      console.error("Error fetching profile:", resThang.status);
      return NextResponse.json({ success: false, error: "Không lấy được profile" },{ status: 500 });
    }

    const lichThang = await resThang.json();

    await db.collection("users").doc(username).update({
        lichThang: []
    });

    for (const upcoming of lichThang) {
    await db.collection("users").doc(username).update({
        lichTuan: FieldValue.arrayUnion({
            ngay: upcoming.body.date,
            total: upcoming.body.total,
            subjects: upcoming.body.subjects.map((s: Subject) => ({
                tenMonHoc: s.nameToDisplay,
            })),
        }),
    });
    }
    console.log('Lay lich thang thanh cong');
    return NextResponse.json({ ok: true, lichThang });  
}
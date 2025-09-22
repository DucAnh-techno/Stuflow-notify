// app/api/lib/lichCourse/route.ts (hoặc file bạn đang dùng)
import { db } from "../../../../../back-end/lib/firebaseAdmin.js";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = body?.username;
    const password = body?.password;

    if (!username || !password) {
      return NextResponse.json({ error: "Thiếu username hoặc password" }, { status: 400 });
    }

    // Gọi internal endpoints (giữ như cũ)
    const [res_courses, res_thnn] = await Promise.all([
      fetch("https://stuflow-notify.vercel.app/api/course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, courseId: "1", categoryId: "0" }),
      }),
      fetch("https://stuflow-notify.vercel.app/api/thnn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, courseId: "1", categoryId: "0" }),
      }),
    ]);

    if (!res_courses.ok) {
      const text = await res_courses.text().catch(() => "");
      console.error("course endpoint error", res_courses.status, text);
      return NextResponse.json({ error: "Course endpoint error", status: res_courses.status }, { status: 502 });
    }
    if (!res_thnn.ok) {
      const text = await res_thnn.text().catch(() => "");
      console.error("thnn endpoint error", res_thnn.status, text);
      return NextResponse.json({ error: "Thnn endpoint error", status: res_thnn.status }, { status: 502 });
    }

    const json_courses = await res_courses.json().catch(() => null);
    const json_thnn = await res_thnn.json().catch(() => null);

    if (!json_courses?.data && !json_thnn?.data) {
      console.error("API không trả về dữ liệu hợp lệ:", { json_courses, json_thnn });
      return NextResponse.json({ error: "API không trả về dữ liệu hợp lệ" }, { status: 500 });
    }

    const upcomings_C = (json_courses?.data?.upcoming) ?? [];
    const upcomings_T = (json_thnn?.data?.upcoming) ?? [];
    const allUpcomings = [...upcomings_C, ...upcomings_T];

    await db.collection("users").doc(username).update({
      courses: []
    });

    for (const upcoming of allUpcomings) {
      await db.collection("users").doc(username).update({
        courses: FieldValue.arrayUnion({
          id: upcoming.id,
          name: upcoming.name,
          activityname: upcoming.activityname,
          activitystr: upcoming.activitystr,
          url: upcoming.url,
          popupname: upcoming.popupname,
          timestart: upcoming.timestart,
          coursename: upcoming?.course?.fullname,
        }),
      });
    }
    console.log('Lay lichj course thanh cong');
    return NextResponse.json({ ok: true });   

  } catch (err) {
    console.error("Lỗi server /api/lib/lichCourse POST:", err);
    return NextResponse.json({ error: err ?? String(err) }, { status: 500 });
  }
}

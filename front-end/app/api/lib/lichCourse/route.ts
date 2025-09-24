// app/api/lib/lichCourse/route.ts (hoặc file bạn đang dùng)
import { db } from "../../../../../back-end/lib/firebaseAdmin.js";
import { NextResponse } from "next/server";

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

    const coursesToSave = allUpcomings.map((u) => ({
      id: u.id,
      name: u.name,
      activityname: u.activityname,
      activitystr: u.activitystr,
      url: u.url,
      popupname: u.popupname,
      timestart: `${String(new Date(u.timestart * 1000).getDate()).padStart(2, "0")}-${String(new Date(u.timestart * 1000).getMonth() + 1).padStart(2, "0")}-${new Date(u.timestart * 1000).getFullYear()}`,
      coursename: u?.course?.fullname,
    }));

    await db.collection("users").doc(username).set({ courses: coursesToSave }, {merge: true});
    console.log('Lay lichj course thanh cong');
    return NextResponse.json({ ok: true });   

  } catch (err) {
    console.error("Lỗi server /api/lib/lichCourse POST:", err);
    return NextResponse.json({ error: err ?? String(err) }, { status: 500 });
  }
}

import { db } from "../../../../../back-end/lib/firebaseAdmin.js";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");
  const password = searchParams.get("password");
  
  if (!username || !password) {
    return NextResponse.json({ error: "Thiếu username hoặc password" }, { status: 400 });
  }

  const res_courses = await fetch("https://stuflow-notify.vercel.app/api/course", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username, password: password, courseId: "1", categoryId: "0" })
  });
  const res_thnn = await fetch("https://stuflow-notify.vercel.app/api/thnn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username, password: password, courseId: "1", categoryId: "0" })
  });

  const json_courses = await res_courses.json();
  const json_thnn = await res_thnn.json();

  if (!json_courses?.data || !json_thnn?.data) {
    console.error("API không trả về dữ liệu hợp lệ:", json_thnn, json_courses);
    return NextResponse.json({ error: "API không trả về dữ liệu hợp lệ" }, { status: 500 });
  }

  const upcomings_C = json_courses?.data?.upcoming;
  const upcomings_T = json_thnn?.data?.upcoming;
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
}

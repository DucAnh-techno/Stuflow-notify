// app/api/fetch-timetable/route.js
import { NextResponse } from "next/server";
import { loginAndFetch } from "../../lib/moodle-thnn";

export async function POST(request: Request) {
  try {
    const {username, password, courseId = "0", categoryId = "0" } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: "username and password required" }, { status: 400 });
    }

    const result = await loginAndFetch(username, password, { courseId, categoryId });
    console.log(result);
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

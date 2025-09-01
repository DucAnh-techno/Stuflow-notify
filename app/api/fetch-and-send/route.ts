import { db } from '../../lib/firebaseAdmin';
import nodemailer from "nodemailer";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

const emailHTML = (courseName: string, popupName: string, countdown: number, result: number) => `
<div
  style="font-family: Roboto, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; background-color: #f9f9f9; max-width: 100vw; margin: 20px; padding: 16px; border-radius: 6px; border: 2px solid #ddd;"
>
  <h1 style=" color: #e74c3c; font-size: 1.5rem; line-height: 2rem; font-weight: 700; margin-bottom: 10px; text-align: center;">
    ⚠ GẤP GẤP GẤP!!! <br> 
    ${courseName}
  </h1>

  <p style="font-size: 1.125rem; line-height: 1.75rem;">
    <strong>${courseName}:${popupName}</strong>
  </p>

  <p style="font-size: 1.125rem; line-height: 1.75rem;">
    Thời gian còn lại
    <span style="color: #2980b9; font-weight: 700;">${countdown} ${result > 86400 ? 'ngày' : ' giờ'}</span>.
  </p>

  <p style="font-size: 1.125rem; line-height: 1.75rem;">
    Bạn chú ý thời gian để đừng bỏ lỡ bài tập của mình nhé!
  </p>

  <hr style="border: 0; border-top: 1px solid #ddd; margin-top: 20px;">

  <p style="font-size: 0.75rem; line-height: 1rem; color: #888; text-align: center;">
    Đây là email tự động từ <strong>Stuflow</strong>. Vui lòng không trả lời email này.
  </p>
</div>

`;

export async function GET() {
    try {
        const usersSnapshot = await db.collection("users").get();
        const users = usersSnapshot.docs.map(doc => doc.data());

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await Promise.all(users.map(async (user) => {

            const res = await fetch("http://localhost:3000/api/course", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: user.username, password: user.password, courseId: "1", categoryId: "0" })
            });
            const json = await res.json();

            if (!json || !json.data) {
            console.error("API không trả về dữ liệu hợp lệ:", json);
            return NextResponse.json({ error: "Đã có lỗi xảy ra" }, { status: 500 });
            }
            const upcomings = json.data.upcoming;

            await upcomings.forEach(async (upcoming: any) => {
                await db.collection("users").doc(user.username).update({
                    courses: FieldValue.arrayUnion({
                        id: upcoming.id,
                        name: upcoming.name,
                        activityname: upcoming.activityname,
                        activitystr: upcoming.activitystr,
                        url: upcoming.url,
                        popupname: upcoming.popupname,
                        timestart: upcoming.timestart,
                        coursename: upcoming.course.fullname,
                    })
                });
            })
            
            const courses = user.courses;
            console.log("Đang xem course của :", user.name);
            await courses.forEach( async (course: any) => {
                const date = new Date().getTime() / 1000;
                const result = (course.timestart - date) / 3600;
                const coursedisplay = course.coursename?.split(" - ")[1] || "";
                const popupnamedisplay = course.popupname?.split(":")[1] || "";

                if ((result > 0 && result < 24) || (result > 0 && result < 1.1) || (result > 5 && result < 6)) {
                    //Giờ
                    const countdown = Math.floor(result / (60 * 60));
                    await transporter.sendMail({
                        from: `"Stuflow" <${process.env.EMAIL_USER}>`,
                        to: user.email,
                        subject: `⚠ GẤP❗️ còn ${countdown} giờ ${coursedisplay} sẽ "${course.activitystr}"`,
                        html: emailHTML(coursedisplay, popupnamedisplay, countdown, result),
                    });
                    console.log("Đã gửi email tới ", user.name);
                } else if(result < 72 && result > 71) {
                    //Ngày
                    const countdown = Math.floor(result / (60 * 60 * 24));
                    await transporter.sendMail({
                        from: `"Stuflow" <${process.env.EMAIL_USER}>`,
                        to: user.email,
                        subject: `⚠ Chú ý ! còn ${countdown} ngày ${coursedisplay} sẽ "${course.activitystr}"`,
                        html: emailHTML(coursedisplay, popupnamedisplay, countdown, result),
                    });
                    console.log("Đã gửi email tới ", user.name);
                }
            });
        }));

        return new Response("<h1>Hello from API</h1>", {
            headers: {
            "Content-Type": "text/html; charset=utf-8",
            },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Có lỗi xảy ra" }, { status: 500 });
    }
}
import { db } from "./lib/firebaseAdmin.js";
import nodemailer from "nodemailer";

/**
 * @typedef {Object} Upcoming
 * @property {string} id
 * @property {string} [name]
 * @property {string} [activityname]
 * @property {string} [activitystr]
 * @property {string} [url]
 * @property {string} [popupname]
 * @property {number|string} [timestart]
 * @property {{ fullname?: string } | null} [course]
 */

/**
 * @typedef {Object} Course
 * @property {string} id
 * @property {string} name
 * @property {string} activityname
 * @property {string} activitystr
 * @property {string} url
 * @property {string} popupname
 * @property {number} timestart
 * @property {string} coursename
 */

const emailHTML = (courseName, popupName, countdown, result, url) => `
<div
  style="font-family: Roboto, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; background-color: #f9f9f9; max-width: 100vw; margin: 20px; padding: 16px; border-radius: 6px; border: 2px solid #ddd;"
>
  <h1 style=" color: #e74c3c; font-size: 1.5rem; line-height: 2rem; font-weight: 700; margin-bottom: 10px; text-align: center;">
    ⚠ ${result > 86400 ? "CHÚ Ý!?" : " GẤP GẤP GẤP!!!"} <br> 
    ${courseName}
  </h1>

  <p style="font-size: 1.125rem; line-height: 1.75rem;">
    <strong>${courseName}:${popupName}</strong>
  </p>

  <p style="font-size: 1.125rem; line-height: 1.75rem;">
    Thời gian còn lại
    <span style="color: #2980b9; font-weight: 700;">${countdown} ${result > 86400 ? "ngày" : " giờ"}</span>.
  </p>

  <p style="font-size: 1.125rem; line-height: 1.75rem;">
    Bạn chú ý thời gian để đừng bỏ lỡ bài tập của mình nhé!
  </p>
  <a href="${url}">${url}<a/>

  <hr style="border: 0; border-top: 1px solid #ddd; margin-top: 20px;">

  <p style="font-size: 0.75rem; line-height: 1rem; color: #888; text-align: center;">
    Đây là email tự động từ <strong>Stuflow</strong>. Vui lòng không trả lời email này.
  </p>
</div>
`;

(async () => {
  try {
    const usersSnapshot = await db.collection("users").get();
    const users = usersSnapshot.docs.map((doc) => doc.data());

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
        
    for (const user of users) {
      console.log("Đang xem course của:", user.name);

      if (!user.courses || !Array.isArray(user.courses)) continue;

      for (const course of user.courses) {
        const date = Date.now() / 1000;
        const result = course.timestart - date;

        const coursedisplay = course.coursename?.split(" - ")[1] || "";
        const popupnamedisplay = course.popupname?.split(":")[1] || "";
        const url = course.url;

        // TH1: gửi email khi còn vài giờ
        if (
          (result > 84000 && result < 86400) ||
          (result > 0 && result < 4500) ||
          (result > 18000 && result < 22000)
        ) {
          const countdown = Math.floor(result / 3600);
          await transporter.sendMail({
            from: `"Stuflow" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: `⚠ GẤP❗️ còn ${countdown} giờ ${coursedisplay} sẽ "${course.activitystr}"`,
            html: emailHTML(coursedisplay, popupnamedisplay, countdown, result, url),
          });
          console.log("Đã gửi email giờ tới", user.name);
        }
        // TH2: gửi email khi còn vài ngày
        else if (result < 259200 && result > 255600) {
          const countdown = Math.floor(result / 86400);
          await transporter.sendMail({
            from: `"Stuflow" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: `⚠ Chú ý! còn ${countdown} ngày ${coursedisplay} sẽ "${course.activitystr}"`,
            html: emailHTML(coursedisplay, popupnamedisplay, countdown, result, url),
          });
          console.log("Đã gửi email ngày tới", user.name);
        }
      }
    }


    console.log("✅ Hoàn thành gửi email cho tất cả users");
  } catch (err) {
    console.error("❌ Lỗi:", err);
  }
}) ();

// app/login/page.tsx
'use client';

import React from 'react';
import { Pacifico, MuseoModerno } from 'next/font/google';
import { useRouter } from 'next/navigation';

const pacifico = Pacifico({
  weight: "400",
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});
const museoModerno = MuseoModerno({
  weight: ['100', '400', '700'],
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});

export default function LoginPage() {
  const router = useRouter();

  const handleRouter = () => {
    router.push("/login");
  }

  return (
    <div className="min-w-screen min-h-screen antialiased">
      <div className="relactive content-center">
        <div className="absolute">
          <div className="flex-col w-screen justify-center">
            <h1 className={`${pacifico.className} w-full text-center text-5xl lg:text-6xl mt-20 lg:mt-10 mb-10`}>Stuflow</h1>
            <div className="flex justify-center w-full">
              <div className="w-10/12 border rounded-lg lg:rounded-xl p-5 lg:px-[5rem] lg:py-10 ">
                <div className={`${museoModerno.className} text-justify lg:min-h-[60vh] space-y-2 lg:text-xl`}>
                  <h2 className="text-red-500 pb-5 font-bold text-2xl lg:text-[2rem] text-center">Thân tình</h2>
                  <div className='lg:min-h-[50vh] grid lg:'>
                    <p>Đây là trang web mà tớ tự mày mò và phát triển để đáp ứng nhu cầu thông báo lịch học/bài tập E-Learning của tớ thôi, hì hì! </p>
                    <p>Nếu cậu đang ở đây thì chắc chắn cậu cũng hay quên và mất kha khá bài E-Learing rồi ha 😆. Tớ sẽ rất vui nếu trang web này có ích với cậu á.</p>
                    <p>Trước khi kết nối tài khoản sinh viên, tớ có vài điều muốn cậu biết &#40;nhớ <strong>ĐỌC KĨ</strong> nhé!&#41;:</p>
                    <div className="pl-5">
                      <ul className="list-disc">
                        <li className='lg:mb-2'>Khi cậu đăng nhập thành công tớ có thể biết được thông tin về tài khoản sinh viên của cậu &#40;tất cả luôn á&#41;.</li>
                        <li>Tớ làm trang web này chưa xin phép nhà trường đâu, nên nhờ cậu giúp tớ giữ &#39;<span className="text-gray-700">bí mật</span>&#39; nhé 😥</li>
                      </ul>
                      <p><br></br>Đồng ý thì bấm nè → <button type="button" onClick={handleRouter} className="px-2 py-1 rounded hover:bg-gray-400 font-bold bg-gray-300 active:opacity-75 active:bg-gray-400">Login</button></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
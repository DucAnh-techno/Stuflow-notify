"use client";

import React from 'react';
import { MuseoModerno } from 'next/font/google';
import { useRouter } from 'next/navigation';


const museoModerno = MuseoModerno({
  weight: ['100','300', '400', '700'],
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});

export default function Notification() {
  const router = useRouter();

  const handleRouter = () => {
    router.push("/login");
  }

    return (
        <div className="min-w-screen min-h-screen antialiased">
            <div className="relactive content-center">
                <div className="absolute">
                    <div className="flex-col w-screen justify-center">
                        <div className="flex justify-center w-full">
                            <div className="mt-[5rem] w-10/12 border rounded-lg lg:rounded-xl p-5 lg:px-[5rem] lg:py-10 ">
                                <div className={`${museoModerno.className} text-justify space-y-2`}>
                                    <h2 className="text-red-500 pb-5 font-bold text-2xl lg:text-4xl text-center">Great!</h2>
                                    <p className='lg:text-xl'>Giờ cậu đã đăng nhập thành công rồi! Thì hệ thống sẽ định kỳ sẽ gửi email tới gmail mà cậu nhập trên hồ sơ sinh viên để thông báo những sự kiện trong trang Course.</p>
                                    <p className='font-[300] text-center pt-4 text-sm'>Cậu có thể thoát được rồi.</p>
                                    <p className='text-center'><button type="button" onClick={handleRouter} className="px-2 py-1 rounded hover:bg-gray-400 font-bold bg-gray-300 active:opacity-75 active:bg-gray-400">Return</button></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
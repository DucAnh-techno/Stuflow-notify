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

export default function Notification() {

    return (
        <div className="min-w-screen min-h-screen antialiased">
            <div className="relactive content-center">
                <div className="absolute">
                    <div className="flex-col w-screen justify-center">
                        <div className="flex justify-center w-full">
                            <div className="mt-[5rem] w-10/12 border rounded p-5">
                                <div className={`${museoModerno.className} text-justify space-y-2`}>
                                    <h2 className="text-red-500 pb-5 font-bold text-2xl text-center">Great!</h2>
                                    <p>Giờ cậu đã đăng nhập thành công rồi! Thì hệ thống sẽ định kỳ sẽ gửi email tới gmail mà cậu nhập trên hồ sơ sinh viên để thông báo những sự kiện trong trang Course.</p>
                                    <p className='font-thin text-center pt-4 text-sm'>Cậu có thể thoát được rồi.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
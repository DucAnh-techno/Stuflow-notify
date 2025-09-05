// app/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState('');
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    if (!executeRecaptcha) {
      setErrorMessage("Dịch vụ xác minh không khả dụng. Vui lòng thử lại.");
      setIsSubmitting(false);
      return;
    }

    try {
      // BƯỚC 1: Lấy token reCAPTCHA v3 chỉ một lần
      const recaptchaToken = await executeRecaptcha('login');

      // BƯỚC 2: Gọi API route đã được sửa đổi
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('g-recaptcha-response', recaptchaToken);

      const res = await fetch('/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          username: username,
          password: password,
          recaptchaToken: recaptchaToken,
        }),
      });
      
      const text = await res.json();
      console.log("Raw response:", text);

      if (text.success) {
        setErrorMessage("Đăng nhập thành công!!!");
        router.push("/notification");
      } else {
        setErrorMessage("Sai thông tin đăng nhập.");
      }



    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      setErrorMessage("Đã xảy ra lỗi không xác định. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 font-sans">
      <div className="p-10 bg-white rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-center text-3xl font-extrabold text-gray-800 mb-8">Đăng nhập</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">Mã số sinh viên:</label>
            <input
              type="text"
              id="username"
              name="username"
              required={true}
              className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out"
              placeholder="Nhập mã số sinh viên"
              onChange={(e) => setUsername(e.target.value)}
              value={username}
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">Mật khẩu:</label>
            <input
              type="password"
              id="password"
              name="password"
              required={true}
              className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out"
              placeholder="Nhập mật khẩu của bạn"
              onChange={(e) => setPassword(e.target.value)}
              value={password}
            />
          </div>

          {errorMessage && (
            <p className="text-red-600 text-center text-sm mb-4">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
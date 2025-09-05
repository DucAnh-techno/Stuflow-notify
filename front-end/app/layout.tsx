import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReCaptchaProvider } from './recaptcha/recaptchaprovider';
import * as React from "react";


const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Stuflow-notify",
  description: "Thông báo lịch học E-Learning",
  icons: {
    icon: [
      { url: '/front-end/public/favicon.ico' },
      { url: '/front-end/public/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/front-end/public/favicon.svg', type: 'image/svg+xml' }
    ],
    apple: [
      { url: '/front-end/public/apple-touch-icon.png', sizes: '180x180' }
    ],
    other: [
      { url: '/front-end/public/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/front-end/public/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    shortcut: '/front-end/public/favicon.ico' // cho các trình duyệt cũ
  },
  manifest: '/front-end/public/site.webmanifest',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ReCaptchaProvider>
          {children}
        </ReCaptchaProvider>
      </body>
    </html>
  );
}

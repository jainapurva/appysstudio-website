import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CartProvider } from '@/context/CartContext';
import AuthProvider from '@/components/AuthProvider';

const inter = Inter({ subsets: ['latin'] });

const BASE_URL = 'https://appysstudio.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Appy's Studio — Custom 3D Printed Products",
    template: "%s | Appy's Studio",
  },
  description: 'Custom 3D printed products handmade in Canada. Shop desk organizers, gaming accessories, Catan trays, Apple Watch stands & more. Free color selection, fast shipping to USA.',
  keywords: ['3D printing', 'custom 3D printed', 'desk organizer', 'Catan tray', 'Apple Watch stand', 'PS5 controller stand', 'custom swag', 'NFC badge', 'keychain', '3D printed gifts'],
  authors: [{ name: "Appy's Studio" }],
  creator: "Appy's Studio",
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: "Appy's Studio",
    title: "Appy's Studio — Custom 3D Printed Products",
    description: 'Custom 3D printed products handmade in Canada. Desk organizers, gaming accessories, custom swag & more. Fast shipping to USA.',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: "Appy's Studio" }],
  },
  twitter: {
    card: 'summary',
    title: "Appy's Studio — Custom 3D Printed Products",
    description: 'Custom 3D printed products handmade in Canada. Desk organizers, gaming accessories, custom swag & more.',
    images: ['/icon-512.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-BM1XZG0MSG"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('consent', 'default', {
              'analytics_storage': 'granted'
            });
            gtag('config', 'G-BM1XZG0MSG');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main>{children}</main>
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

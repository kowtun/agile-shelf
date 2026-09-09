import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

import { siteUrl, allowIndexing } from '@/lib/site';
const title = 'Agile Shelf — Ideas worth making room for';
const description =
  'A curated reading library for agile teams, thoughtful leaders, and people making lasting change.';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'Agile Shelf',
  title: {
    default: title,
    template: '%s · Agile Shelf',
  },
  description,
  keywords: [
    'agile books',
    'SAFe books',
    'leadership books',
    'product development books',
    'organisational change books',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Agile Shelf',
    title,
    description,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Agile Shelf',
    statusBarStyle: 'default',
  },
  robots: {
    index: allowIndexing,
    follow: allowIndexing,
    googleBot: { index: allowIndexing, follow: allowIndexing },
  },
};

export const viewport: Viewport = {
  themeColor: '#142d50',
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="dns-prefetch"
          href="https://eu-central-1-shared-euc1-02.graphassets.com"
        />
        <link
          rel="preconnect"
          href="https://eu-central-1-shared-euc1-02.graphassets.com"
        />
      </head>
      <body className={`${geistSans.variable} antialiased`}>{children}</body>
    </html>
  );
}

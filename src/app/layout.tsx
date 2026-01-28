import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseProvider } from '@/firebase/provider';
import { UserProvider } from '@/contexts/user-context';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'RandomTalk.online',
  description: 'Connect with random people through voice chat.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <Script src="https://pl28587811.effectivegatecpm.com/b8/cc/07/b8cc078cc341247ee51811d2d77a0a01.js" />
      </head>
      <body className="font-body antialiased">
        <FirebaseProvider>
          <UserProvider>
            {children}
          </UserProvider>
        </FirebaseProvider>
        <Toaster />
      </body>
    </html>
  );
}

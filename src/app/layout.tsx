import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseProvider } from '@/firebase/provider';
import { UserProvider } from '@/contexts/user-context';
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: 'RandomTalk: Voice Chat with Strangers',
  description: 'Connect with random people through voice chat on RandomTalk.online.',
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
      </head>
      <body className="font-body antialiased">
        <FirebaseProvider>
          <UserProvider>
            {children}
          </UserProvider>
        </FirebaseProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}

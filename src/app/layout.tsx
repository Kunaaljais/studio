import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseProvider } from '@/firebase/provider';
import { UserProvider } from '@/contexts/user-context';
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'RandomTalk: Voice Chat with Strangers',
  description: 'Experience the thrill of spontaneous voice conversations on RandomTalk.online. Connect with new people from around the world, practice a language, discuss hobbies, or enjoy a casual chat in a safe and anonymous environment. Start talking to strangers and make new friends today!',
  openGraph: {
    title: 'RandomTalk: Voice Chat with Strangers',
    description: 'Experience the thrill of spontaneous voice conversations on RandomTalk.online. Connect with new people from around the world, practice a language, discuss hobbies, or enjoy a casual chat in a safe and anonymous environment. Start talking to strangers and make new friends today!',
    url: 'https://randomtalk.online',
    siteName: 'RandomTalk.online',
    images: [
      {
        url: 'https://picsum.photos/seed/randomtalk/1200/630',
        width: 1200,
        height: 630,
      },
    ],
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <head />
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

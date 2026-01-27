"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoiceChat } from "@/components/voice-chat";
import { CallHistory } from "@/components/call-history";
import { FriendsList } from "@/components/friends-list";
import { MessageCircle, History, Users, Waves, Loader2 } from "lucide-react";
import { Footer } from "@/components/footer";
import { useFirestore } from "@/firebase";
import { generateRandomUser } from "@/lib/data";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

type AppUser = {
  id: string;
  name: string;
  avatar: string;
};

export default function Home() {
  const firestore = useFirestore();
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    if (firestore && !user) {
      const newUser = generateRandomUser();
      const userRef = doc(firestore, "users", newUser.id);
      
      const userData = {
        ...newUser,
        online: true,
        createdAt: serverTimestamp(),
      };

      setDoc(userRef, userData, { merge: true });
      setUser(newUser);

      const handleBeforeUnload = () => {
        setDoc(userRef, { online: false }, { merge: true });
      };
      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
        setDoc(userRef, { online: false }, { merge: true });
      };
    }
  }, [firestore, user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
      <header className="flex items-center gap-2 mb-6 sm:mb-8">
        <Waves className="w-8 h-8 text-primary" />
        <h1 className="text-2xl sm:text-3xl font-bold text-primary-foreground font-headline">
          RandomTalk.online
        </h1>
      </header>
      <main className="w-full max-w-lg md:max-w-xl flex-1">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-card border">
            <TabsTrigger value="chat" className="gap-2">
              <MessageCircle className="w-4 h-4" /> Chat
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" /> History
            </TabsTrigger>
            <TabsTrigger value="friends" className="gap-2">
              <Users className="w-4 h-4" /> Friends
            </TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="mt-4">
            <VoiceChat user={user} />
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <CallHistory user={user} />
          </TabsContent>
          <TabsContent value="friends" className="mt-4">
            <FriendsList user={user} />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}

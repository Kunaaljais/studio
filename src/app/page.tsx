"use client";

import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoiceChat } from "@/components/voice-chat";
import { CallHistory } from "@/components/call-history";
import { FriendsList } from "@/components/friends-list";
import { MessageCircle, History, Users, Waves, Loader2 } from "lucide-react";
import { Footer } from "@/components/footer";
import { useFirestore } from "@/firebase";
import { generateRandomUser } from "@/lib/data";
import { doc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { CallProvider, useCall } from "@/contexts/call-context";
import { IncomingCallDialog } from "@/components/incoming-call-dialog";

type AppUser = {
  id: string;
  name: string;
  avatar: string;
};

// Main component, wrapped with the provider
export default function HomePage() {
    const firestore = useFirestore();
    const [user, setUser] = useState<AppUser | null>(null);
    const userCreated = useRef(false);

    useEffect(() => {
        if (firestore && !userCreated.current) {
            userCreated.current = true;
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
                updateDoc(userRef, { online: false });
            };

            window.addEventListener("beforeunload", handleBeforeUnload);

            return () => {
                handleBeforeUnload();
                window.removeEventListener("beforeunload", handleBeforeUnload);
            };
        }
    }, [firestore]);

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <CallProvider user={user}>
            <Home user={user} />
        </CallProvider>
    )
}

// Inner component that can use the context
function Home({ user }: { user: AppUser }) {
  const { callState, localStream, remoteStream } = useCall();
  const [activeTab, setActiveTab] = useState("chat");
  const localVideoRef = useRef<HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // When a call is connected, switch to the chat tab
  useEffect(() => {
    if (callState === 'connected' || callState === 'outgoing') {
      setActiveTab('chat');
    }
  }, [callState]);

  return (
    <>
      <IncomingCallDialog />
      <audio ref={localVideoRef} autoPlay playsInline muted style={{ display: 'none' }} />
      <audio ref={remoteVideoRef} autoPlay playsInline style={{ display: 'none' }} />
      <div className="flex flex-col items-center min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
        <header className="flex items-center gap-2 mb-6 sm:mb-8">
          <Waves className="w-8 h-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-foreground font-headline">
            RandomTalk.online
          </h1>
        </header>
        <main className="w-full max-w-lg md:max-w-xl flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
    </>
  );
}

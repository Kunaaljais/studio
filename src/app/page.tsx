"use client";

import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoiceChat } from "@/components/voice-chat";
import { CallHistory } from "@/components/call-history";
import { FriendsList } from "@/components/friends-list";
import { MessageCircle, History, Users, Waves, Loader2 } from "lucide-react";
import { Footer } from "@/components/footer";
import { SeoContent } from "@/components/seo-content";
import { CallProvider, useCall } from "@/contexts/call-context";
import { IncomingCallDialog } from "@/components/incoming-call-dialog";
import { useUser } from '@/contexts/user-context';

function App() {
  const user = useUser();
  const { callState, localStream, remoteStream } = useCall();
  const [activeTab, setActiveTab] = useState("chat");
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (localAudioRef.current && localStream) {
      localAudioRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (callState === 'connected' || callState === 'outgoing' || callState === 'searching') {
      setActiveTab('chat');
    }
  }, [callState]);
  
  if (!user) return null;

  return (
    <>
      <IncomingCallDialog />
      <audio ref={localAudioRef} autoPlay playsInline muted style={{ display: 'none' }} />
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
      <div className="flex flex-col items-center justify-start min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
        <header className="flex items-center gap-2 mb-6 sm:mb-8">
          <Waves className="w-8 h-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-foreground font-headline">
            RandomTalk
          </h1>
        </header>
        <main className="w-full max-w-lg md:max-w-xl mx-auto flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
             <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chat" className="gap-2">
                <MessageCircle /> Chat
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History /> History
              </TabsTrigger>
              <TabsTrigger value="friends" className="gap-2">
                <Users /> Friends
              </TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="mt-4">
              <VoiceChat />
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              <CallHistory />
            </TabsContent>
            <TabsContent value="friends" className="mt-4">
              <FriendsList />
            </TabsContent>
          </Tabs>
        </main>
        <SeoContent />
        <Footer />
      </div>
    </>
  );
}


export default function HomePage() {
  const user = useUser();
  
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <CallProvider user={user}>
      <App />
    </CallProvider>
  )
}

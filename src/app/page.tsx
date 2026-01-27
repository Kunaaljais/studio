"use client";

import { useUser } from "@/firebase/auth/use-user";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VoiceChat } from "@/components/voice-chat"
import { CallHistory } from "@/components/call-history"
import { FriendsList } from "@/components/friends-list"
import { MessageCircle, History, Users, Waves, Loader2 } from "lucide-react"
import { Footer } from "@/components/footer"

export default function Home() {
  const { user, loading } = useUser();

  if (loading || !user) {
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
      <Footer />
    </div>
  )
}

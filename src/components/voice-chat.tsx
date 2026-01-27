"use client"

import { useState, useEffect, useRef } from "react"
import {
  Mic,
  MicOff,
  PhoneOff,
  UserPlus,
  ShieldAlert,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ReportDialog } from "@/components/report-dialog"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useFirestore } from "@/firebase"
import { setDoc, doc, serverTimestamp } from "firebase/firestore"
import { useCall } from "@/contexts/call-context"

type User = { id: string; name: string; avatar: string; }

interface VoiceChatProps {
  user: User;
}

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
};

export function VoiceChat({ user }: VoiceChatProps) {
  const { callState, connectedUser, isMuted, timer, hangup, toggleMute } = useCall();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isReportDialogOpen, setReportDialogOpen] = useState(false);

  const handleAddFriend = async () => {
    if(!user || !firestore || !connectedUser) return;
    try {
        await setDoc(doc(firestore, `users/${user.id}/friends`, connectedUser.id), {
            friendId: connectedUser.id,
            createdAt: serverTimestamp(),
        });
        await setDoc(doc(firestore, `users/${connectedUser.id}/friends`, user.id), {
            friendId: user.id,
            createdAt: serverTimestamp(),
        });

        toast({
            title: "Friend Added",
            description: `${connectedUser?.name} has been added to your friends list.`,
        });
    } catch (e) {
        console.error("Error adding friend: ", e)
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not add friend. Please try again.",
        })
    }
  }
  
  const renderContent = () => {
    switch (callState) {
      case "idle":
        return (
          <div className="flex flex-col items-center justify-center text-center p-8 min-h-[350px]">
            <h2 className="text-2xl font-semibold mb-2">Ready to Talk?</h2>
            <p className="text-muted-foreground">Select a friend from your Friends list to start a call.</p>
          </div>
        )
      case "outgoing":
        return (
          <div className="flex flex-col items-center justify-center text-center p-8 min-h-[350px]">
            <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Calling {connectedUser?.name}...</h2>
            <p className="text-muted-foreground mb-6">Waiting for them to pick up.</p>
            <Button variant="destructive" onClick={() => hangup()}>
              <PhoneOff className="mr-2" /> Cancel Call
            </Button>
          </div>
        )
      case "connected":
        return (
          <div className="flex flex-col items-center text-center p-8 min-h-[350px]">
            <Avatar className="w-32 h-32 mb-4 border-4 border-primary shadow-lg">
              <AvatarImage src={connectedUser?.avatar} alt={connectedUser?.name} data-ai-hint="person portrait" />
              <AvatarFallback>{connectedUser?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold">{connectedUser?.name}</h2>
            <p className="text-2xl font-mono text-muted-foreground mt-2">{formatTime(timer)}</p>
            <div className="flex gap-4 mt-8">
              <Button variant="outline" size="icon" className="w-16 h-16 rounded-full" onClick={() => setReportDialogOpen(true)}>
                <ShieldAlert />
              </Button>
              <Button size="icon" className={cn("w-16 h-16 rounded-full", isMuted ? "bg-secondary" : "bg-primary")} onClick={toggleMute}>
                {isMuted ? <MicOff /> : <Mic />}
              </Button>
              <Button variant="destructive" size="icon" className="w-16 h-16 rounded-full" onClick={() => hangup()}>
                <PhoneOff />
              </Button>
               <Button variant="outline" size="icon" className="w-16 h-16 rounded-full" onClick={handleAddFriend}>
                <UserPlus />
              </Button>
            </div>
          </div>
        )
      default:
        return (
             <div className="flex flex-col items-center justify-center text-center p-8 min-h-[350px]">
                <h2 className="text-2xl font-semibold mb-2">Ready to Talk?</h2>
                <p className="text-muted-foreground">Select a friend from your Friends list to start a call.</p>
             </div>
        )
    }
  }

  return (
    <>
    <Card className="w-full shadow-2xl">
      <CardContent className="p-0">
        <div className="relative">
            {renderContent()}
        </div>
      </CardContent>
    </Card>
    {connectedUser && <ReportDialog user={connectedUser} open={isReportDialogOpen} onOpenChange={setReportDialogOpen} />}
    </>
  )
}

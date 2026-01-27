"use client"

import { useState, useEffect } from "react"
import {
  Mic,
  MicOff,
  PhoneOff,
  UserPlus,
  ShieldAlert,
  Loader2,
  MessageCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ReportDialog } from "@/components/report-dialog"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useCall } from "@/contexts/call-context"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
};

export function VoiceChat() {
  const { callState, connectedUser, isMuted, timer, hangup, toggleMute, findRandomCall, sendFriendRequest } = useCall();
  const { toast } = useToast();
  const [isReportDialogOpen, setReportDialogOpen] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);

  useEffect(() => {
    if (callState !== 'connected') {
        setFriendRequestSent(false);
    }
  }, [callState]);

  const handleAddFriend = () => {
    if(!connectedUser) return;
    sendFriendRequest();
    setFriendRequestSent(true);
    toast({
      title: "Friend Request Sent",
      description: `Your friend request has been sent to ${connectedUser.name}.`,
    });
  };
  
  const renderContent = () => {
    switch (callState) {
      case "idle":
        return (
          <div className="flex flex-col items-center justify-center text-center p-8 min-h-[350px]">
            <h2 className="text-2xl font-semibold mb-2">Ready to Talk?</h2>
            <p className="text-muted-foreground mb-6">Press the button to connect with a random user.</p>
            <Button onClick={findRandomCall}>
              <MessageCircle className="mr-2" /> Find a random chat
            </Button>
          </div>
        );
      case "searching":
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 min-h-[350px]">
            <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Searching for a user...</h2>
            <p className="text-muted-foreground mb-6">Please wait while we connect you.</p>
            <Button variant="destructive" onClick={() => hangup()}>
                <PhoneOff className="mr-2" /> Cancel
            </Button>
            </div>
        );
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
        );
      case "connected":
        return (
          <div className="flex flex-col items-center text-center p-8 min-h-[350px]">
            <Avatar className="w-32 h-32 mb-4 border-4 border-primary shadow-lg">
              <AvatarImage src={connectedUser?.avatar} alt={connectedUser?.name} data-ai-hint="person portrait" />
              <AvatarFallback>{connectedUser?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold">{connectedUser?.name}</h2>
            <p className="text-2xl font-mono text-muted-foreground mt-2">{formatTime(timer)}</p>
            <TooltipProvider>
              <div className="flex gap-4 mt-8">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="w-16 h-16 rounded-full" onClick={() => setReportDialogOpen(true)}>
                      <ShieldAlert />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Report User</p></TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                     <Button size="icon" className={cn("w-16 h-16 rounded-full", isMuted ? "bg-secondary" : "bg-primary")} onClick={toggleMute}>
                        {isMuted ? <MicOff /> : <Mic />}
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{isMuted ? 'Unmute' : 'Mute'}</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="destructive" size="icon" className="w-16 h-16 rounded-full" onClick={() => hangup()}>
                      <PhoneOff />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Hang Up</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="w-16 h-16 rounded-full" onClick={handleAddFriend} disabled={friendRequestSent}>
                      <UserPlus />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{friendRequestSent ? 'Request Sent' : 'Add Friend'}</p></TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        );
      default:
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 min-h-[350px]">
              <h2 className="text-2xl font-semibold mb-2">Ready to Talk?</h2>
              <p className="text-muted-foreground mb-6">Press the button to connect with a random user.</p>
              <Button onClick={findRandomCall}>
                <MessageCircle className="mr-2" /> Find a random chat
              </Button>
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

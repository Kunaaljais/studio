"use client"

import { useState, useEffect, useRef } from "react"
import {
  Mic,
  MicOff,
  PhoneOff,
  UserPlus,
  ShieldAlert,
  Loader2,
  Waves,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ReportDialog } from "@/components/report-dialog"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useCall } from "@/contexts/call-context"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

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
  const [autoCall, setAutoCall] = useState(false);
  const prevCallState = useRef(callState);

  useEffect(() => {
    if (callState !== 'connected') {
        setFriendRequestSent(false);
    }
  }, [callState]);

  useEffect(() => {
    if ( (prevCallState.current === 'connected') && callState === 'idle' && autoCall) {
        findRandomCall();
    }
    prevCallState.current = callState;
  }, [callState, autoCall, findRandomCall]);

  const handleAddFriend = () => {
    if(!connectedUser) return;
    sendFriendRequest();
    setFriendRequestSent(true);
    toast({
      title: "Friend Request Sent",
      description: `Your friend request has been sent to ${connectedUser.name}.`,
    });
  };
  
  const renderCircleContent = () => {
    switch(callState) {
        case 'searching':
        case 'outgoing':
            return <Loader2 className="w-16 h-16 animate-spin text-primary" />;
        case 'connected':
            return <p className="text-4xl font-mono text-primary-foreground">{formatTime(timer)}</p>;
        case 'idle':
        default:
            return (
                <div className="flex flex-col items-center gap-2 text-center">
                    <Waves className="w-16 h-16 text-primary" />
                    <h2 className="text-xl font-bold text-primary-foreground">RandomTalk</h2>
                </div>
            )
    }
  }

  const renderControls = () => {
     switch (callState) {
      case "idle":
        return (
          <div className="flex flex-col items-center justify-center text-center gap-6">
            <p className="text-muted-foreground">Press the button to connect with a random user.</p>
            <Button onClick={findRandomCall} size="lg">
              Find a random chat
            </Button>
            <div className="flex items-center space-x-2">
                <Checkbox id="auto-call" checked={autoCall} onCheckedChange={(checked) => setAutoCall(!!checked)} />
                <Label htmlFor="auto-call" className="text-muted-foreground">Automatically find next chat</Label>
            </div>
          </div>
        );
      case "searching":
        return (
            <div className="flex flex-col items-center justify-center text-center gap-6">
            <p className="text-muted-foreground">Please wait while we connect you.</p>
            <Button variant="destructive" onClick={() => hangup()}>
                Cancel
            </Button>
            </div>
        );
      case "outgoing":
        return (
          <div className="flex flex-col items-center justify-center text-center gap-6">
            <p className="text-muted-foreground">Calling {connectedUser?.name}... waiting for them to pick up.</p>
            <Button variant="destructive" onClick={() => hangup()}>
              Cancel Call
            </Button>
          </div>
        );
      case "connected":
        return (
          <div className="flex flex-col items-center text-center gap-6">
             <h2 className="text-2xl font-bold">{connectedUser?.name}</h2>
              <div className="flex justify-center gap-4">
                <Button variant="ghost" className="flex flex-col items-center justify-center h-auto px-4 py-2" onClick={() => setReportDialogOpen(true)}>
                  <ShieldAlert className="w-6 h-6 mb-1"/>
                  <span>Report</span>
                </Button>
                
                <Button variant="ghost" className="flex flex-col items-center justify-center h-auto px-4 py-2" onClick={toggleMute}>
                    {isMuted ? <MicOff className="w-6 h-6 mb-1" /> : <Mic className="w-6 h-6 mb-1" />}
                    <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                </Button>

                <Button variant="destructive" className="flex flex-col items-center justify-center h-auto px-4 py-2" onClick={() => hangup()}>
                  <PhoneOff className="w-6 h-6 mb-1"/>
                   <span>Hang Up</span>
                </Button>

                 <Button variant="ghost" className="flex flex-col items-center justify-center h-auto px-4 py-2" onClick={handleAddFriend} disabled={friendRequestSent}>
                  <UserPlus className="w-6 h-6 mb-1"/>
                  <span>{friendRequestSent ? 'Sent' : 'Add Friend'}</span>
                </Button>
              </div>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <>
    <Card className="w-full shadow-2xl">
      <CardContent className="p-0">
        <div className="flex flex-col items-center justify-center p-8 min-h-[450px] gap-8">
            <div className={cn(
                "w-64 h-64 rounded-full border-8 flex flex-col items-center justify-center transition-colors duration-500",
                callState === 'connected' ? 'border-green-500' : 'border-primary'
            )}>
                {renderCircleContent()}
            </div>
            <div className="h-24">
                {renderControls()}
            </div>
        </div>
      </CardContent>
    </Card>
    {connectedUser && <ReportDialog user={connectedUser} open={isReportDialogOpen} onOpenChange={setReportDialogOpen} />}
    </>
  )
}

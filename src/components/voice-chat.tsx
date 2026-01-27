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
  Phone,
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
    const isCalling = callState !== 'idle';
    const isConnected = callState === 'connected';

    return (
      <div className="flex flex-col items-center justify-center text-center gap-6 w-full">
        <div className="h-8">
          {isConnected && <h2 className="text-2xl font-bold">{connectedUser?.name}</h2>}
          {callState === 'outgoing' && <p className="text-muted-foreground">Calling {connectedUser?.name}...</p>}
          {callState === 'searching' && <p className="text-muted-foreground">Searching for a user...</p>}
        </div>

        <div className="flex justify-center items-start gap-4">
          <Button variant="ghost" className="flex flex-col items-center justify-center h-auto px-4 py-2" onClick={isCalling ? hangup : findRandomCall}>
            {isCalling ? (
              <>
                <div className="bg-destructive rounded-full p-3">
                  <PhoneOff className="w-6 h-6 text-destructive-foreground"/>
                </div>
                <span className="mt-1">Hang Up</span>
              </>
            ) : (
              <>
                <div className="bg-green-500 rounded-full p-3">
                  <Phone className="w-6 h-6 text-white"/>
                </div>
                <span className="mt-1">Call</span>
              </>
            )}
          </Button>

          <Button variant="ghost" className="flex flex-col items-center justify-center h-auto px-4 py-2 disabled:opacity-50" onClick={toggleMute} disabled={!isConnected}>
            {isMuted ? <MicOff className="w-6 h-6 mb-1" /> : <Mic className="w-6 h-6 mb-1" />}
            <span className={!isConnected ? 'text-muted-foreground' : ''}>{isMuted ? 'Unmute' : 'Mute'}</span>
          </Button>

          <Button variant="ghost" className="flex flex-col items-center justify-center h-auto px-4 py-2 disabled:opacity-50" onClick={handleAddFriend} disabled={!isConnected || friendRequestSent}>
            <UserPlus className="w-6 h-6 mb-1"/>
            <span className={!isConnected ? 'text-muted-foreground' : ''}>{friendRequestSent ? 'Sent' : 'Add Friend'}</span>
          </Button>

          <Button variant="ghost" className="flex flex-col items-center justify-center h-auto px-4 py-2 disabled:opacity-50" onClick={() => setReportDialogOpen(true)} disabled={!isConnected}>
            <ShieldAlert className="w-6 h-6 mb-1"/>
            <span className={!isConnected ? 'text-muted-foreground' : ''}>Report</span>
          </Button>
        </div>

        {!isCalling && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="auto-call" checked={autoCall} onCheckedChange={(checked) => setAutoCall(!!checked)} />
              <Label htmlFor="auto-call" className="text-muted-foreground">Enable Auto Call</Label>
            </div>
            <p className="text-muted-foreground">Tap the Call button to call a new stranger</p>
          </div>
        )}
      </div>
    );
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
            <div className="h-36 flex items-center">
                {renderControls()}
            </div>
        </div>
      </CardContent>
    </Card>
    {connectedUser && <ReportDialog user={connectedUser} open={isReportDialogOpen} onOpenChange={setReportDialogOpen} />}
    </>
  )
}

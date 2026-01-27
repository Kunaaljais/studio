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
  RefreshCw,
  Check,
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
  const [showNextCallUI, setShowNextCallUI] = useState(false);
  const [confirmHangup, setConfirmHangup] = useState(false);
  const prevCallState = useRef(callState);

  const handleNextCall = () => {
    setShowNextCallUI(false);
    findRandomCall();
  };

  useEffect(() => {
    // Show 'Next' UI when a call ends
    if (prevCallState.current === 'connected' && callState === 'idle') {
      setShowNextCallUI(true);
    }
    // Hide 'Next' UI when a new call starts, and reset confirm hangup
    if (callState === 'searching' || callState === 'outgoing' || callState === 'connected') {
      setShowNextCallUI(false);
      setConfirmHangup(false);
    }

    if (callState !== 'connected') {
        setFriendRequestSent(false);
    }

    // Handle auto-call logic
    if ( (prevCallState.current === 'connected' || (showNextCallUI && prevCallState.current === 'idle') ) && callState === 'idle' && autoCall) {
        handleNextCall();
    }
    prevCallState.current = callState;

  }, [callState, autoCall, showNextCallUI]);


  const handleAddFriend = () => {
    if(!connectedUser) return;
    sendFriendRequest();
    setFriendRequestSent(true);
    toast({
      title: "Friend Request Sent",
      description: `Your friend request has been sent to ${connectedUser.name}.`,
    });
  };

  const handleHangupClick = () => {
    if (confirmHangup) {
      hangup();
      setConfirmHangup(false);
    } else {
      setConfirmHangup(true);
    }
  };
  
  const renderCircleContent = () => {
    switch(callState) {
        case 'searching':
        case 'outgoing':
            return <Loader2 className="w-10 h-10 animate-spin text-primary" />;
        case 'connected':
            return <p className="text-2xl font-mono text-primary-foreground">{formatTime(timer)}</p>;
        case 'idle':
        default:
            if (showNextCallUI) {
                return (
                    <div className="flex flex-col items-center gap-2 text-center">
                        <PhoneOff className="w-10 h-10 text-destructive" />
                        <h2 className="text-md font-bold text-primary-foreground">Call Ended</h2>
                    </div>
                )
            }
            return (
                <div className="flex flex-col items-center gap-2 text-center">
                    <Waves className="w-10 h-10 text-primary" />
                    <h2 className="text-md font-bold text-primary-foreground">RandomTalk</h2>
                </div>
            )
    }
  }

  const renderControls = () => {
    const isCalling = callState !== 'idle';
    const isConnected = callState === 'connected';

    if (showNextCallUI && callState === 'idle') {
      return (
        <div className="flex flex-col items-center justify-center text-center gap-4 w-full">
            <p className="text-sm text-muted-foreground">User has disconnected.</p>
            <Button onClick={handleNextCall}>
                <RefreshCw className="mr-2 h-4 w-4" /> Next Call
            </Button>
            <div className="flex items-center space-x-2">
              <Checkbox id="auto-call" checked={autoCall} onCheckedChange={(checked) => setAutoCall(!!checked)} />
              <Label htmlFor="auto-call" className="text-muted-foreground">Enable Auto Call</Label>
            </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center text-center gap-2 w-full">
        <div className="h-6">
          {isConnected && <h2 className="text-xl font-bold">{connectedUser?.name}</h2>}
          {callState === 'outgoing' && <p className="text-muted-foreground">Calling {connectedUser?.name}...</p>}
          {callState === 'searching' && <p className="text-muted-foreground">Searching for a user...</p>}
        </div>

        <div className="flex justify-center items-start gap-1">
          {isCalling ? (
            <Button
              variant="ghost"
              className="flex flex-col items-center justify-center h-auto px-3 py-2 hover:bg-transparent"
              onClick={handleHangupClick}
              onMouseLeave={() => setConfirmHangup(false)}
            >
              <div className="bg-destructive hover:bg-destructive/90 rounded-full p-3">
                {confirmHangup ? (
                  <Check className="w-6 h-6 text-destructive-foreground"/>
                ) : (
                  <PhoneOff className="w-6 h-6 text-destructive-foreground"/>
                )}
              </div>
              <span className="mt-1 text-xs">{confirmHangup ? 'Confirm' : 'Hang Up'}</span>
            </Button>
          ) : (
              <Button variant="ghost" className="flex flex-col items-center justify-center h-auto px-3 py-2 hover:bg-transparent" onClick={findRandomCall}>
                <div className="bg-green-500 hover:bg-green-600 rounded-full p-3">
                  <Phone className="w-6 h-6 text-white"/>
                </div>
                <span className="mt-1 text-xs">Call</span>
              </Button>
          )}

          <Button variant="ghost" className="flex flex-col items-center justify-center h-auto px-3 py-2 disabled:opacity-50 hover:bg-transparent" onClick={toggleMute} disabled={!isConnected}>
            <div className="bg-secondary rounded-full p-3">
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </div>
            <span className={cn('mt-1 text-xs', !isConnected ? 'text-muted-foreground' : '')}>{isMuted ? 'Unmute' : 'Mute'}</span>
          </Button>

          <Button variant="ghost" className="flex flex-col items-center justify-center h-auto px-3 py-2 disabled:opacity-50 hover:bg-transparent" onClick={handleAddFriend} disabled={!isConnected || friendRequestSent}>
            <div className="bg-secondary rounded-full p-3">
                <UserPlus className="w-6 h-6"/>
            </div>
            <span className={cn('mt-1 text-xs', !isConnected ? 'text-muted-foreground' : '')}>{friendRequestSent ? 'Sent' : 'Add Friend'}</span>
          </Button>

          <Button variant="ghost" className="flex flex-col items-center justify-center h-auto px-3 py-2 disabled:opacity-50 hover:bg-transparent" onClick={() => setReportDialogOpen(true)} disabled={!isConnected}>
             <div className="bg-secondary rounded-full p-3">
                <ShieldAlert className="w-6 h-6"/>
            </div>
            <span className={cn('mt-1 text-xs', !isConnected ? 'text-muted-foreground' : '')}>Report</span>
          </Button>
        </div>

        {!isCalling && (
          <div className="flex flex-col items-center gap-2 mt-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="auto-call" checked={autoCall} onCheckedChange={(checked) => setAutoCall(!!checked)} />
              <Label htmlFor="auto-call" className="text-sm text-muted-foreground">Enable Auto Call</Label>
            </div>
            <p className="text-xs text-muted-foreground">Tap the Call button to call a new stranger</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
    <Card className="w-full shadow-2xl">
      <CardContent className="p-0">
        <div className="flex flex-col items-center justify-center p-2 gap-3">
            <div className={cn(
                "w-44 h-44 rounded-full border-4 flex flex-col items-center justify-center transition-colors duration-500",
                callState === 'connected' ? 'border-green-500' : 'border-primary'
            )}>
                {renderCircleContent()}
            </div>
            <div className="flex items-center justify-center w-full">
                {renderControls()}
            </div>
        </div>
      </CardContent>
    </Card>
    {connectedUser && <ReportDialog user={connectedUser} open={isReportDialogOpen} onOpenChange={setReportDialogOpen} />}
    </>
  )
}

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
import { Input } from "@/components/ui/input"
import { ChatBox } from "@/components/chat-box"

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
  const [showDisconnectedMessage, setShowDisconnectedMessage] = useState(false);
  const [confirmHangup, setConfirmHangup] = useState(false);
  const [interests, setInterests] = useState('');
  const prevCallState = useRef(callState);

  useEffect(() => {
    if (prevCallState.current === 'connected' && callState === 'idle') {
      setShowDisconnectedMessage(true);
    } else if (callState !== 'idle') {
      setShowDisconnectedMessage(false);
    }

    if (callState === 'searching' || callState === 'outgoing' || callState === 'connected') {
      setConfirmHangup(false);
    }

    if (callState !== 'connected') {
        setFriendRequestSent(false);
    }

    if (prevCallState.current === 'connected' && callState === 'idle' && autoCall) {
        handleFindCall();
    }
    prevCallState.current = callState;

  }, [callState, autoCall]);


  const handleAddFriend = () => {
    if(!connectedUser) return;
    sendFriendRequest();
    setFriendRequestSent(true);
    toast({
      title: "Friend Request Sent",
      description: `Your friend request has been sent to ${connectedUser.name}.`,
    });
  };

  const handleFindCall = () => {
    const parsedInterests = interests.split(',').map(i => i.trim().toLowerCase()).filter(Boolean);
    findRandomCall(parsedInterests);
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
            return <Loader2 className="w-12 h-12 animate-spin text-primary" />;
        case 'connected':
            return <p className="text-3xl font-mono text-primary-foreground">{formatTime(timer)}</p>;
        case 'idle':
        default:
             return (
                <div className="flex flex-col items-center gap-2 text-center">
                    <Waves className="w-12 h-12 text-primary" />
                    <h2 className="text-lg font-bold text-primary-foreground">RandomTalk</h2>
                </div>
            )
    }
  }

  const renderControls = () => {
    const isCalling = callState !== 'idle';
    const isConnected = callState === 'connected';
    const hasInterests = interests.trim().length > 0;
    
    const renderIdleControls = () => (
        <div className="flex flex-col items-center justify-center text-center gap-2 w-full">
            <div className="h-10">
            </div>

            <div className="flex justify-center items-start">
                <Button variant="ghost" className="flex flex-col items-center justify-center h-auto px-2 py-1 hover:bg-transparent" onClick={handleFindCall}>
                    <div className="bg-green-500 hover:bg-green-600 rounded-full p-4 transition-colors">
                    <Phone className="w-7 h-7 text-white"/>
                    </div>
                    <span className="mt-1 text-xs">Call</span>
                </Button>

                <Button variant="ghost" className="flex flex-col items-center justify-center h-auto px-2 py-1 disabled:opacity-50 hover:bg-transparent hover:text-current" disabled={true}>
                    <div className="bg-secondary rounded-full p-4">
                        <Mic className="w-7 h-7" />
                    </div>
                    <span className={'mt-1 text-xs text-muted-foreground'}>Mute</span>
                </Button>

                <Button variant="ghost" className="flex flex-col items-center justify-center h-auto px-2 py-1 disabled:opacity-50 hover:bg-transparent hover:text-current" disabled={true}>
                    <div className="bg-secondary rounded-full p-4">
                        <UserPlus className="w-7 h-7"/>
                    </div>
                    <span className={'mt-1 text-xs text-muted-foreground'}>Add Friend</span>
                </Button>

                <Button variant="ghost" className="flex flex-col items-center justify-center h-auto px-2 py-1 disabled:opacity-50 hover:bg-transparent hover:text-current" disabled={true}>
                    <div className="bg-secondary rounded-full p-4">
                        <ShieldAlert className="w-7 h-7"/>
                    </div>
                    <span className={'mt-1 text-xs text-muted-foreground'}>Report</span>
                </Button>
            </div>
            
            <div className="flex flex-col items-center gap-2 mt-2 w-full max-w-sm">
                <Input
                  type="text"
                  placeholder="Enter interests (e.g. gaming, movies)"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  className="bg-background/50 text-center"
                />
                <div className="flex items-center space-x-2 mt-1">
                    <Checkbox id="auto-call" checked={autoCall} onCheckedChange={(checked) => setAutoCall(!!checked)} />
                    <Label htmlFor="auto-call" className="text-sm text-muted-foreground">Enable Auto Call</Label>
                </div>
            </div>
      </div>
    );

    if (!isCalling) {
      return renderIdleControls();
    }


    return (
      <div className="flex flex-col items-center justify-center text-center gap-2 w-full">
        <div className="flex flex-col items-center justify-center min-h-[2.5rem]">
          {isConnected && <h2 className="text-xl font-bold">{connectedUser?.name}</h2>}
          {callState === 'outgoing' && <p className="text-muted-foreground">Calling {connectedUser?.name}...</p>}
          {callState === 'searching' && (
             <div className="text-center">
                <p className="text-muted-foreground">
                    {hasInterests
                        ? 'Searching for someone with similar interests...'
                        : 'Searching for a random user...'}
                </p>
                {hasInterests && (
                    <p className="text-xs text-muted-foreground/80">
                        (If none are found, we'll connect you randomly)
                    </p>
                )}
            </div>
          )}
        </div>

        <div className="flex justify-center items-start">
            {callState === 'connected' ? (
                <Button
                variant="ghost"
                className="flex flex-col items-center justify-center h-auto px-2 py-1 hover:bg-transparent"
                onClick={handleHangupClick}
                >
                <div className="bg-destructive hover:bg-red-600 rounded-full p-4 transition-colors">
                    {confirmHangup ? (
                    <Check className="w-7 h-7 text-destructive-foreground"/>
                    ) : (
                    <PhoneOff className="w-7 h-7 text-destructive-foreground"/>
                    )}
                </div>
                <span className="mt-1 text-xs text-foreground">{confirmHangup ? 'Confirm' : 'Hang Up'}</span>
                </Button>
            ) : (callState === 'searching' || callState === 'outgoing') ? (
                <Button
                variant="ghost"
                className="flex flex-col items-center justify-center h-auto px-2 py-1 hover:bg-transparent"
                onClick={hangup}
                >
                    <div className="bg-destructive hover:bg-red-600 rounded-full p-4 transition-colors">
                        <PhoneOff className="w-7 h-7 text-destructive-foreground"/>
                    </div>
                    <span className="mt-1 text-xs">Cancel</span>
                </Button>
            ) : null}

            <Button variant="ghost" className="flex flex-col items-center justify-center h-auto px-2 py-1 disabled:opacity-50 hover:bg-transparent hover:text-current" onClick={toggleMute} disabled={!isConnected}>
                <div className={cn("rounded-full p-4 transition-colors", isConnected ? "bg-secondary hover:bg-secondary/80" : "bg-secondary")}>
                    {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                </div>
                <span className={cn('mt-1 text-xs', !isConnected ? 'text-muted-foreground' : '')}>{isMuted ? 'Unmute' : 'Mute'}</span>
            </Button>

            <Button variant="ghost" className="flex flex-col items-center justify-center h-auto px-2 py-1 disabled:opacity-50 hover:bg-transparent hover:text-current" onClick={handleAddFriend} disabled={!isConnected || friendRequestSent}>
                <div className={cn("rounded-full p-4 transition-colors", isConnected ? "bg-secondary hover:bg-secondary/80" : "bg-secondary")}>
                    <UserPlus className="w-7 h-7"/>
                </div>
                <span className={cn('mt-1 text-xs', !isConnected ? 'text-muted-foreground' : '')}>{friendRequestSent ? 'Sent' : 'Add Friend'}</span>
            </Button>

            <Button variant="ghost" className="flex flex-col items-center justify-center h-auto px-2 py-1 disabled:opacity-50 hover:bg-transparent hover:text-current" onClick={() => setReportDialogOpen(true)} disabled={!isConnected}>
                <div className={cn("rounded-full p-4 transition-colors", isConnected ? "bg-secondary hover:bg-secondary/80" : "bg-secondary")}>
                    <ShieldAlert className="w-7 h-7"/>
                </div>
                <span className={cn('mt-1 text-xs', !isConnected ? 'text-muted-foreground' : '')}>Report</span>
            </Button>
        </div>
        
      </div>
    );
  }

  return (
    <>
    <Card className="w-full shadow-2xl rounded-t-none">
      <CardContent className="p-0">
        <div className="flex flex-col items-center justify-between p-6 gap-4 min-h-[420px]">
            <div className={cn(
                "w-48 h-48 rounded-full border-4 flex flex-col items-center justify-center transition-colors duration-500",
                callState === 'connected' ? 'border-green-500' : 'border-primary'
            )}>
                {renderCircleContent()}
            </div>
            <div className="flex items-center justify-center w-full">
                {renderControls()}
            </div>
            <div className="h-5 flex items-center">
              {showDisconnectedMessage && callState === 'idle' && (
                <p className="text-red-500 text-sm">Your partner has ended the call</p>
              )}
            </div>
        </div>
        {callState === 'connected' && (
          <>
            <div className="border-t"></div>
            <ChatBox />
          </>
        )}
      </CardContent>
    </Card>
    {connectedUser && <ReportDialog user={connectedUser} open={isReportDialogOpen} onOpenChange={setReportDialogOpen} />}
    </>
  )
}

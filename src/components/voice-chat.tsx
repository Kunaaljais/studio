"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  UserPlus,
  ShieldAlert,
  Loader2,
  X,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ReportDialog } from "@/components/report-dialog"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useFirestore } from "@/firebase"
import * as webrtc from "@/lib/webrtc"
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore"

type CallState = "idle" | "searching" | "connecting" | "in-call" | "call-ended"
type User = { id: string; name: string; avatar: string }

interface VoiceChatProps {
  user: User;
}

export function VoiceChat({ user }: VoiceChatProps) {
  const firestore = useFirestore()
  const [callState, setCallState] = useState<CallState>("idle")
  const [isMuted, setIsMuted] = useState(false)
  const [autoCall, setAutoCall] = useState(false)
  const [timer, setTimer] = useState(0)
  const [connectedUser, setConnectedUser] = useState<User | null>(null)
  const [isReportDialogOpen, setReportDialogOpen] = useState(false)
  const { toast } = useToast()
  
  const localVideoRef = useRef<HTMLAudioElement>(null)
  const remoteVideoRef = useRef<HTMLAudioElement>(null)

  const callIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<Date | null>(null)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")
    const secs = (seconds % 60).toString().padStart(2, "0")
    return `${mins}:${secs}`
  }

  const handleHangUp = useCallback(async () => {
    if(callIdRef.current && firestore && user && connectedUser && startTimeRef.current) {
        const duration = Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000);
        const callData = {
            callerId: user.id,
            callerName: user.name,
            callerAvatar: user.avatar,
            calleeId: connectedUser.id,
            calleeName: connectedUser.name,
            calleeAvatar: connectedUser.avatar,
            startedAt: serverTimestamp(),
            duration: duration,
        };
        await addDoc(collection(firestore, `users/${user.id}/calls`), callData);
        await addDoc(collection(firestore, `users/${connectedUser.id}/calls`), callData);
    }
    
    webrtc.hangup(callIdRef.current);
    setCallState("call-ended")
  }, [firestore, user, connectedUser])

  const startConnecting = useCallback(async () => {
    if (!firestore || !user) return;
    setCallState("searching")
    setTimer(0)
    setConnectedUser(null)
    callIdRef.current = null;
    startTimeRef.current = null;
    
    const onConnected = (peer: User, callId: string) => {
        setConnectedUser(peer);
        setCallState("in-call");
        callIdRef.current = callId;
        startTimeRef.current = new Date();
    }
    const onHangup = () => handleHangUp();
    
    await webrtc.createOrJoinRoom(firestore, user, onConnected, onHangup, localVideoRef, remoteVideoRef);

  }, [firestore, user, handleHangUp])

  
  useEffect(() => {
    let callTimeout: NodeJS.Timeout
    if (callState === "call-ended" && autoCall) {
      callTimeout = setTimeout(() => {
        startConnecting()
      }, 2000)
    }
    return () => clearTimeout(callTimeout)
  }, [callState, autoCall, startConnecting])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (callState === "in-call") {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [callState])

  useEffect(() => {
    webrtc.toggleMute(isMuted);
  }, [isMuted]);

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
        })
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
            <p className="text-muted-foreground mb-6">Click the button to start a random voice chat.</p>
            <Button size="lg" className="rounded-full w-48 h-16 text-lg" onClick={startConnecting}>
              <Phone className="mr-2" /> Start Chat
            </Button>
          </div>
        )
      case "searching":
        return (
          <div className="flex flex-col items-center justify-center text-center p-8 min-h-[350px]">
            <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Searching...</h2>
            <p className="text-muted-foreground mb-6">Finding a random person for you to talk to.</p>
            <Button variant="outline" onClick={() => setCallState("idle")}>
              <X className="mr-2" /> Cancel
            </Button>
          </div>
        )
      case "in-call":
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
              <Button size="icon" className={cn("w-16 h-16 rounded-full", isMuted ? "bg-secondary" : "bg-primary")} onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? <MicOff /> : <Mic />}
              </Button>
              <Button variant="destructive" size="icon" className="w-16 h-16 rounded-full" onClick={handleHangUp}>
                <PhoneOff />
              </Button>
               <Button variant="outline" size="icon" className="w-16 h-16 rounded-full" onClick={handleAddFriend}>
                <UserPlus />
              </Button>
            </div>
          </div>
        )
      case "call-ended":
        return (
           <div className="flex flex-col items-center justify-center text-center p-8 min-h-[350px]">
            <h2 className="text-2xl font-semibold mb-2">Call Ended</h2>
            <p className="text-muted-foreground mb-6">
              {autoCall ? 'Starting new call automatically...' : 'Ready for another chat?'}
            </p>
            {!autoCall && (
                <Button size="lg" className="rounded-full w-56 h-16 text-lg" onClick={startConnecting}>
                    <RefreshCw className="mr-2" /> Find New Chat
                </Button>
            )}
            {autoCall && <Loader2 className="w-12 h-12 animate-spin text-primary" />}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Card className="w-full shadow-2xl">
      <CardContent className="p-0">
        <div className="relative">
            {renderContent()}
            <audio ref={localVideoRef} autoPlay playsInline muted/>
            <audio ref={remoteVideoRef} autoPlay playsInline />
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="p-4 flex justify-center items-center">
         <div className="flex items-center space-x-2">
            <Switch id="auto-call-mode" checked={autoCall} onCheckedChange={setAutoCall} />
            <Label htmlFor="auto-call-mode" className="text-sm">Auto Call</Label>
        </div>
      </CardFooter>
      {connectedUser && <ReportDialog user={connectedUser} open={isReportDialogOpen} onOpenChange={setReportDialogOpen} />}
    </Card>
  )
}

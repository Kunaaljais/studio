
"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useCall } from "@/contexts/call-context"
import { getFlagEmoji } from "@/lib/countries"

export function IncomingCallDialog() {
  const { incomingCall, acceptCall, rejectCall } = useCall()

  if (!incomingCall) {
    return null
  }

  const handleAccept = () => {
    acceptCall()
  }

  const handleReject = () => {
    rejectCall()
  }

  return (
    <AlertDialog open={!!incomingCall}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Incoming Call</AlertDialogTitle>
          <AlertDialogDescription>
            You have an incoming call from {incomingCall.caller.name}
            {incomingCall.caller.country && ` from ${incomingCall.caller.country}`}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center justify-center gap-4 py-4">
          <Avatar className="h-24 w-24">
            <AvatarFallback>{incomingCall.caller.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <p className="text-lg font-semibold">{incomingCall.caller.name}</p>
            {incomingCall.caller.country && (
                <p className="text-sm text-muted-foreground">
                    {incomingCall.caller.country} {getFlagEmoji(incomingCall.caller.countryCode || '')}
                </p>
            )}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleReject}>Reject</AlertDialogCancel>
          <AlertDialogAction onClick={handleAccept}>Accept</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

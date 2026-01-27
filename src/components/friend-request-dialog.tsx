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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useCall } from "@/contexts/call-context"

export function FriendRequestDialog() {
  const { incomingFriendRequest, acceptFriendRequest, rejectFriendRequest } = useCall()

  if (!incomingFriendRequest) {
    return null
  }

  const handleAccept = () => {
    acceptFriendRequest()
  }

  const handleReject = () => {
    rejectFriendRequest()
  }

  return (
    <AlertDialog open={!!incomingFriendRequest} onOpenChange={(open) => !open && handleReject()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Friend Request</AlertDialogTitle>
          <AlertDialogDescription>
            You have a friend request from {incomingFriendRequest.from.name}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center justify-center gap-4 py-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={incomingFriendRequest.from.avatar} alt={incomingFriendRequest.from.name} />
            <AvatarFallback>{incomingFriendRequest.from.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <p className="text-lg font-semibold">{incomingFriendRequest.from.name}</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleReject}>Decline</AlertDialogCancel>
          <AlertDialogAction onClick={handleAccept}>Accept</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

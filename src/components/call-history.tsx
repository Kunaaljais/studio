"use client"

import { useCollection } from "@/firebase/firestore/use-collection"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Clock, Phone, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirestore } from "@/firebase"
import { collection, query, orderBy, where } from "firebase/firestore"
import { useMemo } from "react"
import { formatDistanceToNow } from "date-fns"
import { useCall } from "@/contexts/call-context"

interface CallHistoryProps {
  user: { id: string; name: string; avatar: string; };
}

export function CallHistory({ user }: CallHistoryProps) {
  const firestore = useFirestore()
  const { startCall, callState } = useCall();

  const callsQuery = useMemo(() => {
    if (!user || !firestore) return null
    return query(collection(firestore, `users/${user.id}/calls`), orderBy("startedAt", "desc"));
  }, [user, firestore])

  const { data: callHistory, loading } = useCollection(callsQuery)
  
  const otherUserIds = useMemo(() => {
    if (!callHistory) return [];
    return Array.from(new Set(callHistory.map((c: any) => c.callerId === user.id ? c.calleeId : c.callerId)));
  }, [callHistory, user.id]);

  const usersQuery = useMemo(() => {
      if (!firestore || otherUserIds.length === 0) return null;
      return query(collection(firestore, 'users'), where('id', 'in', otherUserIds));
  }, [firestore, otherUserIds]);

  const { data: users, loading: usersLoading } = useCollection(usersQuery);

  const usersById = useMemo(() => {
      if (!users) return {};
      return users.reduce((acc, u: any) => {
          acc[u.id] = u;
          return acc;
      }, {} as { [key: string]: any });
  }, [users]);


  const handleCall = (callData: any) => {
    const otherUserId = callData.callerId === user.id ? callData.calleeId : callData.callerId;
    const otherUser = usersById[otherUserId];
    if (otherUser) {
      startCall(otherUser);
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Call History</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {(loading || usersLoading) && (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          {!(loading || usersLoading) && callHistory && callHistory.length > 0 ? (
            <div className="space-y-4">
              {callHistory.map((call: any, index) => {
                  const otherUserId = call.callerId === user.id ? call.calleeId : call.callerId;
                  const otherUserName = call.callerId === user.id ? call.calleeName : call.callerName;
                  const otherUserAvatar = call.callerId === user.id ? call.calleeAvatar : call.callerAvatar;
                  const callee = usersById[otherUserId];
                  const isOnline = callee?.online || false;
                  
                  return (
                    <div key={call.id}>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                            <AvatarImage src={otherUserAvatar} alt={otherUserName} data-ai-hint="person portrait" />
                            <AvatarFallback>{otherUserName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                            <p className="font-semibold">{otherUserName}</p>
                            <p className="text-sm text-muted-foreground">
                                {call.startedAt ? formatDistanceToNow(call.startedAt.toDate(), { addSuffix: true }) : 'N/A'}
                            </p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>{formatDuration(call.duration)}</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleCall(call)} disabled={!isOnline || callState !== 'idle'}>
                            <Phone className="w-4 h-4" />
                            </Button>
                        </div>
                        {index < callHistory.length - 1 && <Separator className="mt-4" />}
                    </div>
                  )
                })}
            </div>
          ) : (
            !(loading || usersLoading) && (
              <div className="text-center text-muted-foreground py-16">
                <p>Your call history is empty.</p>
                <p>Start a chat to see your history here.</p>
              </div>
            )
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

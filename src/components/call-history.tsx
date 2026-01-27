"use client"

import { useCollection } from "@/firebase/firestore/use-collection"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Clock, Phone, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useFirestore } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { useMemo } from "react"
import { formatDistanceToNow } from "date-fns"

interface CallHistoryProps {
  user: { id: string; name: string; avatar: string; };
}

export function CallHistory({ user }: CallHistoryProps) {
  const firestore = useFirestore()
  const { toast } = useToast()

  const callsQuery = useMemo(() => {
    if (!user || !firestore) return null
    return query(collection(firestore, `users/${user.id}/calls`), orderBy("startedAt", "desc"));
  }, [user, firestore])

  const { data: callHistory, loading } = useCollection(callsQuery)

  const handleCall = (userName: string) => {
    toast({
      title: "Calling user...",
      description: `Starting a call with ${userName}.`,
    })
    // In a real app, you'd trigger the call flow here.
    // This is not implemented in this version.
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
          {loading && (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          {!loading && callHistory && callHistory.length > 0 ? (
            <div className="space-y-4">
              {callHistory.map((call: any, index) => (
                <div key={call.id}>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={call.calleeAvatar} alt={call.calleeName} data-ai-hint="person portrait" />
                      <AvatarFallback>{call.calleeName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{call.calleeName}</p>
                      <p className="text-sm text-muted-foreground">
                        {call.startedAt ? formatDistanceToNow(call.startedAt.toDate(), { addSuffix: true }) : 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(call.duration)}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleCall(call.calleeName)}>
                      <Phone className="w-4 h-4" />
                    </Button>
                  </div>
                  {index < callHistory.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          ) : (
            !loading && (
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

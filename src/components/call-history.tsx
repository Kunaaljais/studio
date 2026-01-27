"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Clock, Phone, ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCall } from "@/contexts/call-context"
import { formatDistanceToNow } from "date-fns"
import { getCallHistoryFromStorage } from "@/lib/local-storage"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function CallHistory() {
  const { startCall, callState } = useCall();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setHistory(getCallHistoryFromStorage());
    setLoading(false);
  }, []);

  const handleCall = (callData: any) => {
    startCall(callData.user);
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }
  
  return (
    <Card className="rounded-t-none">
      <CardHeader>
        <CardTitle>Call History</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[360px]">
          {loading && (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          {!loading && history && history.length > 0 ? (
            <TooltipProvider>
              <div className="space-y-4">
                {history.map((call: any, index) => (
                      <div key={call.id}>
                          <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12">
                              <AvatarFallback>{call.user.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                              <p className="font-semibold">{call.user.name}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                {call.type === 'outgoing' ? <ArrowUpRight className="w-3 h-3 text-red-500" /> : <ArrowDownLeft className="w-3 h-3 text-green-500" />}
                                {call.date ? formatDistanceToNow(new Date(call.date), { addSuffix: true }) : 'N/A'}
                              </p>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              <span>{formatDuration(call.duration)}</span>
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleCall(call)} disabled={callState !== 'idle'}>
                                      <Phone className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Call {call.user.name}</p>
                                </TooltipContent>
                              </Tooltip>
                          </div>
                          {index < history.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
              </div>
            </TooltipProvider>
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

"use client"

import { callHistory } from "@/lib/data"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Clock, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export function CallHistory() {
  const { toast } = useToast()

  const handleCall = (userName: string) => {
    toast({
      title: "Calling user...",
      description: `Starting a call with ${userName}.`,
    })
    // In a real app, you'd trigger the call flow here.
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Call History</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {callHistory.length > 0 ? (
            <div className="space-y-4">
              {callHistory.map((call, index) => (
                <div key={call.id}>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={call.user.avatar} alt={call.user.name} data-ai-hint="person portrait" />
                      <AvatarFallback>{call.user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{call.user.name}</p>
                      <p className="text-sm text-muted-foreground">{call.date}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{call.duration}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleCall(call.user.name)}>
                      <Phone className="w-4 h-4" />
                    </Button>
                  </div>
                  {index < callHistory.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-16">
              <p>Your call history is empty.</p>
              <p>Start a chat to see your history here.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

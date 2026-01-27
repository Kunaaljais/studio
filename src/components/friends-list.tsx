"use client"

import { friends } from "@/lib/data"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Phone, UserMinus } from "lucide-react"
import { cn } from "@/lib/utils"

export function FriendsList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Friends</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {friends.length > 0 ? (
            <div className="space-y-4">
              {friends.map((friend, index) => (
                <div key={friend.id}>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={friend.avatar} alt={friend.name} data-ai-hint="person portrait" />
                        <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-card",
                        friend.online ? "bg-green-500" : "bg-gray-500"
                      )} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{friend.name}</p>
                      <p className="text-sm text-muted-foreground">{friend.online ? "Online" : "Offline"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" disabled={!friend.online}>
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {index < friends.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-16">
              <p>You haven't added any friends yet.</p>
              <p>You can add friends during a call.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

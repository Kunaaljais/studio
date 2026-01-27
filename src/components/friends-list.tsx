"use client"

import { useState, useEffect, useMemo } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Phone, UserMinus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useCall } from "@/contexts/call-context"
import { getFriendsFromStorage, removeFriendFromStorage } from "@/lib/local-storage"
import type { Friend } from "@/lib/data"
import { useFirestore } from "@/firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export function FriendsList() {
  const { toast } = useToast()
  const { callState, startCall, friendRequests, acceptFriendRequest, rejectFriendRequest } = useCall();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<{[key: string]: boolean}>({});
  const firestore = useFirestore();

  useEffect(() => {
    const updateFriends = () => setFriends(getFriendsFromStorage());
    updateFriends();
    window.addEventListener('friends-updated', updateFriends);
    return () => window.removeEventListener('friends-updated', updateFriends);
  }, []);

  const friendIds = useMemo(() => friends.map(f => f.id), [friends]);

  useEffect(() => {
    if (!firestore || friendIds.length === 0) {
        const newStatus: {[key: string]: boolean} = {};
        friendIds.forEach(id => newStatus[id] = false);
        setOnlineStatus(newStatus);
        return;
    };

    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('id', 'in', friendIds));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const newOnlineStatus = { ...onlineStatus };
        friendIds.forEach(id => newOnlineStatus[id] = newOnlineStatus[id] || false);

        snapshot.forEach(doc => {
            const data = doc.data();
            newOnlineStatus[data.id] = data.online || false;
        });
        setOnlineStatus(newOnlineStatus);
    });

    return () => unsubscribe();
  }, [firestore, friendIds]);


  const handleRemoveFriend = (friendId: string) => {
    removeFriendFromStorage(friendId);
    setFriends(friends.filter(f => f.id !== friendId));
    toast({
      title: "Friend removed",
      description: "The user has been removed from your friends list.",
    })
  }
  
  const handleCall = (friend: any) => {
      startCall(friend);
  }

  const handleAccept = (request: any) => {
    acceptFriendRequest(request);
  }
  const handleDecline = (requestId: string) => {
      rejectFriendRequest(requestId);
  }

  const sortedFriends = useMemo(() => {
      return [...friends].sort((a, b) => {
          const aOnline = onlineStatus[a.id] || false;
          const bOnline = onlineStatus[b.id] || false;
          if (aOnline && !bOnline) return -1;
          if (!aOnline && bOnline) return 1;
          return a.name.localeCompare(b.name);
      });
  }, [friends, onlineStatus]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Social</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friends">My Friends</TabsTrigger>
            <TabsTrigger value="requests" className="relative">
              Requests
              {friendRequests.length > 0 && 
                  <Badge className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 h-5 w-5 justify-center p-0">{friendRequests.length}</Badge>
              }
            </TabsTrigger>
          </TabsList>
          <TabsContent value="friends" className="mt-4">
             <ScrollArea className="h-[230px]">
              {sortedFriends && sortedFriends.length > 0 ? (
                <div className="space-y-4">
                  {sortedFriends.map((friend, index) => (
                    <div key={friend.id}>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className={cn(
                            "absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-card",
                            onlineStatus[friend.id] ? "bg-green-500" : "bg-gray-500"
                          )} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{friend.name}</p>
                          <p className="text-sm text-muted-foreground">{onlineStatus[friend.id] ? "Online" : "Offline"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" disabled={!onlineStatus[friend.id] || callState !== 'idle'} onClick={() => handleCall(friend)}>
                            <Phone className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <UserMinus className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove {friend.name} from your friends list.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemoveFriend(friend.id)}>Remove</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      {index < sortedFriends.length - 1 && <Separator className="mt-4" />}
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
          </TabsContent>
          <TabsContent value="requests" className="mt-4">
            <ScrollArea className="h-[230px]">
              {friendRequests.length > 0 ? (
                  <div className="space-y-4">
                      {friendRequests.map((req, index) => (
                          <div key={req.id}>
                              <div className="flex items-center gap-4">
                                  <Avatar className="h-12 w-12">
                                      <AvatarFallback>{req.fromName.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                      <p className="font-semibold">{req.fromName}</p>
                                      <p className="text-sm text-muted-foreground">Wants to be your friend</p>
                                  </div>
                                  <div className="flex gap-2">
                                      <Button size="sm" onClick={() => handleAccept(req)}>Accept</Button>
                                      <Button size="sm" variant="outline" onClick={() => handleDecline(req.id)}>Decline</Button>
                                  </div>
                              </div>
                              {index < friendRequests.length - 1 && <Separator className="mt-4" />}
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="text-center text-muted-foreground py-16">
                      <p>You have no new friend requests.</p>
                  </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

"use client"

import { useUser } from "@/firebase/auth/use-user"
import { useCollection } from "@/firebase/firestore/use-collection"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Phone, UserMinus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirestore } from "@/firebase"
import { collection, doc, deleteDoc, query, where, getDocs } from "firebase/firestore"
import { useMemo } from "react"
import { useToast } from "@/hooks/use-toast"

export function FriendsList() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  const friendsQuery = useMemo(() => {
    if (!user || !firestore) return null
    return collection(firestore, `users/${user.uid}/friends`);
  }, [user, firestore])

  const { data: friends, loading } = useCollection(friendsQuery);

  const friendsProfilesQuery = useMemo(() => {
    if (!friends || !firestore || friends.length === 0) return null;
    const friendIds = friends.map((f: any) => f.friendId);
    return query(collection(firestore, 'users'), where('id', 'in', friendIds));
  }, [friends, firestore]);

  const { data: friendProfiles, loading: profilesLoading } = useCollection(friendsProfilesQuery);

  const handleRemoveFriend = async (friendId: string) => {
    if (!user || !firestore) return;
    try {
      // Find the specific friend document to delete
      const friendQuery = query(collection(firestore, `users/${user.uid}/friends`), where("friendId", "==", friendId));
      const querySnapshot = await getDocs(friendQuery);
      if (!querySnapshot.empty) {
        const friendDoc = querySnapshot.docs[0];
        await deleteDoc(doc(firestore, `users/${user.uid}/friends`, friendDoc.id))
        toast({
          title: "Friend removed",
          description: "The user has been removed from your friends list.",
        })
      }
    } catch (error) {
      console.error("Error removing friend: ", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not remove friend. Please try again.",
      })
    }
  }

  const isLoading = loading || profilesLoading;

  const onlineFriends = useMemo(() => {
    if (!friendProfiles) return [];
    return friendProfiles.filter((p: any) => p.online);
  }, [friendProfiles]);

  const offlineFriends = useMemo(() => {
    if (!friendProfiles) return [];
    return friendProfiles.filter((p: any) => !p.online);
  }, [friendProfiles]);

  const sortedFriends = useMemo(() => [...onlineFriends, ...offlineFriends], [onlineFriends, offlineFriends]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Friends</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {isLoading && (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          {!isLoading && sortedFriends && sortedFriends.length > 0 ? (
            <div className="space-y-4">
              {sortedFriends.map((friend: any, index) => (
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
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleRemoveFriend(friend.id)}>
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {index < sortedFriends.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          ) : (
            !isLoading && (
              <div className="text-center text-muted-foreground py-16">
                <p>You haven't added any friends yet.</p>
                <p>You can add friends during a call.</p>
              </div>
            )
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

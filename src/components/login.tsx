"use client";

import { useState } from "react";
import { signInAnonymously } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth, useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Waves } from "lucide-react";
import { generateRandomUser } from "@/lib/data";

export function Login() {
  const auth = useAuth();
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    setLoading(true);
    if (!auth || !firestore) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Firebase not initialized.",
      });
      setLoading(false);
      return;
    }
    try {
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;
      const randomUser = generateRandomUser();

      const userProfile = {
        id: user.uid,
        name: randomUser.name,
        avatar: randomUser.avatar,
        online: true,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(firestore, "users", user.uid), userProfile);

      toast({
        title: "Logged In",
        description: `Welcome, ${userProfile.name}!`,
      });
    } catch (error: any) {
      console.error("Anonymous sign-in error:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
            <Waves className="w-12 h-12 text-primary mb-2" />
          <CardTitle className="text-2xl">RandomTalk.online</CardTitle>
          <CardDescription>
            Sign in to start chatting with random people.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Button onClick={handleLogin} disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Sign In Anonymously
            </Button>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-center text-muted-foreground justify-center">
            <p>Your privacy is important. We use anonymous accounts.</p>
        </CardFooter>
      </Card>
    </div>
  );
}

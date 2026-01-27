"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useAuth, useFirestore } from "@/firebase";

interface AppUser extends User {
    // Add any custom user properties here
    name?: string;
    avatar?: string;
    online?: boolean;
}

export function useUser() {
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) {
      if(!auth) console.log("Auth is not available");
      if(!firestore) console.log("Firestore is not available");
      setLoading(false);
      return;
    };
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(firestore, "users", firebaseUser.uid);

        // Set user online status
        await setDoc(userRef, { online: true }, { merge: true });

        const unsubSnapshot = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
              setUser({ ...firebaseUser, ...doc.data() });
            } else {
              // Handle case where user document doesn't exist yet
               setUser(firebaseUser);
            }
            setLoading(false);
        });

        // Set user offline on disconnect
        const onlineStatusRef = doc(firestore, "users", firebaseUser.uid);
        window.addEventListener("beforeunload", async () => {
             await setDoc(onlineStatusRef, { online: false }, { merge: true });
        });

        return () => unsubSnapshot();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  return { user, loading };
}

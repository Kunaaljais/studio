"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth, useFirestore } from "@/firebase";
import { generateRandomUser } from "@/lib/data";

interface AppUser extends User {
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
      return;
    }

    const handleBeforeUnload = () => {
      if (auth.currentUser) {
        const userRef = doc(firestore, "users", auth.currentUser.uid);
        setDoc(userRef, { online: false }, { merge: true });
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(firestore, "users", firebaseUser.uid);
        
        setDoc(userRef, { online: true }, { merge: true });

        const unsubSnapshot = onSnapshot(userRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
              setUser({ ...firebaseUser, ...docSnapshot.data() });
              setLoading(false);
            } else {
              // User is authenticated but no profile in Firestore, create one.
              const randomUser = generateRandomUser();
              const userProfile = {
                id: firebaseUser.uid,
                name: randomUser.name,
                avatar: randomUser.avatar,
                online: true,
                createdAt: serverTimestamp(),
              };
              setDoc(userRef, userProfile);
            }
        });

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            unsubSnapshot();
            window.removeEventListener("beforeunload", handleBeforeUnload);
        }
      } else {
        // No user is signed in. Let's sign them in anonymously.
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in error:", error);
          setLoading(false);
        });
      }
    });

    return () => {
        unsubscribe();
        window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [auth, firestore]);

  return { user, loading };
}

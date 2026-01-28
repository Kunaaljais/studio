'use client';
import { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react';
import { generateRandomUser } from '@/lib/data';
import { Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

type AppUser = {
  id: string;
  name: string;
  avatar: string;
  interests?: string[];
};

interface UserContextType {
  user: AppUser | null;
}

const UserContext = createContext<UserContextType | null>(null);

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context.user;
};

export const UserProvider = ({ children }: PropsWithChildren) => {
    const firestore = useFirestore();
    const [user, setUser] = useState<AppUser | null>(null);

    useEffect(() => {
        const generatedUser = generateRandomUser();
        setUser(generatedUser);

        if (firestore) {
            const userRef = doc(firestore, "users", generatedUser.id);
            const userData = {
                ...generatedUser,
                online: true,
                lastSeen: serverTimestamp(),
                callState: 'idle',
                interests: [],
            };
            setDoc(userRef, userData, { merge: true });

            const handleBeforeUnload = () => {
                // Use setDoc with merge to avoid race conditions on unload
                setDoc(userRef, { online: false, lastSeen: serverTimestamp() }, { merge: true });
            };

            window.addEventListener("beforeunload", handleBeforeUnload);

            return () => {
                handleBeforeUnload();
                window.removeEventListener("beforeunload", handleBeforeUnload);
            };
        }
    }, [firestore]);

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <UserContext.Provider value={{ user }}>
            {children}
        </UserContext.Provider>
    );
};

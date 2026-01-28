"use client";

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export function OnlineUsersCount() {
    const firestore = useFirestore();
    const [onlineCount, setOnlineCount] = useState(0);

    useEffect(() => {
        if (!firestore) return;

        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('online', '==', true));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setOnlineCount(snapshot.size);
        }, (error) => {
            console.error("Error fetching online users:", error);
        });

        return () => unsubscribe();
    }, [firestore]);

    return (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground z-10 bg-background/50 backdrop-blur-sm px-2 py-1 rounded-full border">
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span>{onlineCount} Online</span>
        </div>
    );
}


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
        // A user is considered online if they are marked as online and have been seen in the last 2 minutes.
        // This helps filter out users who may have disconnected without being marked as offline.
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

        const q = query(usersRef, where('online', '==', true), where('lastSeen', '>', twoMinutesAgo));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setOnlineCount(snapshot.size);
        }, (error) => {
            // Firestore will log an error to the console if a composite index is needed.
            // This error includes a link to create the index in the Firebase console.
            console.error("Error fetching online users count:", error);
        });

        return () => unsubscribe();
    }, [firestore]);

    return (
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-2 py-1 rounded-full border">
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span>{onlineCount} Online</span>
        </div>
    );
}

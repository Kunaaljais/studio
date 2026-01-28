'use client';
import { createContext, useContext, useState, useEffect, useRef, useCallback, PropsWithChildren } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, doc, addDoc, setDoc, serverTimestamp, getDoc, updateDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { saveFriendToStorage, saveCallToStorage } from '@/lib/local-storage';

type CallState = 'idle' | 'searching' | 'outgoing' | 'incoming' | 'connected' | 'disconnected';
export type AppUser = { id: string; name: string; avatar: string; };

interface CallContextType {
    callState: CallState;
    connectedUser: AppUser | null;
    incomingCall: { callId: string; caller: AppUser } | null;
    isMuted: boolean;
    timer: number;
    findRandomCall: () => Promise<void>;
    startCall: (callee: AppUser) => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => Promise<void>;
    hangup: () => void;
    toggleMute: () => void;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    sendFriendRequest: () => Promise<void>;
    acceptFriendRequest: (request: any) => Promise<void>;
    rejectFriendRequest: (requestId: string) => Promise<void>;
    friendRequests: any[];
}

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCall must be used within a CallProvider');
    }
    return context;
};

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

export const CallProvider = ({ user, children }: PropsWithChildren<{ user: AppUser }>) => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [callState, setCallState] = useState<CallState>('idle');
    const [connectedUser, setConnectedUser] = useState<AppUser | null>(null);
    const [incomingCall, setIncomingCall] = useState<{ callId: string; caller: AppUser } | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [timer, setTimer] = useState(0);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [friendRequests, setFriendRequests] = useState<any[]>([]);
    
    const pc = useRef<RTCPeerConnection | null>(null);
    const callIdRef = useRef<string | null>(null);
    const startTimeRef = useRef<Date | null>(null);
    const callTypeRef = useRef<'incoming' | 'outgoing' | 'random' | null>(null);
    const endCallTimer = useRef<NodeJS.Timeout | null>(null);
    
    const silentAudioContext = useRef<AudioContext | null>(null);
    const silentOscillator = useRef<OscillatorNode | null>(null);

    const callStateRef = useRef(callState);
    useEffect(() => {
        callStateRef.current = callState;
    }, [callState]);

    useEffect(() => {
        if (!firestore || !user?.id) return;
        const userRef = doc(firestore, 'users', user.id);
        updateDoc(userRef, { callState: callState });
    }, [callState, firestore, user?.id]);

    const unsubscribers = useRef<(() => void)[]>([]);

    const startSilentAudio = useCallback(() => {
        if (silentAudioContext.current) return;
        try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            silentAudioContext.current = context;
            const oscillator = context.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(20, context.currentTime); // Low inaudible frequency
            const gainNode = context.createGain();
            gainNode.gain.setValueAtTime(0.001, context.currentTime); // Very low gain
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            oscillator.start();
            silentOscillator.current = oscillator;
        } catch (error) {
            console.error("Could not start silent audio for background playback:", error);
        }
    }, []);

    const stopSilentAudio = useCallback(() => {
        if (silentOscillator.current) {
            silentOscillator.current.stop();
            silentOscillator.current = null;
        }
        if (silentAudioContext.current) {
            silentAudioContext.current.close().catch(console.error);
            silentAudioContext.current = null;
        }
    }, []);

    const cleanupCall = useCallback(() => {
        if (endCallTimer.current) {
            clearTimeout(endCallTimer.current);
            endCallTimer.current = null;
        }
        
        stopSilentAudio();
        
        unsubscribers.current.forEach(unsubscribe => unsubscribe());
        unsubscribers.current = [];

        if (pc.current) {
            pc.current.ontrack = null;
            pc.current.onicecandidate = null;
            pc.current.onconnectionstatechange = null;
            pc.current.close();
            pc.current = null;
        }

        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        setLocalStream(null);
        setRemoteStream(null);
        
        if (callIdRef.current && firestore) {
            try {
                const roomRef = doc(firestore, 'rooms', callIdRef.current);
                deleteDoc(roomRef);
            } catch (error) {
                console.error("Error cleaning up call room:", error);
            }
        }
        
        setCallState('idle');
        setConnectedUser(null);
        setIncomingCall(null);
        setTimer(0);
        callIdRef.current = null;
        startTimeRef.current = null;
        callTypeRef.current = null;

    }, [localStream, firestore, stopSilentAudio]);
    
    const hangup = useCallback(() => {
        if (callState === 'connected' && connectedUser && startTimeRef.current) {
            const duration = Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000);
            if (duration > 0) {
                 const type = callTypeRef.current === 'random' ? (Math.random() > 0.5 ? 'incoming' : 'outgoing') : (callTypeRef.current || 'incoming');
                 saveCallToStorage({ user: connectedUser, duration, date: new Date().toISOString(), type: type });
            }
        }
        cleanupCall();
    }, [callState, connectedUser, cleanupCall]);

    // Listen for incoming calls and friend requests
    useEffect(() => {
        if (!firestore || !user) return;
        
        const callsQuery = query(collection(firestore, 'rooms'), where('calleeId', '==', user.id), where('answered', '==', false));
        const callsUnsubscribe = onSnapshot(callsQuery, (snapshot) => {
            if (!snapshot.empty && callStateRef.current === 'idle') {
                const callDoc = snapshot.docs[0];
                const callData = callDoc.data();
                setIncomingCall({
                    callId: callDoc.id,
                    caller: { id: callData.callerId, name: callData.callerName, avatar: callData.callerAvatar }
                });
                setCallState('incoming');
            }
        });

        const requestsQuery = query(collection(firestore, 'friendRequests'), where('toId', '==', user.id), where('status', '==', 'pending'));
        const requestsUnsubscribe = onSnapshot(requestsQuery, (snapshot) => {
            const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFriendRequests(requests);
        });

        // Listen for updates on sent friend requests
        const sentRequestsQuery = query(collection(firestore, 'friendRequests'), where('fromId', '==', user.id));
        const sentRequestsUnsubscribe = onSnapshot(sentRequestsQuery, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'modified') {
                    const request = change.doc.data();
                    const friendUser = { id: request.toId, name: request.toName, avatar: request.toAvatar };
                    if (request.status === 'accepted') {
                        saveFriendToStorage(friendUser);
                        window.dispatchEvent(new Event('friends-updated'));
                        toast({ title: 'Friend Request Accepted', description: `${friendUser.name} accepted your friend request!` });
                        await deleteDoc(change.doc.ref);
                    } else if (request.status === 'rejected') {
                        toast({ variant: 'destructive', title: 'Friend Request Declined', description: `${friendUser.name} declined your friend request.` });
                        await deleteDoc(change.doc.ref);
                    }
                }
            });
        });
        
        return () => {
            callsUnsubscribe();
            requestsUnsubscribe();
            sentRequestsUnsubscribe();
        };
    }, [firestore, user, toast]);

    const setupPeerConnection = useCallback(async () => {
        if (pc.current) pc.current.close();
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            pc.current = new RTCPeerConnection(servers);
            setLocalStream(stream);
            stream.getTracks().forEach(track => pc.current!.addTrack(track, stream));

            const remote = new MediaStream();
            setRemoteStream(remote);

            pc.current.ontrack = event => {
                event.streams[0].getTracks().forEach(track => remote.addTrack(track));
            };
            
            pc.current.onconnectionstatechange = () => {
                if (pc.current?.connectionState === 'connected') {
                    startSilentAudio();
                    setCallState('connected');
                    startTimeRef.current = new Date();
                    if (endCallTimer.current) {
                        clearTimeout(endCallTimer.current);
                        endCallTimer.current = null;
                    }
                } else if (['disconnected', 'failed', 'closed'].includes(pc.current?.connectionState || '')) {
                    hangup();
                }
            };
        } catch (error) {
            console.error("Failed to get user media", error);
            pc.current = null;
        }
    }, [hangup, startSilentAudio]);
    
    const createCall = useCallback(async (callee?: AppUser, setupDone = false) => {
        if (!firestore || !user) return;

        setCallState(callee ? 'outgoing' : 'searching');
        if (callee) {
             setConnectedUser(callee);
             callTypeRef.current = 'outgoing';
        } else {
             callTypeRef.current = 'random';
        }

        if (!setupDone) await setupPeerConnection();
        if(!pc.current) return;

        const callDocRef = doc(collection(firestore, 'rooms'));
        callIdRef.current = callDocRef.id;
        const callerCandidatesCollection = collection(callDocRef, 'callerCandidates');

        pc.current.onicecandidate = event => {
            event.candidate && addDoc(callerCandidatesCollection, event.candidate.toJSON());
        };

        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);

        await setDoc(callDocRef, {
            offer,
            callerId: user.id,
            callerName: user.name,
            callerAvatar: user.avatar,
            calleeId: callee ? callee.id : null,
            answered: false,
            createdAt: serverTimestamp()
        });

        endCallTimer.current = setTimeout(() => {
            if (callStateRef.current !== 'connected') {
                toast({ variant: 'destructive', title: 'Call unanswered' });
                hangup();
            }
        }, 30000);

        const unsub1 = onSnapshot(callDocRef, (snapshot) => {
            const data = snapshot.data();
            if (!snapshot.exists() && callStateRef.current !== 'idle' && callStateRef.current !== 'disconnected') {
                toast({ variant: 'destructive', title: 'Call Ended', description: 'The other user disconnected.' });
                hangup();
                return;
            }
            if (data?.answer && pc.current && !pc.current.currentRemoteDescription) {
                pc.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        });

        const unsub2 = onSnapshot(collection(callDocRef, 'calleeCandidates'), snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added' && pc.current?.signalingState !== 'closed') {
                    pc.current?.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                }
            });
        });
        unsubscribers.current.push(unsub1, unsub2);
    }, [firestore, user, setupPeerConnection, hangup, toast]);

    const joinCall = useCallback(async (roomId: string, isAccepting: boolean, setupDone = false) => {
         if (!firestore || !user) return;
         callIdRef.current = roomId;
         
         if (!setupDone) await setupPeerConnection();
         if(!pc.current) return;

         const roomRef = doc(firestore, 'rooms', roomId);
         const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');
         pc.current.onicecandidate = event => {
             event.candidate && addDoc(calleeCandidatesCollection, event.candidate.toJSON());
         };

         const roomSnapshot = await getDoc(roomRef);
         if (!roomSnapshot.exists()) {
             toast({ variant: 'destructive', title: 'Call Ended', description: 'This call is no longer available.' });
             return cleanupCall();
         }
         const roomData = roomSnapshot.data();
         
         callTypeRef.current = isAccepting ? 'incoming' : 'random';
         setConnectedUser({id: roomData.callerId, name: roomData.callerName, avatar: roomData.callerAvatar});
         
         await pc.current.setRemoteDescription(new RTCSessionDescription(roomData.offer));
         const answer = await pc.current.createAnswer();
         await pc.current.setLocalDescription(answer);

         await updateDoc(roomRef, { answer, calleeId: user.id, calleeName: user.name, calleeAvatar: user.avatar, answered: true });

         const unsub1 = onSnapshot(roomRef, (snapshot) => {
            if (!snapshot.exists() && callStateRef.current !== 'idle' && callStateRef.current !== 'disconnected') {
                toast({ variant: 'destructive', title: 'Call Ended', description: 'The other user disconnected.' });
                hangup();
                return;
            }
        });

         const unsub2 = onSnapshot(collection(roomRef, 'callerCandidates'), snapshot => {
             snapshot.docChanges().forEach(change => {
                 if (change.type === 'added' && pc.current?.signalingState !== 'closed') {
                     pc.current?.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                 }
             });
         });
         unsubscribers.current.push(unsub1, unsub2);
         
         if (isAccepting) setIncomingCall(null);
    }, [firestore, user, setupPeerConnection, cleanupCall, hangup, toast]);

    const startCall = useCallback((callee: AppUser) => createCall(callee, false), [createCall]);

    const findRandomCall = useCallback(async () => {
        if (!firestore || !user) return;
        setCallState('searching');

        const setupPromise = setupPeerConnection();
        const roomsQuery = query(collection(firestore, 'rooms'), where('answered', '==', false));
        const queryPromise = getDocs(roomsQuery);
        
        const [_, querySnapshot] = await Promise.all([setupPromise, queryPromise]);
        
        if(!pc.current) {
            setCallState('idle'); 
            toast({ variant: 'destructive', title: 'Permission Denied', description: 'Microphone access is required to start a call.' });
            return;
        }

        const availableRooms = querySnapshot.docs
            .map(doc => ({ id: doc.id, data: doc.data() }))
            .filter(room => room.data.callerId !== user.id && !room.data.calleeId);

        if (availableRooms.length > 0) {
            const randomRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
            await joinCall(randomRoom.id, false, true);
        } else {
            await createCall(undefined, true);
        }
    }, [firestore, user, setupPeerConnection, joinCall, createCall, toast]);
    
    const acceptCall = useCallback(() => {
        if (!incomingCall) return;
        joinCall(incomingCall.callId, true, false);
    }, [incomingCall, joinCall]);

    const rejectCall = useCallback(async () => {
        if (incomingCall && firestore) {
            await deleteDoc(doc(firestore, 'rooms', incomingCall.callId));
        }
        setIncomingCall(null);
        setCallState('idle');
    }, [incomingCall, firestore]);

    const sendFriendRequest = useCallback(async () => {
        if (!firestore || !user || !connectedUser) return;

        const requestsRef = collection(firestore, "friendRequests");
        const q1 = query(requestsRef, where('fromId', '==', user.id), where('toId', '==', connectedUser.id));
        const q2 = query(requestsRef, where('fromId', '==', connectedUser.id), where('toId', '==', user.id));

        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

        if (!snap1.empty || !snap2.empty) {
            toast({ variant: 'destructive', title: 'Request already sent or you are already friends.' });
            return;
        }

        await addDoc(collection(firestore, 'friendRequests'), {
            fromId: user.id, fromName: user.name, fromAvatar: user.avatar,
            toId: connectedUser.id, toName: connectedUser.name, toAvatar: connectedUser.avatar,
            status: 'pending', createdAt: serverTimestamp()
        });
        toast({ title: 'Friend Request Sent', description: `Your friend request has been sent to ${connectedUser.name}.` });
    }, [firestore, user, connectedUser, toast]);

    const acceptFriendRequest = useCallback(async (request: any) => {
        if (!firestore) return;
        const friend = { id: request.fromId, name: request.fromName, avatar: request.fromAvatar };
        saveFriendToStorage(friend);
        window.dispatchEvent(new Event('friends-updated'));
        
        const requestRef = doc(firestore, 'friendRequests', request.id);
        await updateDoc(requestRef, { status: 'accepted' });
        
        toast({ title: "Friend Added!", description: `${friend.name} is now your friend.` });
    }, [firestore, toast]);
    
    const rejectFriendRequest = useCallback(async (requestId: string) => {
        if (!firestore) return;
        const requestRef = doc(firestore, 'friendRequests', requestId);
        await updateDoc(requestRef, { status: 'rejected' });
    }, [firestore]);

    const toggleMute = useCallback(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
            setIsMuted(prev => !prev);
        }
    }, [localStream]);
    
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (callState === 'connected') {
            interval = setInterval(() => setTimer(prev => prev + 1), 1000);
        } else {
            setTimer(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [callState]);

    const value = {
        callState, connectedUser, incomingCall, isMuted, timer,
        findRandomCall, startCall, acceptCall, rejectCall, hangup, toggleMute,
        localStream, remoteStream, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, friendRequests
    };

    return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

'use client';
import { createContext, useContext, useState, useEffect, useRef, useCallback, PropsWithChildren, Dispatch, SetStateAction } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, doc, addDoc, setDoc, serverTimestamp, getDoc, updateDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { saveFriendToStorage, saveCallToStorage } from '@/lib/local-storage';

type CallState = 'idle' | 'searching' | 'outgoing' | 'incoming' | 'connected' | 'disconnected';
export type AppUser = { id: string; name: string; avatar: string; };

type FriendRequest = {
    from: AppUser;
    to: AppUser;
};

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
    incomingFriendRequest: FriendRequest | null;
    setIncomingFriendRequest: Dispatch<SetStateAction<FriendRequest | null>>;
    sendFriendRequest: () => void;
    acceptFriendRequest: () => void;
    rejectFriendRequest: () => void;
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
    const [incomingFriendRequest, setIncomingFriendRequest] = useState<FriendRequest | null>(null);
    
    const pc = useRef<RTCPeerConnection | null>(null);
    const callIdRef = useRef<string | null>(null);
    const startTimeRef = useRef<Date | null>(null);
    const callTypeRef = useRef<'incoming' | 'outgoing' | 'random' | null>(null);
    const endCallTimer = useRef<NodeJS.Timeout | null>(null);

    // Unsubscribe listeners
    const unsubscribers = useRef<(() => void)[]>([]);

    const cleanupCall = useCallback(async () => {
        if (endCallTimer.current) {
            clearTimeout(endCallTimer.current);
            endCallTimer.current = null;
        }
        
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
                const roomSnapshot = await getDoc(roomRef);
                if (roomSnapshot.exists()) {
                    await deleteDoc(roomRef);
                }
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
        setIncomingFriendRequest(null);

    }, [localStream, firestore]);
    
    const hangup = useCallback(async () => {
        if (callState === 'connected' && connectedUser && startTimeRef.current) {
            const duration = Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000);
            if (duration > 0) {
                 const type = callTypeRef.current === 'random' ? (Math.random() > 0.5 ? 'incoming' : 'outgoing') : (callTypeRef.current || 'incoming');
                 saveCallToStorage({ user: connectedUser, duration, date: new Date().toISOString(), type: type });
            }
        }
        await cleanupCall();
    }, [callState, connectedUser, cleanupCall]);

    // Listen for incoming calls to this user
    useEffect(() => {
        if (!firestore || !user) return;
        const callsRef = collection(firestore, 'rooms');
        const q = query(callsRef, where('calleeId', '==', user.id), where('answered', '==', false));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty && callState === 'idle') {
                const callDoc = snapshot.docs[0];
                const callData = callDoc.data();
                setIncomingCall({
                    callId: callDoc.id,
                    caller: { id: callData.callerId, name: callData.callerName, avatar: callData.callerAvatar }
                });
                setCallState('incoming');
            }
        });
        unsubscribers.current.push(unsubscribe);
        return () => {
            unsubscribers.current.forEach(unsub => unsub());
        }
    }, [firestore, user, callState]);

    const setupPeerConnection = useCallback(async () => {
        // Ensure cleanup of any previous PC
        if (pc.current) {
          pc.current.close();
        }
        pc.current = new RTCPeerConnection(servers);
        
        // Setup media streams
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);
        stream.getTracks().forEach(track => pc.current!.addTrack(track, stream));

        const remote = new MediaStream();
        setRemoteStream(remote);

        pc.current.ontrack = event => {
            event.streams[0].getTracks().forEach(track => {
                remote.addTrack(track);
            });
        };
        
        pc.current.onconnectionstatechange = () => {
            if (pc.current?.connectionState === 'connected') {
                setCallState('connected');
                startTimeRef.current = new Date();
                 if (endCallTimer.current) {
                    clearTimeout(endCallTimer.current);
                    endCallTimer.current = null;
                }
            } else if (pc.current?.connectionState === 'disconnected' || pc.current?.connectionState === 'failed' || pc.current?.connectionState === 'closed') {
                hangup();
            }
        };
    }, [hangup]);
    
    const createCall = async (callee?: AppUser) => {
        if (!firestore || !user) return;

        setCallState(callee ? 'outgoing' : 'searching');
        if (callee) {
             setConnectedUser(callee);
             callTypeRef.current = 'outgoing';
        } else {
             callTypeRef.current = 'random';
        }

        await setupPeerConnection();
        if(!pc.current) return;

        const callDocRef = doc(collection(firestore, 'rooms'));
        callIdRef.current = callDocRef.id;
        const callerCandidatesCollection = collection(callDocRef, 'callerCandidates');

        pc.current.onicecandidate = event => {
            event.candidate && addDoc(callerCandidatesCollection, event.candidate.toJSON());
        };

        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);

        const callData = {
            offer,
            callerId: user.id,
            callerName: user.name,
            callerAvatar: user.avatar,
            calleeId: callee ? callee.id : null,
            answered: false,
            createdAt: serverTimestamp()
        };
        await setDoc(callDocRef, callData);

        endCallTimer.current = setTimeout(() => {
            if (callStateRef.current !== 'connected') {
                toast({ variant: 'destructive', title: 'Call unanswered' });
                hangup();
            }
        }, 30000);

        const unsub1 = onSnapshot(callDocRef, (snapshot) => {
            if (!snapshot.exists()) {
                if (callStateRef.current !== 'idle') {
                    toast({ variant: 'destructive', title: 'Call Ended', description: 'The other user disconnected.' });
                    hangup();
                }
                return;
            }

            const data = snapshot.data();
            if (data?.answer && pc.current && !pc.current.currentRemoteDescription) {
                pc.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
            if (data?.friendRequest) {
                handleFriendRequest(data.friendRequest);
            }
        });

        const unsub2 = onSnapshot(collection(callDocRef, 'calleeCandidates'), snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    pc.current?.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                }
            });
        });
        unsubscribers.current.push(unsub1, unsub2);
    };

    const startCall = (callee: AppUser) => createCall(callee);

    const findRandomCall = async () => {
        if (!firestore || !user) return;
        setCallState('searching');

        const roomsRef = collection(firestore, 'rooms');
        const q = query(roomsRef, where('calleeId', '==', null), where('answered', '==', false));
        const querySnapshot = await getDocs(q);

        const availableRooms = querySnapshot.docs
            .map(doc => ({ id: doc.id, data: doc.data() }))
            .filter(room => room.data.callerId !== user.id);

        if (availableRooms.length > 0) {
            const randomRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
            await joinCall(randomRoom.id, false);
        } else {
            await createCall();
        }
    };
    
    const joinCall = async (roomId: string, isAccepting: boolean) => {
         if (!firestore || !user) return;
         callIdRef.current = roomId;
         
         await setupPeerConnection();
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
         
         const offerDescription = new RTCSessionDescription(roomData.offer);
         await pc.current.setRemoteDescription(offerDescription);

         const answer = await pc.current.createAnswer();
         await pc.current.setLocalDescription(answer);

         await updateDoc(roomRef, { answer, calleeId: user.id, calleeName: user.name, calleeAvatar: user.avatar, answered: true });

         const unsub1 = onSnapshot(roomRef, (snapshot) => {
            if (!snapshot.exists()) {
                if (callStateRef.current !== 'idle') {
                    toast({ variant: 'destructive', title: 'Call Ended', description: 'The other user disconnected.' });
                    hangup();
                }
                return;
            }
            const data = snapshot.data();
            if (data?.friendRequest) {
                handleFriendRequest(data.friendRequest);
            }
        });

         const unsub2 = onSnapshot(collection(roomRef, 'callerCandidates'), snapshot => {
             snapshot.docChanges().forEach(change => {
                 if (change.type === 'added') {
                     pc.current?.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                 }
             });
         });
         unsubscribers.current.push(unsub1, unsub2);
         
         if (isAccepting) {
            setIncomingCall(null);
         }
    }

    const acceptCall = () => {
        if (!incomingCall) return;
        joinCall(incomingCall.callId, true);
    }

    const rejectCall = async () => {
        if (incomingCall && firestore) {
            await deleteDoc(doc(firestore, 'rooms', incomingCall.callId));
        }
        setIncomingCall(null);
        setCallState('idle');
    };

    const handleFriendRequest = (request: any) => {
        if (!user || !connectedUser) return;
        
        if (request.to === user.id && request.status === 'pending') {
            setIncomingFriendRequest({ from: connectedUser, to: user });
        }
        
        if (request.from === user.id && request.status === 'accepted') {
            saveFriendToStorage(connectedUser);
            window.dispatchEvent(new Event('friends-updated'));
            toast({ title: 'Friend Request Accepted', description: `${connectedUser.name} accepted your friend request!`});
            if (callIdRef.current) {
                updateDoc(doc(firestore, 'rooms', callIdRef.current), { friendRequest: null });
            }
        }

        if (request.from === user.id && request.status === 'rejected') {
            toast({ variant: 'destructive', title: 'Friend Request Declined', description: `${connectedUser.name} declined your friend request.`});
            if (callIdRef.current) {
                updateDoc(doc(firestore, 'rooms', callIdRef.current), { friendRequest: null });
            }
        }
    };

    const sendFriendRequest = async () => {
        if (!callIdRef.current || !firestore || !user || !connectedUser) return;
        const roomRef = doc(firestore, 'rooms', callIdRef.current);
        await updateDoc(roomRef, {
            friendRequest: { from: user.id, to: connectedUser.id, status: 'pending' }
        });
    };

    const acceptFriendRequest = async () => {
        if (!callIdRef.current || !firestore || !incomingFriendRequest) return;
        saveFriendToStorage(incomingFriendRequest.from);
        window.dispatchEvent(new Event('friends-updated'));
        const roomRef = doc(firestore, 'rooms', callIdRef.current);
        await updateDoc(roomRef, { 'friendRequest.status': 'accepted' });
        toast({ title: "Friend Added!", description: `${incomingFriendRequest.from.name} is now your friend.`});
        setIncomingFriendRequest(null);
    };

    const rejectFriendRequest = async () => {
        if (!callIdRef.current || !firestore || !incomingFriendRequest) return;
        const roomRef = doc(firestore, 'rooms', callIdRef.current);
        await updateDoc(roomRef, { 'friendRequest.status': 'rejected' });
        setIncomingFriendRequest(null);
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(prev => !prev);
        }
    };
    
    const callStateRef = useRef(callState);
    useEffect(() => {
        callStateRef.current = callState;
    }, [callState]);

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
        localStream, remoteStream, incomingFriendRequest, setIncomingFriendRequest, sendFriendRequest, acceptFriendRequest, rejectFriendRequest
    };

    return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

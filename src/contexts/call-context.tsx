'use client';
import { createContext, useContext, useState, useEffect, useRef, useCallback, PropsWithChildren, Dispatch, SetStateAction } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, doc, addDoc, setDoc, serverTimestamp, getDoc, updateDoc, getDocs, deleteDoc, limit, orderBy } from 'firebase/firestore';
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
    const unsubscribeCall = useRef<() => void>(() => {});

    const cleanupCall = useCallback(async () => {
        if (pc.current) {
            pc.current.close();
            pc.current = null;
        }

        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }

        unsubscribeCall.current();

        if (callIdRef.current && firestore) {
            const roomRef = doc(firestore, 'rooms', callIdRef.current);
            try {
                const roomSnapshot = await getDoc(roomRef);
                if (roomSnapshot.exists()) {
                    const callerCandidatesSnapshot = await getDocs(collection(roomRef, "callerCandidates"));
                    callerCandidatesSnapshot.forEach(async (d) => await deleteDoc(d.ref));

                    const calleeCandidatesSnapshot = await getDocs(collection(roomRef, "calleeCandidates"));
                    calleeCandidatesSnapshot.forEach(async (d) => await deleteDoc(d.ref));
                    
                    await deleteDoc(roomRef);
                }
            } catch (error) {
                console.error("Error cleaning up call room:", error);
            }
        }
        
        setLocalStream(null);
        setRemoteStream(null);
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
                const callType = callTypeRef.current === 'outgoing' ? 'outgoing' : 'incoming';
                saveCallToStorage({ user: connectedUser, duration, date: new Date().toISOString(), type: callType });
            }
        }
        await cleanupCall();
    }, [callState, connectedUser, cleanupCall]);

    // Listen for incoming calls specifically for the user
    useEffect(() => {
        if (!firestore || !user) return;
        const callsRef = collection(firestore, 'rooms');
        const q = query(callsRef, where('calleeId', '==', user.id), where('answered', '==', false));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                if (callState === 'idle') {
                    const callDoc = snapshot.docs[0];
                    const callData = callDoc.data();
                    setIncomingCall({
                        callId: callDoc.id,
                        caller: { id: callData.callerId, name: callData.callerName, avatar: callData.callerAvatar }
                    });
                    setCallState('incoming');
                }
            } else {
                 if (callState === 'incoming') {
                    setIncomingCall(null);
                    setCallState('idle');
                }
            }
        });
        return () => unsubscribe();
    }, [firestore, user, callState]);

    const setupPeerConnection = async (isCaller: boolean, stream: MediaStream, roomId: string) => {
        pc.current = new RTCPeerConnection(servers);

        stream.getTracks().forEach(track => pc.current!.addTrack(track, stream));
        
        pc.current.ontrack = event => {
            setRemoteStream(event.streams[0]);
        };
        
        pc.current.onconnectionstatechange = () => {
            if (pc.current?.connectionState === 'disconnected' || pc.current?.connectionState === 'failed' || pc.current?.connectionState === 'closed') {
                hangup();
            }
        };

        const roomRef = doc(firestore, 'rooms', roomId);
        const candidatesCollection = collection(roomRef, isCaller ? 'callerCandidates' : 'calleeCandidates');

        pc.current.onicecandidate = event => {
            event.candidate && addDoc(candidatesCollection, event.candidate.toJSON());
        };

        unsubscribeCall.current = onSnapshot(roomRef, (snapshot) => {
            const data = snapshot.data();
            if (!snapshot.exists()) {
                if (callState !== 'idle' && callState !== 'searching') {
                    toast({ variant: 'destructive', title: 'Call Ended', description: 'The other user has disconnected.'});
                    hangup();
                }
                return;
            }
            if (data?.friendRequest) {
                handleFriendRequest(data.friendRequest);
            }
        });

        return roomRef;
    };

    const startCall = async (callee: AppUser) => {
        if (!firestore || !user) return;
        callTypeRef.current = 'outgoing';
        setCallState('outgoing');
        setConnectedUser(callee);
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);

        const callDocRef = doc(collection(firestore, 'rooms'));
        callIdRef.current = callDocRef.id;

        await setupPeerConnection(true, stream, callIdRef.current);
        if(!pc.current) return;

        const offerDescription = await pc.current.createOffer();
        await pc.current.setLocalDescription(offerDescription);

        await setDoc(callDocRef, {
            offer: { sdp: offerDescription.sdp, type: offerDescription.type },
            callerId: user.id, callerName: user.name, callerAvatar: user.avatar,
            calleeId: callee.id, answered: false, createdAt: serverTimestamp()
        });

        const answerUnsub = onSnapshot(callDocRef, async (snapshot) => {
            const data = snapshot.data();
            if (pc.current && !pc.current.currentRemoteDescription && data?.answer) {
                const answerDescription = new RTCSessionDescription(data.answer);
                await pc.current.setRemoteDescription(answerDescription);
                setCallState('connected');
                startTimeRef.current = new Date();
                setConnectedUser(callee);
                answerUnsub(); 
            }
        });

        onSnapshot(collection(callDocRef, 'calleeCandidates'), snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    pc.current!.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                }
            });
        });
    };

    const findRandomCall = async () => {
        if (!firestore || !user) return;
        callTypeRef.current = 'random';
        setCallState('searching');

        const roomsRef = collection(firestore, 'rooms');
        const q = query(roomsRef, where('calleeId', '==', null), limit(10));
        
        const querySnapshot = await getDocs(q);
        const availableRoom = querySnapshot.docs.find(doc => doc.data().callerId !== user.id);

        if (!availableRoom) {
            // No available rooms, create a new one
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setLocalStream(stream);
            const callDocRef = doc(collection(firestore, 'rooms'));
            callIdRef.current = callDocRef.id;

            await setupPeerConnection(true, stream, callIdRef.current);
            if(!pc.current) return;

            const offerDescription = await pc.current.createOffer();
            await pc.current.setLocalDescription(offerDescription);

            await setDoc(callDocRef, {
                offer: { sdp: offerDescription.sdp, type: offerDescription.type },
                callerId: user.id, callerName: user.name, callerAvatar: user.avatar,
                calleeId: null, answered: false, createdAt: serverTimestamp()
            });

            onSnapshot(collection(callDocRef, 'calleeCandidates'), snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') { pc.current!.addIceCandidate(new RTCIceCandidate(change.doc.data())); }
                });
            });
            
            const answerUnsub = onSnapshot(callDocRef, async (snapshot) => {
                const data = snapshot.data();
                if (pc.current && !pc.current.currentRemoteDescription && data?.answer) {
                    const answerDescription = new RTCSessionDescription(data.answer);
                    await pc.current.setRemoteDescription(answerDescription);
                    setCallState('connected');
                    startTimeRef.current = new Date();
                    setConnectedUser({id: data.calleeId, name: data.calleeName, avatar: data.calleeAvatar});
                    answerUnsub();
                }
            });

        } else {
            // Join an existing room
            const roomDoc = availableRoom;
            callIdRef.current = roomDoc.id;
            const roomData = roomDoc.data();
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setLocalStream(stream);

            await setupPeerConnection(false, stream, callIdRef.current);
            if(!pc.current) return;
            
            await pc.current.setRemoteDescription(new RTCSessionDescription(roomData.offer));
            
            const answerDescription = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answerDescription);

            await updateDoc(roomDoc.ref, {
                answer: { type: answerDescription.type, sdp: answerDescription.sdp },
                calleeId: user.id, calleeName: user.name, calleeAvatar: user.avatar, answered: true
            });

            onSnapshot(collection(roomDoc.ref, 'callerCandidates'), snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') { pc.current!.addIceCandidate(new RTCIceCandidate(change.doc.data())); }
                });
            });

            setCallState('connected');
            startTimeRef.current = new Date();
            setConnectedUser({id: roomData.callerId, name: roomData.callerName, avatar: roomData.callerAvatar});
        }
    };
    
    const acceptCall = async () => {
        if (!firestore || !incomingCall || !user) return;
        callTypeRef.current = 'incoming';
        setCallState('connected');
        setConnectedUser(incomingCall.caller);
        callIdRef.current = incomingCall.callId;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);
        
        await setupPeerConnection(false, stream, callIdRef.current);
        if(!pc.current) return;
        
        const callDocRef = doc(firestore, 'rooms', incomingCall.callId);
        const callData = (await getDoc(callDocRef)).data();
        await pc.current.setRemoteDescription(new RTCSessionDescription(callData!.offer));

        const answerDescription = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answerDescription);

        await updateDoc(callDocRef, {
            answer: { type: answerDescription.type, sdp: answerDescription.sdp },
            answered: true
        });

        onSnapshot(collection(callDocRef, 'callerCandidates'), snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') { pc.current!.addIceCandidate(new RTCIceCandidate(change.doc.data())); }
            });
        });

        startTimeRef.current = new Date();
        setIncomingCall(null);
    };

    const rejectCall = async () => {
        if (incomingCall && firestore) {
            const roomRef = doc(firestore, 'rooms', incomingCall.callId);
            await deleteDoc(roomRef);
        }
        setIncomingCall(null);
        setCallState('idle');
    };

    // Friend Request Logic
    const sendFriendRequest = async () => {
        if (!callIdRef.current || !firestore || !user || !connectedUser) return;
        const roomRef = doc(firestore, 'rooms', callIdRef.current);
        await updateDoc(roomRef, {
            friendRequest: { from: user.id, to: connectedUser.id, status: 'pending' }
        });
    };

    const handleFriendRequest = (request: any) => {
        if (!user || !connectedUser) return;
        
        // This is a request for me
        if (request.to === user.id && request.status === 'pending') {
            setIncomingFriendRequest({ from: connectedUser, to: user });
        }
        
        // My request was accepted
        if (request.from === user.id && request.status === 'accepted') {
            saveFriendToStorage(connectedUser);
            toast({ title: 'Friend Request Accepted', description: `${connectedUser.name} accepted your friend request!`});
            updateDoc(doc(firestore, 'rooms', callIdRef.current!), { friendRequest: null });
        }

        // My request was rejected
        if (request.from === user.id && request.status === 'rejected') {
            toast({ variant: 'destructive', title: 'Friend Request Declined', description: `${connectedUser.name} declined your friend request.`});
            updateDoc(doc(firestore, 'rooms', callIdRef.current!), { friendRequest: null });
        }
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
    
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (callState === 'connected') {
            interval = setInterval(() => setTimer(prev => prev + 1), 1000);
        } else if (interval) {
            clearInterval(interval);
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

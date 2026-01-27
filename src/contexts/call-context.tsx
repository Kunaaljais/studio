'use client';
import { createContext, useContext, useState, useEffect, useRef, useCallback, PropsWithChildren } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, doc, addDoc, serverTimestamp, getDoc, updateDoc, getDocs, deleteDoc } from 'firebase/firestore';

type CallState = 'idle' | 'outgoing' | 'incoming' | 'connected' | 'disconnected';
type AppUser = { id: string; name: string; avatar: string; };

interface CallContextType {
    callState: CallState;
    connectedUser: AppUser | null;
    incomingCall: { callId: string; caller: AppUser } | null;
    isMuted: boolean;
    timer: number;
    startCall: (callee: AppUser) => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => Promise<void>;
    hangup: () => void;
    toggleMute: () => void;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
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

export const CallProvider = ({ user, children }: PropsWithChildren<{ user: AppUser | null }>) => {
    const firestore = useFirestore();
    const [callState, setCallState] = useState<CallState>('idle');
    const [connectedUser, setConnectedUser] = useState<AppUser | null>(null);
    const [incomingCall, setIncomingCall] = useState<{ callId: string; caller: AppUser } | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [timer, setTimer] = useState(0);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    
    const pc = useRef<RTCPeerConnection | null>(null);
    const callIdRef = useRef<string | null>(null);
    const startTimeRef = useRef<Date | null>(null);
    const callTypeRef = useRef<'incoming' | 'outgoing' | null>(null);

    const hangup = useCallback(async () => {
        if (pc.current) {
            pc.current.close();
            pc.current = null;
        }

        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        setRemoteStream(null);

        if (callIdRef.current && firestore) {
            const roomRef = doc(firestore, 'rooms', callIdRef.current);
            const roomSnapshot = await getDoc(roomRef);
            if (roomSnapshot.exists()) {
                const callerCandidatesSnapshot = await getDocs(collection(roomRef, "callerCandidates"));
                callerCandidatesSnapshot.forEach(async (doc) => await deleteDoc(doc.ref));

                const calleeCandidatesSnapshot = await getDocs(collection(roomRef, "calleeCandidates"));
                calleeCandidatesSnapshot.forEach(async (doc) => await deleteDoc(doc.ref));

                await deleteDoc(roomRef);
            }
        }
        
        if (callState === 'connected' && firestore && user && connectedUser && startTimeRef.current) {
            const duration = Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000);
            if (duration > 0) {
                const caller = callTypeRef.current === 'outgoing' ? user : connectedUser;
                const callee = callTypeRef.current === 'outgoing' ? connectedUser : user;
                 const callData = {
                    callerId: caller.id,
                    callerName: caller.name,
                    callerAvatar: caller.avatar,
                    calleeId: callee.id,
                    calleeName: callee.name,
                    calleeAvatar: callee.avatar,
                    startedAt: serverTimestamp(),
                    duration: duration,
                };
                 await addDoc(collection(firestore, `users/${user.id}/calls`), callData);
                 await addDoc(collection(firestore, `users/${connectedUser.id}/calls`), callData);
            }
        }

        setCallState('idle');
        setConnectedUser(null);
        setIncomingCall(null);
        setTimer(0);
        callIdRef.current = null;
        startTimeRef.current = null;
        callTypeRef.current = null;

    }, [localStream, firestore, callState, user, connectedUser]);

    useEffect(() => {
        if (!firestore || !user) return;
        const callsRef = collection(firestore, 'rooms');
        const q = query(callsRef, where('calleeId', '==', user.id), where('answered', '==', false));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const callDoc = snapshot.docs[0];
                const callData = callDoc.data();
                if (callState === 'idle') {
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

    const startCall = async (callee: AppUser) => {
        if (!firestore || !user) return;
        callTypeRef.current = 'outgoing';
        setCallState('outgoing');
        setConnectedUser(callee);
        pc.current = new RTCPeerConnection(servers);
        
        const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        stream.getTracks().forEach(track => pc.current!.addTrack(track, stream));
        setLocalStream(stream);
        
        pc.current.ontrack = event => {
            setRemoteStream(event.streams[0]);
        };
        
        pc.current.onconnectionstatechange = () => {
            if (pc.current?.connectionState === 'disconnected' || pc.current?.connectionState === 'failed' || pc.current?.connectionState === 'closed') {
                hangup();
            }
        }

        const callDocRef = doc(collection(firestore, 'rooms'));
        callIdRef.current = callDocRef.id;
        const offerCandidates = collection(callDocRef, 'callerCandidates');

        pc.current.onicecandidate = event => {
            event.candidate && addDoc(offerCandidates, event.candidate.toJSON());
        };

        const offerDescription = await pc.current.createOffer();
        await pc.current.setLocalDescription(offerDescription);

        await setDoc(callDocRef, {
            offer: { sdp: offerDescription.sdp, type: offerDescription.type },
            callerId: user.id, callerName: user.name, callerAvatar: user.avatar,
            calleeId: callee.id, answered: false
        });

        onSnapshot(callDocRef, (snapshot) => {
            const data = snapshot.data();
            if (!pc.current?.currentRemoteDescription && data?.answer) {
                const answerDescription = new RTCSessionDescription(data.answer);
                pc.current.setRemoteDescription(answerDescription);
                setCallState('connected');
                startTimeRef.current = new Date();
            }
            if (!snapshot.exists()) {
                if(callState !== 'idle') hangup();
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

    const acceptCall = async () => {
        if (!firestore || !incomingCall || !user) return;
        callTypeRef.current = 'incoming';
        setConnectedUser(incomingCall.caller);
        setCallState('connected');

        pc.current = new RTCPeerConnection(servers);
        callIdRef.current = incomingCall.callId;

        const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        stream.getTracks().forEach(track => pc.current!.addTrack(track, stream));
        setLocalStream(stream);
        
        pc.current.ontrack = event => {
            setRemoteStream(event.streams[0]);
        };

        pc.current.onconnectionstatechange = () => {
            if (pc.current?.connectionState === 'disconnected' || pc.current?.connectionState === 'failed' || pc.current?.connectionState === 'closed') {
                hangup();
            }
        }
        
        const callDocRef = doc(firestore, 'rooms', incomingCall.callId);
        const answerCandidates = collection(callDocRef, 'calleeCandidates');
        pc.current.onicecandidate = event => {
            event.candidate && addDoc(answerCandidates, event.candidate.toJSON());
        };

        const callData = (await getDoc(callDocRef)).data();
        await pc.current.setRemoteDescription(new RTCSessionDescription(callData!.offer));

        const answerDescription = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answerDescription);

        await updateDoc(callDocRef, {
            answer: { type: answerDescription.type, sdp: answerDescription.sdp },
            calleeName: user.name, calleeAvatar: user.avatar, answered: true
        });

        onSnapshot(collection(callDocRef, 'callerCandidates'), snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    pc.current!.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                }
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
        startCall, acceptCall, rejectCall, hangup, toggleMute,
        localStream, remoteStream
    };

    return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

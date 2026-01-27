"use client";

import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  limit,
  serverTimestamp,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { type Firestore } from "firebase/firestore";
import { type User } from "firebase/auth";

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;
let callId: string | null = null;
let onHangupCallback: (() => void) | null = null;

export async function createOrJoinRoom(
  firestore: Firestore,
  user: User,
  onConnected: (peer: any, callId: string) => void,
  onHangup: () => void,
  localVideoRef: React.RefObject<HTMLAudioElement>,
  remoteVideoRef: React.RefObject<HTMLAudioElement>
) {
    onHangupCallback = onHangup;
    const roomsRef = collection(firestore, "rooms");
    const q = query(roomsRef, where("answered", "==", false), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        await createRoom(firestore, user, onConnected, localVideoRef, remoteVideoRef);
    } else {
        const room = snapshot.docs[0];
        await joinRoom(firestore, user, room.id, onConnected, localVideoRef, remoteVideoRef);
    }
}

async function createRoom(
  firestore: Firestore,
  user: User,
  onConnected: (peer: any, callId: string) => void,
  localVideoRef: React.RefObject<HTMLAudioElement>,
  remoteVideoRef: React.RefObject<HTMLAudioElement>
) {
  pc = new RTCPeerConnection(servers);
  const roomRef = doc(collection(firestore, "rooms"));
  callId = roomRef.id;

  await setupStreams(localVideoRef, remoteVideoRef);
  registerPeerConnectionListeners(onHangupCallback);

  if (!pc || !localStream) {
    console.error("Peer connection or local stream not initialized!");
    return;
  }

  localStream.getTracks().forEach((track) => {
    pc!.addTrack(track, localStream!);
  });

  const callerCandidatesCollection = collection(roomRef, "callerCandidates");
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(callerCandidatesCollection, event.candidate.toJSON());
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const roomWithOffer = {
    offer: {
      type: offer.type,
      sdp: offer.sdp,
    },
    callerId: user.uid,
    callerName: user.displayName,
    callerAvatar: user.photoURL,
    createdAt: serverTimestamp(),
    answered: false,
  };
  await setDoc(roomRef, roomWithOffer);

  onSnapshot(roomRef, (snapshot) => {
    const data = snapshot.data();
    if (!pc?.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc?.setRemoteDescription(answerDescription);
    }
  });

  const calleeCandidatesCollection = collection(roomRef, "calleeCandidates");
  onSnapshot(calleeCandidatesCollection, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        let data = change.doc.data();
        await pc?.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });

   pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
        remoteStream?.addTrack(track);
    });
  };
}

async function joinRoom(
  firestore: Firestore,
  user: User,
  roomId: string,
  onConnected: (peer: any, callId:string) => void,
  localVideoRef: React.RefObject<HTMLAudioElement>,
  remoteVideoRef: React.RefObject<HTMLAudioElement>
) {
  const roomRef = doc(firestore, "rooms", roomId);
  const roomSnapshot = await getDoc(roomRef);
  if (!roomSnapshot.exists()) return;
  
  pc = new RTCPeerConnection(servers);
  callId = roomId;

  await setupStreams(localVideoRef, remoteVideoRef);
  registerPeerConnectionListeners(onHangupCallback);

  if (!pc || !localStream) {
    console.error("Peer connection or local stream not initialized!");
    return;
  }
  
  const callerData = roomSnapshot.data();
  onConnected({id: callerData?.callerId, name: callerData?.callerName, avatar: callerData?.callerAvatar}, roomId);

  localStream.getTracks().forEach((track) => {
    pc!.addTrack(track, localStream!);
  });

  const calleeCandidatesCollection = collection(roomRef, "calleeCandidates");
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(calleeCandidatesCollection, event.candidate.toJSON());
    }
  };

  const offer = roomSnapshot.data()?.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  const roomWithAnswer = {
    answer: {
      type: answer.type,
      sdp: answer.sdp,
    },
    answered: true,
  };
  await setDoc(roomRef, roomWithAnswer, { merge: true });

  const callerCandidatesCollection = collection(roomRef, "callerCandidates");
  onSnapshot(callerCandidatesCollection, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        let data = change.doc.data();
        await pc?.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });

   pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
        remoteStream?.addTrack(track);
    });
  };
}

async function setupStreams(
  localVideoRef: React.RefObject<HTMLAudioElement>,
  remoteVideoRef: React.RefObject<HTMLAudioElement>
) {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: true,
  });
  remoteStream = new MediaStream();

  if (localVideoRef.current) {
    localVideoRef.current.srcObject = localStream;
  }
  if (remoteVideoRef.current) {
    remoteVideoRef.current.srcObject = remoteStream;
  }
}

export async function hangup(currentCallId: string | null) {
  if (pc) {
    pc.close();
    pc = null;
  }
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
  }
  if (remoteStream) {
    remoteStream.getTracks().forEach((track) => track.stop());
  }
  localStream = null;
  remoteStream = null;

  if (currentCallId) {
    const firestore = (await import('../firebase')).firestore;
    const roomRef = doc(firestore, "rooms", currentCallId);
    const roomSnapshot = await getDoc(roomRef);
    if (roomSnapshot.exists()) {
        const callerCandidatesQuery = query(collection(roomRef, "callerCandidates"));
        const calleeCandidatesQuery = query(collection(roomRef, "calleeCandidates"));
        
        const callerCandidatesSnapshot = await getDocs(callerCandidatesQuery);
        callerCandidatesSnapshot.forEach(async (doc) => await deleteDoc(doc.ref));

        const calleeCandidatesSnapshot = await getDocs(calleeCandidatesQuery);
        calleeCandidatesSnapshot.forEach(async (doc) => await deleteDoc(doc.ref));

        await deleteDoc(roomRef);
    }
  }

  callId = null;
  onHangupCallback = null;
}

export function toggleMute(isMuted: boolean) {
  if (localStream) {
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
    });
  }
}

function registerPeerConnectionListeners(onHangup: (()=>void) | null) {
    if (!pc) return;
  pc.addEventListener('icegatheringstatechange', () => {
    console.log(`ICE gathering state changed: ${pc?.iceGatheringState}`);
  });

  pc.addEventListener('connectionstatechange', () => {
    console.log(`Connection state change: ${pc?.connectionState}`);
    if (pc?.connectionState === 'disconnected' || pc?.connectionState === 'failed' || pc?.connectionState === 'closed') {
        onHangup?.();
    }
  });

  pc.addEventListener('signalingstatechange', () => {
    console.log(`Signaling state change: ${pc?.signalingState}`);
  });

  pc.addEventListener('iceconnectionstatechange ', () => {
    console.log(
      `ICE connection state change: ${pc?.iceConnectionState}`);
  });
}

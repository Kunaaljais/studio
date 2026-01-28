
'use client';

import type { Friend } from './data';

export type Call = {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string;
    country?: string;
    countryCode?: string;
  };
  duration: number;
  date: string; // ISO string
  type: 'incoming' | 'outgoing';
};

const FRIENDS_KEY = 'randomtalk_friends_v1';
const CALL_HISTORY_KEY = 'randomtalk_call_history_v1';
const MAX_HISTORY_ITEMS = 50;


// Friends
export const getFriendsFromStorage = (): Friend[] => {
  if (typeof window === 'undefined') return [];
  try {
    const friendsJson = localStorage.getItem(FRIENDS_KEY);
    return friendsJson ? JSON.parse(friendsJson) : [];
  } catch (error) {
    console.error("Error parsing friends from localStorage", error);
    return [];
  }
};

export const saveFriendToStorage = (friend: Friend) => {
  if (typeof window === 'undefined') return;
  const friends = getFriendsFromStorage();
  if (!friends.find(f => f.id === friend.id)) {
    const newFriends = [...friends, friend];
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(newFriends));
  }
};

export const removeFriendFromStorage = (friendId: string) => {
  if (typeof window === 'undefined') return;
  const friends = getFriendsFromStorage();
  const newFriends = friends.filter(f => f.id !== friendId);
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(newFriends));
};


// Call History
export const getCallHistoryFromStorage = (): Call[] => {
  if (typeof window === 'undefined') return [];
  try {
    const historyJson = localStorage.getItem(CALL_HISTORY_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error("Error parsing call history from localStorage", error);
    return [];
  }
};

export const saveCallToStorage = (call: Omit<Call, 'id'>) => {
  if (typeof window === 'undefined') return;
  const history = getCallHistoryFromStorage();
  const newCall = { ...call, id: new Date().toISOString() + Math.random() };
  // Add new call and slice to keep the history at a reasonable length
  const newHistory = [newCall, ...history].slice(0, MAX_HISTORY_ITEMS);
  localStorage.setItem(CALL_HISTORY_KEY, JSON.stringify(newHistory));
};

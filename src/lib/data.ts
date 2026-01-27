export type Call = {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  duration: string;
  date: string;
};

export type Friend = {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
};

export const callHistory: Call[] = [
  {
    id: '1',
    user: { id: 'u1', name: 'User #2843', avatar: "https://picsum.photos/seed/101/200/200" },
    duration: '5m 32s',
    date: 'Yesterday',
  },
  {
    id: '2',
    user: { id: 'u2', name: 'User #9123', avatar: "https://picsum.photos/seed/102/200/200" },
    duration: '12m 10s',
    date: 'Yesterday',
  },
  {
    id: '3',
    user: { id: 'u3', name: 'User #5819', avatar: "https://picsum.photos/seed/103/200/200" },
    duration: '0m 45s',
    date: '2 days ago',
  },
  {
    id: '4',
    user: { id: 'u4', name: 'User #7721', avatar: "https://picsum.photos/seed/104/200/200" },
    duration: '23m 02s',
    date: '3 days ago',
  },
];

export const friends: Friend[] = [
  { id: 'f1', name: 'User #9123', avatar: "https://picsum.photos/seed/102/200/200", online: true },
  { id: 'f2', name: 'User #7721', avatar: "https://picsum.photos/seed/104/200/200", online: false },
  { id: 'f3', name: 'User #4201', avatar: "https://picsum.photos/seed/105/200/200", online: true },
];

export const generateRandomUser = () => {
    // This function will only be called on the client, so Math.random is safe.
    const randomId = Math.floor(Math.random() * 9000) + 1000;
    const avatarId = Math.floor(Math.random() * 6) + 101;
    return {
        id: `u${randomId}`,
        name: `User #${randomId}`,
        avatar: `https://picsum.photos/seed/${avatarId}/200/200`,
    }
}

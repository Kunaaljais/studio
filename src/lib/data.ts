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

export const callHistory: Call[] = [];

export const friends: Friend[] = [];

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

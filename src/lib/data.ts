export type Friend = {
  id: string;
  name: string;
  avatar: string;
};

export const generateRandomUser = () => {
    // This function will only be called on the client, so Math.random is safe.
    const randomId = Math.floor(Math.random() * 9000) + 1000;
    const avatarId = Math.floor(Math.random() * 100) + 1;
    return {
        id: `u${randomId}`,
        name: `User #${randomId}`,
        avatar: `https://picsum.photos/seed/${avatarId}/200/200`,
    }
}

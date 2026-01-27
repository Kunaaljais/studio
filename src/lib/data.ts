export type Friend = {
  id: string;
  name: string;
  avatar: string;
};

export const generateRandomUser = () => {
    // This function will only be called on the client, so Math.random is safe.
    const randomId = Math.floor(Math.random() * 9000) + 1000;
    return {
        id: `u${randomId}`,
        name: `User #${randomId}`,
        avatar: ``,
    }
}

export type Friend = {
  id: string;
  name: string;
  avatar: string;
};

export type AppUser = {
  id: string;
  name: string;
  avatar: string;
  interests?: string[];
};

export const generateRandomUser = (): AppUser => {
    // This function will only be called on the client, so Math.random is safe.
    const randomId = Math.floor(Math.random() * 9000) + 1000;
    return {
        id: `u${randomId}`,
        name: `User #${randomId}`,
        avatar: ``,
        interests: [],
    }
}

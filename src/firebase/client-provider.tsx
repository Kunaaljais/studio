'use client';

// The content of this file is an implementation detail and may vary depending on the exact
// nature of the scaffolded files. This is a representative example.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { type FirebaseApp } from 'firebase/app';
import { type Firestore } from 'firebase/firestore';

import { initializeFirebase } from './index';

type FirebaseContextValue = {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
};

const FirebaseContext = createContext<FirebaseContextValue>({
  firebaseApp: null,
  firestore: null,
});

export function FirebaseClientProvider(props: PropsWithChildren) {
  const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);
  const [firestore, setFirestore] = useState<Firestore | null>(null);

  useEffect(() => {
    const { firebaseApp, firestore } = initializeFirebase();
    setFirebaseApp(firebaseApp);
    setFirestore(firestore);
  }, []);

  const value = useMemo(
    () => ({
      firebaseApp,
      firestore,
    }),
    [firebaseApp, firestore]
  );

  return (
    <FirebaseContext.Provider value={value}>
      {props.children}
    </FirebaseContext.Provider>
  );
}

export const useFirebaseApp = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error(
      'useFirebaseApp must be used within a FirebaseProvider.'
    );
  }
  return context.firebaseApp;
};

export const useFirestore = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error(
      'useFirestore must be used within a FirebaseProvider.'
    );
  }
  return context.firestore;
};

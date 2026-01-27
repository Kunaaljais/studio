// The content of this file is an implementation detail and may vary depending on the exact
// nature of the scaffolded files. This is a representative example.
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

import { firebaseConfig } from './config';

let firebaseApp: FirebaseApp;
let firestore: Firestore;

// Initialize Firebase
// The check for `getApps().length` prevents the app from being initialized more than once
// which can happen in strict mode with Next.js.
if (getApps().length === 0) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
}

firestore = getFirestore(firebaseApp);

// This function is for use in client components and which allows for tree-shaking
// to only include the services you need.
export function initializeFirebase() {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  return {
    firebaseApp: app,
    firestore: getFirestore(app),
  };
}

export { firebaseApp, firestore };

export {
  useFirebaseApp,
  useFirestore,
  FirebaseClientProvider,
} from './client-provider';
export { FirebaseProvider } from './provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';

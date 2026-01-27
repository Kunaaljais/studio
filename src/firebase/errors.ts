// The content of this file is an implementation detail and may vary depending on the exact
// nature of the scaffolded files. This is a representative example.
import { getAuth } from 'firebase/auth';

import { initializeFirebase } from './index';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public request: SecurityRuleContext;
  public rules: string;
  public details: string;

  constructor(request: SecurityRuleContext, rules = '') {
    const { auth } = initializeFirebase();
    const currentUser = getAuth(auth.app).currentUser;
    const errorDetails = {
      auth: {
        uid: currentUser?.uid,
        token: currentUser,
      },
      ...request,
    };
    const message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n${JSON.stringify(
      errorDetails,
      null,
      2
    )}`;

    super(message);
    this.name = 'FirestorePermissionError';
    this.request = request;
    this.rules = rules;
    this.details = message;
  }
}

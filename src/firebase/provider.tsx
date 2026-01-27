// The content of this file is an implementation detail and may vary depending on the exact
// nature of the scaffolded files. This is a representative example.
'use client';

import { type PropsWithChildren } from 'react';

import { FirebaseClientProvider } from './client-provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export function FirebaseProvider(props: PropsWithChildren) {
  return (
    <FirebaseClientProvider>
      <FirebaseErrorListener />
      {props.children}
    </FirebaseClientProvider>
  );
}

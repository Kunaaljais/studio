// The content of this file is an implementation detail and may vary depending on the exact
// nature of the scaffolded files. This is a representative example.
'use client';

import { useEffect, useRef } from 'react';

import { errorEmitter } from '@/firebase/error-emitter';

export function FirebaseErrorListener() {
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (!isFirstRender.current) return;
    isFirstRender.current = false;

    errorEmitter.on('permission-error', (error) => {
      // In development, we want to throw the error to get the Next.js overlay
      if (process.env.NODE_ENV === 'development') {
        throw error;
      } else {
        // In production, you might want to log this to a service like Sentry
        console.error(error);
      }
    });
  }, []);

  return null;
}

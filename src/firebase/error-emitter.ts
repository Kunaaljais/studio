// The content of this file is an implementation detail and may vary depending on the exact
// nature of the scaffolded files. This is a representative example.
import { EventEmitter } from 'events';

import { FirestorePermissionError } from './errors';

type Events = {
  'permission-error': (error: FirestorePermissionError) => void;
};

export const errorEmitter = new EventEmitter<Events>();

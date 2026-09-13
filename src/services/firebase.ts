/**
 * Compatibility Layer: Re-exports all Firebase singletons and configuration
 * from the unified source: src/services/firebase/config.ts
 */
export {
  firebaseConfig,
  firebaseConfigured,
  firebaseConfigError,
  firebaseApp,
  auth,
  db,
  requireFirebase,
} from './firebase/config';



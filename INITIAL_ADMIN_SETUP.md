# Initial Admin Setup

The first account is not created by an open client-side sign-up flow. The application calls the callable Cloud Function `createInitialAdmin`.

## Bootstrap behavior

1. The function checks `_system/bootstrap`.
2. A Firestore transaction claims bootstrap, preventing two simultaneous first-admin creations.
3. The function creates the Firebase Authentication user using the deterministic internal email derived from the normalized username.
4. It writes `users/{uid}` with `role = ADMIN`, `active = true`, `username`, `usernameLower`, and a hash of the one-time recovery code.
5. It creates `usernames/{usernameLower}` as the unique mapping.
6. It marks `_system/bootstrap` as `COMPLETED`.
7. The raw recovery code is returned once to the setup screen and is never written to Firestore.

If the bootstrap has completed, the setup screen is unavailable. A normal user cannot create an ADMIN account from the client.

## Login

The user enters `username + password`. The frontend calls `resolveUsername`, which returns the internal Firebase Authentication email without exposing it in the UI. After Firebase sign-in, the application reads `users/{uid}`, verifies `active`, and only then opens the application.

## Recovery

The recovery screen accepts username, one-time recovery code, and a new password. The callable function compares a SHA-256 hash and then changes the Firebase Authentication password using Admin SDK. The raw code is cleared after successful use.

## Deployment requirement

The callable functions must be deployed to the `solimedical-new` Firebase project before the first setup can run. No Admin SDK key is stored in the frontend or repository. Deploy from an authenticated Firebase CLI session:

```bash
firebase deploy --only functions,firestore:rules
```

The current sandbox has no Firebase CLI login, so deployment was not performed automatically.

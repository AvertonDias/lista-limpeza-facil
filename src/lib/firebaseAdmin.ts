import admin from 'firebase-admin';

// This file only exports the admin instance.
// Initialization is handled in the flows that need it (e.g., notify-on-update.ts)
// to ensure it runs correctly in both local dev and deployed environments.

export { admin };

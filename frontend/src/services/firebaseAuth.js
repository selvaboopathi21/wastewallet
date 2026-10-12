// Firebase Authentication Service with Google OAuth Provider and Seamless Demo Fallback
// Supports both official Firebase Web SDK (via VITE_FIREBASE_* env vars) and Google Sign-In popup

let firebaseApp = null;
let firebaseAuth = null;
let googleProvider = null;

export const initFirebase = async () => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (apiKey && authDomain && projectId) {
    try {
      const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
      const { getAuth, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');

      if (!getApps().length) {
        firebaseApp = initializeApp({
          apiKey,
          authDomain,
          projectId,
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId: import.meta.env.VITE_FIREBASE_APP_ID,
        });
      }
      firebaseAuth = getAuth(firebaseApp);
      googleProvider = new GoogleAuthProvider();
      return true;
    } catch (err) {
      console.warn('Firebase SDK dynamic load skipped:', err.message);
      return false;
    }
  }
  return false;
};

// Sign in with Google Popup
export const signInWithGooglePopup = async () => {
  const isConfigured = await initFirebase();

  if (isConfigured && firebaseAuth && googleProvider) {
    try {
      const { signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const user = result.user;
      return {
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        googleId: user.uid,
        photoURL: user.photoURL,
      };
    } catch (err) {
      // If user closed popup or domain not allowed, rethrow with friendly message
      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('Google sign-in popup was closed before completing.');
      }
      throw err;
    }
  }

  // If Firebase credentials are not yet added to .env, return null to trigger Google Account selector UI
  return null;
};

export default {
  initFirebase,
  signInWithGooglePopup,
};

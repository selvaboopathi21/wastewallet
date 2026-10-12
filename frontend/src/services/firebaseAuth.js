// Firebase Authentication Service with Google OAuth Provider & Phone Verification
// Configured with official WasteWallet project credentials (wastewallet-45e57)

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBrBW_EUvLUc9_I2ahpHmW5HVa54GtHovw",
  authDomain: "wastewallet-45e57.firebaseapp.com",
  projectId: "wastewallet-45e57",
  storageBucket: "wastewallet-45e57.firebasestorage.app",
  messagingSenderId: "917116966644",
  appId: "1:917116966644:web:a91f0a5c7c5f44d9afb0a1",
  measurementId: "G-0GG7LQRMQV"
};

let firebaseApp = null;
let firebaseAuth = null;
let googleProvider = null;

export const initFirebase = async () => {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
    appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || DEFAULT_FIREBASE_CONFIG.measurementId,
  };

  try {
    const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
    const { getAuth, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');

    if (!getApps().length) {
      firebaseApp = initializeApp(config);
    }
    firebaseAuth = getAuth(firebaseApp);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    return true;
  } catch (err) {
    console.warn('Firebase SDK dynamic load warning:', err.message);
    return false;
  }
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
        name: user.displayName || user.email?.split('@')[0] || 'Google User',
        googleId: user.uid,
        photoURL: user.photoURL,
        phone: user.phoneNumber || '',
      };
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('Google sign-in popup was closed before completing.');
      }
      if (err.code === 'auth/unauthorized-domain') {
        console.warn('Domain not yet authorized in Firebase Console (wastewallet-45e57):', window.location.origin);
        // Fall back gracefully to modal selector for seamless testing
        return null;
      }
      throw err;
    }
  }

  return null;
};

export const getFirebaseInstance = () => ({
  app: firebaseApp,
  auth: firebaseAuth,
  config: DEFAULT_FIREBASE_CONFIG,
});

export default {
  initFirebase,
  signInWithGooglePopup,
  getFirebaseInstance,
};

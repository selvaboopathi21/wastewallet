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

// 1. Sign in with Google Popup
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
        return null;
      }
      throw err;
    }
  }

  return null;
};

// 2. Real Phone SMS OTP via Firebase Phone Authentication
export const sendFirebasePhoneOtp = async (phoneNumber, containerId = 'recaptcha-container', timeoutMs = 2500) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Firebase SMS verification timed out')), timeoutMs)
  );

  const smsPromise = (async () => {
    const isConfigured = await initFirebase();
    if (!isConfigured || !firebaseAuth) {
      throw new Error('Firebase Auth not initialized or domain unverified');
    }

    const { RecaptchaVerifier, signInWithPhoneNumber } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');

    // Format international +91
    const digits = phoneNumber.replace(/\D/g, '');
    const formattedPhone = digits.startsWith('91') && digits.length === 12 
      ? `+${digits}` 
      : `+91${digits.slice(-10)}`;

    // Clear any previous recaptcha
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch {}
      window.recaptchaVerifier = null;
    }

    // Ensure container exists
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }

    window.recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, containerId, {
      size: 'invisible',
      callback: () => {
        console.log('Firebase reCAPTCHA solved successfully');
      },
      'expired-callback': () => {
        console.warn('Firebase reCAPTCHA expired');
      }
    });

    const confirmationResult = await signInWithPhoneNumber(firebaseAuth, formattedPhone, window.recaptchaVerifier);
    console.log(`📱 Real Firebase SMS dispatched to ${formattedPhone}`);
    return {
      success: true,
      confirmationResult,
      phone: formattedPhone,
    };
  })();

  try {
    return await Promise.race([smsPromise, timeoutPromise]);
  } catch (err) {
    console.warn('Firebase Phone Auth SMS attempt:', err.message);
    return {
      success: false,
      error: err,
      code: err.code || 'timeout',
      message: err.message,
    };
  }
};

export const getFirebaseInstance = () => ({
  app: firebaseApp,
  auth: firebaseAuth,
  config: DEFAULT_FIREBASE_CONFIG,
});

export default {
  initFirebase,
  signInWithGooglePopup,
  sendFirebasePhoneOtp,
  getFirebaseInstance,
};

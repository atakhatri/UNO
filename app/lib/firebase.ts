import { initializeApp, getApp, getApps } from "firebase/app";
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged,
    User,
} from "firebase/auth";
import {
    getFirestore,
    setLogLevel,
    doc,
    collection,
    onSnapshot,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion,
    enableNetwork,
} from "firebase/firestore";

// --- 1. Firebase Configuration ---

// Import the functions you need from the SDKs you need
import { getAnalytics, isSupported } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID // Optional
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics;
if (typeof window !== 'undefined') { // Check if window exists (client-side)
    isSupported().then((supported) => {
        if (supported) {
            analytics = getAnalytics(app);
            console.log("Firebase Analytics initialized.");
        } else {
            console.log("Firebase Analytics is not supported in this environment.");
        }
    });
}
// These global variables are provided by the environment.
declare const __firebase_config: string;
declare const __initial_auth_token: string;
declare const __app_id: string;


// --- 2. App Initialization ---
const auth = getAuth(app);
const db = getFirestore(app);

// Enable debug logging for Firestore
setLogLevel("debug");

// Ensure Firestore network is enabled
enableNetwork(db).catch((err) => console.error("Firestore network setup failed:", err));

// --- 3. App ID (for collection paths) ---
const appId = typeof __app_id !== "undefined" ? __app_id : "default-uno-app";

// --- 4. Authentication ---
let currentUserId: string | null = null;
let isAuthReady = false;
const authReadyPromise = new Promise<User | null>((resolve) => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("User is signed in with UID:", user.uid);
            currentUserId = user.uid;
            isAuthReady = true;
            resolve(user);
        } else {
            console.log("No user signed in, attempting auth...");
            try {
                if (typeof __initial_auth_token !== "undefined") {
                    console.log("Signing in with custom token...");
                    const userCredential = await signInWithCustomToken(
                        auth,
                        __initial_auth_token
                    );
                    currentUserId = userCredential.user.uid;
                    isAuthReady = true;
                    resolve(userCredential.user);
                } else {
                    console.log("Signing in anonymously...");
                    const userCredential = await signInAnonymously(auth);
                    currentUserId = userCredential.user.uid;
                    isAuthReady = true;
                    resolve(userCredential.user);
                }
            } catch (error) {
                console.error("Authentication error:", error);
                isAuthReady = true; // Still ready, just unauthenticated
                resolve(null);
            }
        }
    });
});

/**
 * Gets the current user's ID, waiting for auth to be ready if necessary.
 * @returns {Promise<string>} The user's UID.
 */
export const getUserId = async (): Promise<string> => {
    if (currentUserId) return currentUserId;
    await authReadyPromise;
    if (!currentUserId) {
        // This case handles anonymous sign-in fallback if everything else failed
        const userCredential = await signInAnonymously(auth);
        currentUserId = userCredential.user.uid;
    }
    return currentUserId!;
};

// --- 5. Firestore References ---
// We use the "public" data path for a shared game
const gamesCollectionPath = `/artifacts/${appId}/public/data/games`;
export const gamesCollection = collection(db, gamesCollectionPath);

/**
 * Gets a reference to a specific game document.
 * @param gameId The ID of the game.
 * @returns A DocumentReference for the game.
 */
export const getGameDocRef = (gameId: string) =>
    doc(db, gamesCollectionPath, gameId);

// Export core services
export {
    db,
    auth,
    authReadyPromise,
};

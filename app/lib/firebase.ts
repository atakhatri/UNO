import { initializeApp, getApp, getApps } from "firebase/app";
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged,
    User,
    // --- New Imports ---
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    // --- End New Imports ---
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
    // --- New Imports ---
    query,
    where,
    getDocs,
    arrayRemove,
    writeBatch,
    deleteDoc, // For deleting invites
    // --- End New Imports ---
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
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics;
if (typeof window !== "undefined") {
    // Check if window exists (client-side)
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
enableNetwork(db).catch((err) =>
    console.error("Firestore network setup failed:", err)
);

// --- 3. App ID (for collection paths) ---
const appId = typeof __app_id !== "undefined" ? __app_id : "default-uno-app";

// --- 4. Authentication ---
let currentUserId: string | null = null;
let isAuthReady = false;

// This promise now just waits for Firebase Auth to initialize.
// It no longer signs in anonymously by default.
const authReadyPromise = new Promise<User | null>((resolve) => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in (either via token, session, or new login)
            console.log("User is signed in with UID:", user.uid);
            currentUserId = user.uid;
            isAuthReady = true;
            resolve(user);
        } else {
            // User is signed out
            console.log("No user signed in.");
            // Try custom token if available (for specific environments)
            if (typeof __initial_auth_token !== "undefined") {
                try {
                    console.log("Signing in with custom token...");
                    const userCredential = await signInWithCustomToken(
                        auth,
                        __initial_auth_token
                    );
                    currentUserId = userCredential.user.uid;
                    isAuthReady = true;
                    resolve(userCredential.user);
                } catch (error) {
                    console.error("Custom token sign-in error:", error);
                    isAuthReady = true;
                    resolve(null); // Resolve with null if token fails
                }
            } else {
                // No token, just resolve as signed-out
                isAuthReady = true;
                resolve(null);
            }
        }
    });
});

/**
 * Gets the current user's ID, waiting for auth to be ready if necessary.
 * IMPORTANT: This will return NULL if the user is not logged in.
 * @returns {Promise<string | null>} The user's UID or null.
 */
export const getUserId = async (): Promise<string | null> => {
    if (currentUserId) return currentUserId;
    await authReadyPromise;
    // currentUserId is set by onAuthStateChanged
    return currentUserId;
};

// --- 5. Firestore References ---
const gamesCollectionPath = `/artifacts/${appId}/public/data/games`;
export const gamesCollection = collection(db, gamesCollectionPath);

// Collection for user profiles, friends lists, and requests
const usersCollectionPath = `/artifacts/${appId}/public/data/users`;
export const usersCollection = collection(db, usersCollectionPath);

/**
 * Gets a reference to a specific game document.
 * @param gameId The ID of the game.
 * @returns A DocumentReference for the game.
 */
export const getGameDocRef = (gameId: string) =>
    doc(db, gamesCollectionPath, gameId);

/**
 * Gets a reference to a specific user document.
 * @param uid The UID of the user.
 * @returns A DocumentReference for the user.
 */
export const getUserDocRef = (uid: string) => doc(db, usersCollectionPath, uid);

/**
 * Gets a reference to the game invites subcollection for a user.
 * @param uid The UID of the user.
 * @returns A CollectionReference.
 */
export const getGameInvitesCollectionRef = (uid: string) =>
    collection(db, usersCollectionPath, uid, "gameInvites");

/**
 * Creates a new user document in the 'users' collection upon signup.
 * @param user The Firebase Auth User object.
 * @param displayName The chosen display name.
 */
export const createUserDocument = async (user: User, displayName: string) => {
    if (!user) return;
    const userDocRef = getUserDocRef(user.uid);
    const userEmail = user.email || ""; // Ensure email is not null

    // Check if document already exists (e.g., from a previous failed signup)
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
        const newUserDoc = {
            uid: user.uid,
            displayName: displayName,
            // Store email in lowercase for case-insensitive search
            email: userEmail.toLowerCase(),
            friends: [],
            pendingRequests: [], // Requests other people have sent to this user
            sentRequests: [], // Requests this user has sent to others
        };
        await setDoc(userDocRef, newUserDoc);
    } else {
        // If it exists, just update the display name if it's different
        await updateDoc(userDocRef, {
            displayName: displayName,
            email: userEmail.toLowerCase(),
        });
    }
};

// --- FRIENDS FUNCTIONS ---

/**
 * Searches for users by their display name.
 * @param nameQuery The partial name to search for.
 * @param currentUserId The UID of the user performing the search (to exclude self).
 */
export const searchUsers = async (nameQuery: string, currentUserId: string) => {
    if (!nameQuery.trim()) return [];
    const nameQueryLower = nameQuery.toLowerCase();

    const displayNameQuery = query(
        usersCollection,
        where("displayName", "==", nameQuery)
    );
    const emailQuery = query(
        usersCollection,
        where("email", "==", nameQueryLower)
    );

    try {
        const [nameSnapshot, emailSnapshot] = await Promise.all([
            getDocs(displayNameQuery),
            getDocs(emailQuery),
        ]);
        const results = new Map<string, any>();
        nameSnapshot.forEach((doc) => {
            if (doc.id !== currentUserId) {
                results.set(doc.id, { ...doc.data(), id: doc.id });
            }
        });
        emailSnapshot.forEach((doc) => {
            if (doc.id !== currentUserId) {
                results.set(doc.id, { ...doc.data(), id: doc.id });
            }
        });
        return Array.from(results.values());
    } catch (error) {
        console.error("Error searching users:", error);
        return [];
    }
};

/**
 * Sends a friend request from the current user to another user.
 * @param currentUserId The UID of the user sending the request.
 * @param targetUserId The UID of the user receiving the request.
 */
export const sendFriendRequest = async (
    currentUserId: string,
    targetUserId: string
) => {
    if (currentUserId === targetUserId) return;
    const targetUserRef = getUserDocRef(targetUserId);
    const currentUserRef = getUserDocRef(currentUserId);
    const batch = writeBatch(db);
    batch.update(targetUserRef, {
        pendingRequests: arrayUnion(currentUserId),
    });
    batch.update(currentUserRef, {
        sentRequests: arrayUnion(targetUserId),
    });
    await batch.commit();
};

/**
 * Accepts a friend request.
 * @param currentUserId The UID of the user accepting the request.
 * @param requesterId The UID of the user who sent the request.
 */
export const acceptFriendRequest = async (
    currentUserId: string,
    requesterId: string
) => {
    const currentUserRef = getUserDocRef(currentUserId);
    const requesterUserRef = getUserDocRef(requesterId);
    const batch = writeBatch(db);
    batch.update(currentUserRef, {
        pendingRequests: arrayRemove(requesterId),
    });
    batch.update(currentUserRef, {
        friends: arrayUnion(requesterId),
    });
    batch.update(requesterUserRef, {
        sentRequests: arrayRemove(currentUserId),
    });
    batch.update(requesterUserRef, {
        friends: arrayUnion(currentUserId),
    });
    await batch.commit();
};

/**
 * Declines or cancels a friend request.
 * @param currentUserId The UID of the user declining/cancelling.
 * @param otherUserId The UID of the other user.
 * @param type 'decline' (they sent it to me) or 'cancel' (I sent it to them)
 */
export const declineFriendRequest = async (
    currentUserId: string,
    otherUserId: string,
    type: "decline" | "cancel"
) => {
    const currentUserRef = getUserDocRef(currentUserId);
    const otherUserRef = getUserDocRef(otherUserId);
    const batch = writeBatch(db);
    if (type === "decline") {
        batch.update(currentUserRef, {
            pendingRequests: arrayRemove(otherUserId),
        });
        batch.update(otherUserRef, {
            sentRequests: arrayRemove(currentUserId),
        });
    } else {
        batch.update(currentUserRef, {
            sentRequests: arrayRemove(otherUserId),
        });
        batch.update(otherUserRef, {
            pendingRequests: arrayRemove(currentUserId),
        });
    }
    await batch.commit();
};

/**
 * Removes a friend.
 * @param currentUserId The UID of the user removing the friend.
 * @param friendId The UID of the friend to remove.
 */
export const removeFriend = async (
    currentUserId: string,
    friendId: string
) => {
    const currentUserRef = getUserDocRef(currentUserId);
    const friendUserRef = getUserDocRef(friendId);
    const batch = writeBatch(db);
    batch.update(currentUserRef, {
        friends: arrayRemove(friendId),
    });
    batch.update(friendUserRef, {
        friends: arrayRemove(currentUserId),
    });
    await batch.commit();
};

// --- NEW GAME INVITE FUNCTIONS ---

/**
 * Sends a game invite to a friend.
 * @param senderId UID of the user sending the invite
 * @param senderName Display name of the sender
 * @param gameId The ID of the game to invite to
 * @param targetFriendId The UID of the friend being invited
 */
export const sendGameInvite = async (
    senderId: string,
    senderName: string,
    gameId: string,
    targetFriendId: string
) => {
    if (senderId === targetFriendId) return;
    // Create a doc in the target's "gameInvites" subcollection
    // Use the gameId as the document ID for easy lookup/deletion
    const inviteDocRef = doc(
        db,
        usersCollectionPath,
        targetFriendId,
        "gameInvites",
        gameId
    );
    await setDoc(inviteDocRef, {
        gameId: gameId,
        senderId: senderId,
        senderName: senderName,
        createdAt: new Date(), // Optional: for auto-deleting old invites
    });
};

/**
 * Deletes a game invite after it's been accepted or declined.
 * @param userId The UID of the user who *received* the invite
 * @param gameId The ID of the game invite to delete
 */
export const deleteGameInvite = async (userId: string, gameId: string) => {
    const inviteDocRef = doc(
        db,
        usersCollectionPath,
        userId,
        "gameInvites",
        gameId
    );
    await deleteDoc(inviteDocRef);
};

// --- END NEW GAME INVITE FUNCTIONS ---

// Export core services
export {
    db,
    auth,
    authReadyPromise,
    // --- Export auth functions ---
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    onAuthStateChanged,
    // --- Export firestore functions ---
    collection, // Export collection for subcollection listeners
    query,
    where,
    getDocs,
    arrayRemove,
    deleteDoc, // Export deleteDoc
    setDoc,
    getDoc, updateDoc, arrayUnion, onSnapshot
};
export type { User }; // Export the User type for React state


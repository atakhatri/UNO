import { initializeApp, getApp, getApps } from "firebase/app";
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged,
    User, createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
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
    query,
    where,
    getDocs,
    arrayRemove,
    writeBatch,
    deleteDoc,
} from "firebase/firestore";

import { getAnalytics, isSupported } from "firebase/analytics";
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

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

declare const __firebase_config: string;
declare const __initial_auth_token: string;
declare const __app_id: string;


const auth = getAuth(app);
const db = getFirestore(app);


setLogLevel("debug");


enableNetwork(db).catch((err) =>
    console.error("Firestore network setup failed:", err)
);

const appId = typeof __app_id !== "undefined" ? __app_id : "default-uno-app";


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

            console.log("No user signed in.");

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
                    resolve(null);
                }
            } else {

                isAuthReady = true;
                resolve(null);
            }
        }
    });
});

export const getUserId = async (): Promise<string | null> => {
    if (currentUserId) return currentUserId;
    await authReadyPromise;
    return currentUserId;
};

const gamesCollectionPath = `/artifacts/${appId}/public/data/games`;
export const gamesCollection = collection(db, gamesCollectionPath);

const usersCollectionPath = `/artifacts/${appId}/public/data/users`;
export const usersCollection = collection(db, usersCollectionPath);

export const getGameDocRef = (gameId: string) =>
    doc(db, gamesCollectionPath, gameId);

export const getUserDocRef = (uid: string) => doc(db, usersCollectionPath, uid);

export const getGameInvitesCollectionRef = (uid: string) =>
    collection(db, usersCollectionPath, uid, "gameInvites");

export const createUserDocument = async (user: User, displayName: string) => {
    if (!user) return;
    const userDocRef = getUserDocRef(user.uid);
    const userEmail = user.email || "";

    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
        const newUserDoc = {
            uid: user.uid,
            displayName: displayName,
            email: userEmail.toLowerCase(),
            friends: [],
            pendingRequests: [],
            sentRequests: [],
        };
        await setDoc(userDocRef, newUserDoc);
    } else {
        await updateDoc(userDocRef, {
            displayName: displayName,
            email: userEmail.toLowerCase(),
        });
    }
};

export const searchUsers = async (
    queryInput: string,
    currentUserId: string
) => {
    const trimmedQuery = queryInput.trim();
    if (!trimmedQuery) return [];

    const results = new Map<string, any>();
    const promises = [];

    const displayNameQuery = query(
        usersCollection,
        where("displayName", "==", trimmedQuery)
    );
    promises.push(getDocs(displayNameQuery));

    const userDocRef = getUserDocRef(trimmedQuery);
    promises.push(getDoc(userDocRef));

    const [nameSnapshot, uidDoc] = (await Promise.all(promises)) as [
        Awaited<ReturnType<typeof getDocs>>,
        Awaited<ReturnType<typeof getDoc>>
    ];

    nameSnapshot.forEach((doc) => {
        if (doc.id !== currentUserId) {
            results.set(doc.id, { ...(doc.data() as object), id: doc.id });
        }
    });

    if (uidDoc.exists() && uidDoc.id !== currentUserId) {
        results.set(uidDoc.id, { ...(uidDoc.data() as object), id: uidDoc.id });
    }

    return Array.from(results.values());
};

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

export const sendGameInvite = async (
    senderId: string,
    senderName: string,
    gameId: string,
    targetFriendId: string
) => {
    if (senderId === targetFriendId) return;
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
        createdAt: new Date(),
    });
};

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

export {
    db,
    auth,
    authReadyPromise,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    onAuthStateChanged,
    collection,
    query,
    where,
    getDocs,
    arrayRemove,
    deleteDoc,
    setDoc,
    getDoc, updateDoc, arrayUnion, onSnapshot
};
export type { User };

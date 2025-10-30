"use client";

import { useState, useEffect } from "react";
import Link from "next/link"; // Import Link for navigation
import { useRouter } from "next/navigation";
import {
  FaTimes,
  FaUser,
  FaUserFriends,
  FaSearch,
  FaUserPlus,
  FaCheck,
  FaTimesCircle,
  FaUserClock,
  FaUserCheck,
  FaUserMinus,
  FaPaperPlane, // For invites
  FaArrowRight,
} from "react-icons/fa"; // Added new icons
// Using relative path
import { Player, GameState, Difficulty } from "./game/game-types";
// Using relative path
import {
  db,
  getGameDocRef,
  // Import new auth functions
  auth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
  // --- Import our new function ---
  createUserDocument,
  getUserDocRef, // Import user doc ref
  // --- Import Firestore functions ---
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  // --- Import new friend functions ---
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  // --- Import invite functions ---
  collection, // Need this for subcollection listener
  getGameInvitesCollectionRef,
  deleteGameInvite,
} from "./lib/firebase";

// Helper function to generate a simple 6-digit game ID
const generateGameId = () => Math.random().toString().substring(2, 8);

// Define User Profile type
interface UserProfile {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  friends: string[];
  pendingRequests: string[];
  sentRequests: string[];
}

// --- NEW ---
// Define Game Invite type
interface GameInvite {
  id: string; // The gameId
  gameId: string;
  senderId: string;
  senderName: string;
}
// --- END NEW ---

export default function Home() {
  const router = useRouter();

  // --- Auth State ---
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"profile" | "friends">("profile");

  // --- Game State ---
  const [gameIdToJoin, setGameIdToJoin] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);

  // --- Friends State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [friendSearchLoading, setFriendSearchLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false); // To track if a search has happened
  const [friendsDetails, setFriendsDetails] = useState<UserProfile[]>([]);
  const [pendingRequestsDetails, setPendingRequestsDetails] = useState<
    UserProfile[]
  >([]);

  // --- NEW Game Invite State ---
  const [gameInvites, setGameInvites] = useState<GameInvite[]>([]);

  // Effect to listen for auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setPlayerName(user.displayName || "");
        setIsAuthModalOpen(false);
        setError(null);
      } else {
        setUser(null);
        setPlayerName("");
        setUserProfile(null); // Clear profile on logout
        if (!isAuthLoading) {
          setIsAuthModalOpen(true);
        }
      }
      setIsAuthLoading(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthLoading]);

  // Effect to listen for Firestore User Profile AND Game Invites
  useEffect(() => {
    if (user) {
      // --- 1. Listen for User Profile ---
      const userDocRef = getUserDocRef(user.uid);
      const unsubProfile = onSnapshot(userDocRef, async (doc) => {
        if (doc.exists()) {
          const data = doc.data() as UserProfile;
          setUserProfile({ ...data, id: doc.id });

          // Fetch details for friends
          if (data.friends && data.friends.length > 0) {
            const friendPromises = data.friends.map(async (friendId) => {
              const friendDoc = await getDoc(getUserDocRef(friendId));
              return friendDoc.exists()
                ? ({ ...friendDoc.data(), id: friendDoc.id } as UserProfile)
                : null;
            });
            const friends = (await Promise.all(friendPromises)).filter(
              Boolean
            ) as UserProfile[];
            setFriendsDetails(friends);
          } else {
            setFriendsDetails([]);
          }

          // Fetch details for pending requests
          if (data.pendingRequests && data.pendingRequests.length > 0) {
            const requestPromises = data.pendingRequests.map(
              async (requesterId) => {
                const requesterDoc = await getDoc(getUserDocRef(requesterId));
                return requesterDoc.exists()
                  ? ({
                      ...requesterDoc.data(),
                      id: requesterDoc.id,
                    } as UserProfile)
                  : null;
              }
            );
            const requesters = (await Promise.all(requestPromises)).filter(
              Boolean
            ) as UserProfile[];
            setPendingRequestsDetails(requesters);
          } else {
            setPendingRequestsDetails([]);
          }
        } else {
          if (user.displayName) {
            createUserDocument(user, user.displayName);
          }
        }
      });

      // --- 2. Listen for Game Invites ---
      const invitesColRef = getGameInvitesCollectionRef(user.uid);
      const unsubInvites = onSnapshot(invitesColRef, (snapshot) => {
        const invites = snapshot.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id } as GameInvite)
        );
        setGameInvites(invites);
      });

      return () => {
        unsubProfile(); // Cleanup profile listener
        unsubInvites(); // Cleanup invites listener
      };
    } else {
      // User logged out, clear lists
      setFriendsDetails([]);
      setPendingRequestsDetails([]);
      setGameInvites([]);
    }
  }, [user]);

  // --- Auth Handlers ---
  const handleSignUp = async () => {
    if (!email || !password || !playerName.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(userCredential.user, {
        displayName: playerName,
      });
      await createUserDocument(userCredential.user, playerName);

      setUser({ ...userCredential.user, displayName: playerName });
      setPlayerName(playerName);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      if (err.code === "auth/operation-not-allowed") {
        setError(
          "Email/Password sign-in is not enabled in your Firebase project."
        );
      } else {
        setError(err.message);
      }
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (err.code === "auth/operation-not-allowed") {
        setError(
          "Email/Password sign-in is not enabled in your Firebase project."
        );
      } else {
        setError(err.message);
      }
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    await signOut(auth);
    setLoading(false);
  };

  // --- Game Handlers (Modified to use logged-in user) ---
  const handleCreateGame = async () => {
    const currentDisplayName = user?.displayName || playerName;
    if (!user || !currentDisplayName) {
      setError("Please log in and set your name first.");
      setIsAuthModalOpen(true);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const newGameId = generateGameId();
      const hostPlayer: Player = {
        uid: user.uid,
        name: currentDisplayName,
        hand: [],
      };
      const newGame: Partial<GameState> = {
        gameId: newGameId,
        hostId: user.uid,
        players: [hostPlayer],
        status: "waiting",
        difficulty: difficulty,
      };
      const gameDocRef = getGameDocRef(newGameId);
      await setDoc(gameDocRef, newGame);
      router.push(`/game/${newGameId}`);
    } catch (err) {
      console.error("Error creating game:", err);
      setError("Failed to create game. Please try again.");
      setLoading(false);
    }
  };

  // MODIFIED to accept an optional inviteId
  const handleJoinGame = async (inviteGameId?: string) => {
    const gameId = inviteGameId || gameIdToJoin; // Use invite ID if provided

    const currentDisplayName = user?.displayName || playerName;
    if (!user || !currentDisplayName) {
      setError("Please log in and set your name first.");
      setIsAuthModalOpen(true);
      return;
    }
    if (!gameId || gameId.length !== 6) {
      setError("Please enter a valid 6-digit Game ID.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const gameDocRef = getGameDocRef(gameId);
      const gameDoc = await getDoc(gameDocRef);

      if (!gameDoc.exists()) {
        setError("Game not found. Check the ID and try again.");
        // If it was an invite, delete the bad invite
        if (inviteGameId) await deleteGameInvite(user.uid, inviteGameId);
        setLoading(false);
        return;
      }

      const gameData = gameDoc.data() as GameState;
      if (!gameData || !gameData.players) {
        setError("Game data is incomplete or corrupted.");
        if (inviteGameId) await deleteGameInvite(user.uid, inviteGameId);
        setLoading(false);
        return;
      }
      if (gameData.status !== "waiting") {
        setError("This game has already started or is finished.");
        if (inviteGameId) await deleteGameInvite(user.uid, inviteGameId);
        setLoading(false);
        return;
      }
      if (gameData.players.length >= 4) {
        setError("This game is full (max 4 players).");
        if (inviteGameId) await deleteGameInvite(user.uid, inviteGameId);
        setLoading(false);
        return;
      }
      if (gameData.players.some((p) => p.uid === user.uid)) {
        if (inviteGameId) await deleteGameInvite(user.uid, inviteGameId);
        router.push(`/game/${gameId}`); // Already in, just navigate
        return;
      }

      const newPlayer: Player = {
        uid: user.uid,
        name: currentDisplayName,
        hand: [],
      };
      await updateDoc(gameDocRef, {
        players: arrayUnion(newPlayer),
      });

      // If we joined from an invite, delete the invite
      if (inviteGameId) {
        await deleteGameInvite(user.uid, inviteGameId);
      }

      router.push(`/game/${gameId}`);
    } catch (err) {
      console.error("Error joining game:", err);
      setError("Failed to join game. Please try again.");
      setLoading(false);
    }
  };

  // --- Friend Handlers ---
  const handleSearchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !user) return;
    setSearchPerformed(true); // Mark that a search has been attempted
    setFriendSearchLoading(true);
    setError(null);
    try {
      const results = await searchUsers(searchQuery, user.uid);
      setSearchResults(results as UserProfile[]);
    } catch (err: any) {
      setError("Error searching users: " + err.message);
    }
    setFriendSearchLoading(false);
  };

  const handleSendRequest = async (targetUserId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await sendFriendRequest(user.uid, targetUserId);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleAcceptRequest = async (requesterId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await acceptFriendRequest(user.uid, requesterId);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleDeclineRequest = async (requesterId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await declineFriendRequest(user.uid, requesterId, "decline");
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleCancelRequest = async (targetUserId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await declineFriendRequest(user.uid, targetUserId, "cancel");
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;
    // Bypassing window.confirm
    setLoading(true);
    try {
      await removeFriend(user.uid, friendId);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  // --- NEW Invite Handlers ---
  const handleDeclineInvite = async (gameId: string) => {
    if (!user) return;
    try {
      await deleteGameInvite(user.uid, gameId);
    } catch (err: any) {
      setError("Failed to decline invite: " + err.message);
    }
  };

  // Helper to determine friend status for search results
  const getFriendStatus = (targetId: string) => {
    if (!userProfile) return null;
    if (userProfile.friends.includes(targetId)) return "friends";
    if (userProfile.pendingRequests.includes(targetId)) return "pending_theirs";
    if (userProfile.sentRequests.includes(targetId)) return "pending_mine";
    return null;
  };

  // --- Render ---
  return (
    <main
      className="flex min-h-screen flex-col bg-cover bg-center"
      style={{ backgroundImage: "url('/main_bg.png')" }}
    >
      {/* Full-screen semi-transparent container */}
      <div className="relative flex flex-col bg-black/80 w-full min-h-screen p-4 sm:p-6 md:p-8">
        {/* Header: Title + Profile */}
        <div className="flex justify-between items-center w-full mb-4 sm:mb-6">
          <h1 className="text-5xl sm:text-5xl md:text-6xl font-bold text-white tracking-[0.5rem] sm:tracking-[1rem] -mr-[0.5rem] sm:-mr-[1rem]">
            <span className="heading u">U</span>
            <span className="heading n">N</span>
            <span className="heading o">O</span>
          </h1>
          <div className="relative">
            <button
              onClick={() => {
                setModalTab("profile"); // Reset to profile tab when opening
                setIsAuthModalOpen(true);
              }}
              className="p-5 bg-white/10 text-white rounded-full transition-all hover:bg-white/20"
              aria-label="Open Profile"
            >
              <FaUser size="1.25rem" />
            </button>
            {user &&
              userProfile &&
              friendsDetails.length === 0 &&
              pendingRequestsDetails.length === 0 && (
                <div className="absolute top-full right-0 mt-3 mr-2 w-48 bg-blue-600 text-white text-xs rounded-lg p-2 shadow-lg animate-pulse z-10 pointer-events-none">
                  <p>
                    Click here to open the friends tab and add some friends!
                  </p>
                  <div className="absolute bottom-full right-4 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-blue-600"></div>
                </div>
              )}
          </div>
        </div>

        {/* --- NEW: Game Invite Notifications --- */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-full max-w-sm z-40 space-y-2">
          {gameInvites.map((invite) => (
            <div
              key={invite.id}
              className="bg-gray-700 border border-white/20 rounded-lg p-4 shadow-lg animate-fadeIn"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-white">
                  {invite.senderName} invited you!
                </h3>
                <button
                  onClick={() => handleDeclineInvite(invite.gameId)}
                  className="text-white/50 hover:text-white"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleJoinGame(invite.gameId)}
                  className="flex-1 px-4 py-2 bg-green-600/80 rounded-lg text-sm font-semibold hover:bg-green-500/80"
                >
                  Join
                </button>
                <button
                  onClick={() => handleDeclineInvite(invite.gameId)}
                  className="flex-1 px-4 py-2 bg-red-600/80 rounded-lg text-sm font-semibold hover:bg-red-500/80"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
        {/* --- END: Game Invite Notifications --- */}

        {/* Centered Content Wrapper */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <div className="w-full max-w-xl space-y-4 sm:space-y-6">
            <button
              onClick={() => setIsHowToPlayOpen(true)}
              className="w-full px-6 py-2 bg-black/50 text-white rounded-lg text-md font-semibold transition-all hover:bg-white/20"
            >
              How to Play
            </button>

            {/* Global error (not auth-related) */}
            {error &&
              !error.toLowerCase().includes("firebase") && // Show non-auth errors here
              user && (
                <div className="text-red-400 bg-red-900/50 p-3 rounded-lg text-center w-full">
                  {error}
                </div>
              )}

            <div className="flex flex-col gap-4 sm:gap-6 w-full">
              {/* --- Play Local Section --- */}
              <div className="flex flex-col gap-4 p-4 border border-white/30 rounded-xl">
                <h2 className="text-lg sm:text-xl text-white font-semibold text-center">
                  Single Player
                </h2>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <select
                    id="difficulty-local"
                    className="bg-black/50 text-white rounded-lg px-4 py-2 text-sm sm:text-base border border-white/20 appearance-none w-full sm:w-1/2"
                    value={difficulty}
                    onChange={(e) =>
                      setDifficulty(e.target.value as Difficulty)
                    }
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <Link
                    href={`/local-game?difficulty=${difficulty}&players=2`}
                    passHref
                    className="w-full sm:w-1/2"
                  >
                    <button
                      disabled={loading}
                      className="w-full px-5 py-2 bg-teal-600/80 text-white rounded-lg text-lg sm:text-xl font-semibold transition-all hover:bg-teal-500/80 hover:scale-105 active:scale-95 disabled:bg-gray-500"
                    >
                      Play vs Computer
                    </button>
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <hr className="flex-grow border-white/20" />
                <span className="text-white/80 font-semibold">OR</span>
                <hr className="flex-grow border-white/20" />
              </div>

              {/* --- Multiplayer Sections --- */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* Create Game */}
                <div className="flex flex-col gap-4 p-4 border border-white/30 rounded-xl flex-1">
                  <h2 className="text-lg sm:text-xl text-white font-semibold text-center">
                    Create Online Game
                  </h2>
                  <button
                    onClick={() => handleCreateGame()} // Ensure no params are passed
                    disabled={loading || !user}
                    className="w-full px-6 py-3 bg-green-600/80 text-white rounded-lg text-xl font-semibold transition-all hover:bg-green-500/80 hover:scale-105 active:scale-95 disabled:bg-gray-500 disabled:opacity-70 disabled:cursor-not-allowed"
                    title={!user ? "Please log in first" : ""}
                  >
                    {loading ? "Creating..." : "Create Game"}
                  </button>
                </div>

                {/* Join Game */}
                <div className="flex flex-col gap-4 p-4 border border-white/30 rounded-xl flex-1">
                  <h2 className="text-lg sm:text-xl text-white font-semibold text-center">
                    Join Online Game
                  </h2>
                  <input
                    id="gameIdInput"
                    type="text"
                    placeholder="Enter 6-digit Game ID"
                    maxLength={6}
                    value={gameIdToJoin}
                    onChange={(e) =>
                      setGameIdToJoin(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    className="w-full px-4 py-3 bg-white/10 text-white placeholder-white/50 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-[0.2em] transition-all"
                  />
                  <button
                    onClick={() => handleJoinGame()} // Ensure no params are passed
                    disabled={loading || !user || gameIdToJoin.length !== 6}
                    className="w-full px-6 py-3 bg-blue-600/80 text-white rounded-lg text-xl font-semibold transition-all hover:bg-blue-500/80 hover:scale-105 active:scale-95 disabled:bg-gray-500 disabled:opacity-70 disabled:cursor-not-allowed"
                    title={
                      !user
                        ? "Please log in first"
                        : gameIdToJoin.length !== 6
                        ? "Enter a 6-digit Game ID"
                        : ""
                    }
                  >
                    {loading ? "Joining..." : "Join Game"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How to Play Modal */}
        {isHowToPlayOpen && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-white/20 rounded-xl p-6 sm:p-8 text-white shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  How to Play UNO
                </h2>
                <button
                  onClick={() => setIsHowToPlayOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Close rules"
                >
                  <FaTimes size="1.5rem" />
                </button>
              </div>
              <div className="space-y-6 text-white/90 leading-relaxed">
                <p>Kya padhne aa gye 🤧, yk how to play🤣</p>
                <div>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 border-b border-white/20 pb-2">
                    Gameplay
                  </h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li>
                      Match the top card of the discard pile by either number,
                      color, or action.
                    </li>
                    <li>
                      For example, if the top card is a red 7, you can play any
                      red card or any color 7.
                    </li>
                    <li>
                      If you don't have a playable card, you must draw a card
                      from the deck.
                    </li>
                    <li>
                      When you have only one card left, click the{" "}
                      <span className="font-bold text-yellow-300">UNO!</span>{" "}
                      button before your turn ends. If you forget and another
                      player catches you, you'll draw two penalty cards!
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 border-b border-white/20 pb-2">
                    Special Cards
                  </h3>
                  <ul className="space-y-3">
                    <li>
                      <strong className="text-sky-400">Reverse:</strong>{" "}
                      Reverses the direction of play.
                    </li>
                    <li>
                      <strong className="text-red-400">Skip:</strong> The next
                      player in line loses their turn.
                    </li>
                    <li>
                      <strong className="text-green-400">Draw Two:</strong> The
                      next player must draw two cards and miss their turn.
                    </li>
                    <li>
                      <strong className="font-bold">Wild:</strong> Allows you to
                      change the current color.
                    </li>
                    <li>
                      <strong className="font-black">Wild Draw Four:</strong>
                      Change the color and force the next player to draw four
                      cards and lose their turn.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- AUTHENTICATION MODAL --- */}
        {isAuthModalOpen && !isAuthLoading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-white/20 rounded-xl p-6 sm:p-8 text-white shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              {/* --- Modal Content --- */}
              {user ? (
                // --- LOGGED IN VIEW ---
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white truncate">
                      {user.displayName || user.email}
                    </h2>
                    <button
                      onClick={() => setIsAuthModalOpen(false)}
                      className="p-2 rounded-full hover:bg-white/10 transition-colors"
                      aria-label="Close profile"
                    >
                      <FaTimes size="1.5rem" />
                    </button>
                  </div>

                  {/* --- TABS --- */}
                  <div className="flex border-b border-white/20 my-4">
                    <button
                      onClick={() => setModalTab("profile")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-lg font-semibold ${
                        modalTab === "profile"
                          ? "text-white border-b-2 border-blue-500"
                          : "text-white/50 hover:text-white/75"
                      }`}
                    >
                      <FaUser /> Profile
                    </button>
                    <button
                      onClick={() => setModalTab("friends")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-lg font-semibold ${
                        modalTab === "friends"
                          ? "text-white border-b-2 border-blue-500"
                          : "text-white/50 hover:text-white/75"
                      }`}
                    >
                      <FaUserFriends /> Friends
                    </button>
                  </div>
                  {/* --- END TABS --- */}

                  {/* --- Tab Content --- */}
                  {modalTab === "profile" && (
                    <div className="space-y-4 animate-fadeIn">
                      <p className="text-white/80">
                        You are logged in as:
                        <br />
                        <strong className="text-white text-lg break-all">
                          {user.displayName || user.email || "User"}
                        </strong>
                      </p>
                      <button
                        onClick={handleLogout}
                        disabled={loading}
                        className="w-full px-6 py-3 bg-red-600/80 text-white rounded-lg text-xl font-semibold transition-all hover:bg-red-500/80 active:scale-95 disabled:bg-gray-500"
                      >
                        {loading ? "Signing Out..." : "Sign Out"}
                      </button>
                    </div>
                  )}

                  {modalTab === "friends" && (
                    <div className="space-y-6 animate-fadeIn">
                      {/* Search Users */}
                      <form onSubmit={handleSearchUsers} className="space-y-2">
                        <h3 className="text-xl font-semibold text-white">
                          Add Friend
                        </h3>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Search by name or email"
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              if (e.target.value.trim() === "") {
                                setSearchResults([]);
                                setSearchPerformed(false);
                              }
                            }}
                            className="flex-1 px-4 py-2 bg-white/10 text-white placeholder-white/50 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                          <button
                            type="submit"
                            disabled={friendSearchLoading}
                            className="p-3 bg-blue-600/80 rounded-lg hover:bg-blue-500/80"
                          >
                            <FaSearch />
                          </button>
                        </div>
                      </form>

                      {/* Search Results */}
                      <div className="space-y-2">
                        {friendSearchLoading && (
                          <p className="text-white/70">Searching...</p>
                        )}
                        {searchPerformed &&
                          !friendSearchLoading &&
                          searchResults.length === 0 && (
                            <p className="text-white/70 text-center">
                              No users found.
                            </p>
                          )}
                        {searchResults.length > 0 &&
                          !friendSearchLoading &&
                          searchResults.map((result) => {
                            const status = getFriendStatus(result.id);
                            return (
                              <div
                                key={result.id}
                                className="flex items-center justify-between bg-black/20 p-2 rounded-lg"
                              >
                                <span className="truncate">
                                  {result.displayName}
                                </span>
                                {status === "friends" && (
                                  <span className="flex items-center gap-1 text-green-400">
                                    <FaUserCheck /> Friends
                                  </span>
                                )}
                                {status === "pending_mine" && (
                                  <button
                                    onClick={() =>
                                      handleCancelRequest(result.id)
                                    }
                                    className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300"
                                  >
                                    <FaUserClock /> Sent
                                  </button>
                                )}
                                {status === "pending_theirs" && (
                                  <span className="flex items-center gap-1 text-blue-400">
                                    <FaUserPlus /> Request Received
                                  </span>
                                )}
                                {status === null && (
                                  <button
                                    onClick={() => handleSendRequest(result.id)}
                                    className="p-2 bg-green-600/80 rounded-lg hover:bg-green-500/80"
                                    aria-label="Send friend request"
                                  >
                                    <FaUserPlus />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                      </div>

                      {/* Pending Requests */}
                      {pendingRequestsDetails.length > 0 && (
                        <div className="space-y-2 pt-4 border-t border-white/20">
                          <h3 className="text-xl font-semibold text-white">
                            Friend Requests
                          </h3>
                          {pendingRequestsDetails.map((req) => (
                            <div
                              key={req.id}
                              className="flex items-center justify-between bg-black/20 p-2 rounded-lg"
                            >
                              <span className="truncate">
                                {req.displayName}
                              </span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAcceptRequest(req.id)}
                                  className="p-2 bg-green-600/80 rounded-lg hover:bg-green-500/80"
                                  aria-label="Accept request"
                                >
                                  <FaCheck />
                                </button>
                                <button
                                  onClick={() => handleDeclineRequest(req.id)}
                                  className="p-2 bg-red-600/80 rounded-lg hover:bg-red-500/80"
                                  aria-label="Decline request"
                                >
                                  <FaTimesCircle />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Friends List */}
                      <div className="space-y-2 pt-4 border-t border-white/20">
                        <h3 className="text-xl font-semibold text-white">
                          My Friends
                        </h3>
                        {friendsDetails.length === 0 && (
                          <p className="text-white/70">
                            You haven't added any friends yet.
                          </p>
                        )}
                        {friendsDetails.map((friend) => (
                          <div
                            key={friend.id}
                            className="flex items-center justify-between bg-black/20 p-2 rounded-lg"
                          >
                            <span className="truncate">
                              {friend.displayName}
                            </span>
                            <button
                              onClick={() => handleRemoveFriend(friend.id)}
                              className="p-2 bg-red-600/80 rounded-lg hover:bg-red-500/80"
                              aria-label="Remove friend"
                            >
                              <FaUserMinus />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* --- End Tab Content --- */}
                </>
              ) : (
                // --- LOGGED OUT VIEW (Login/Signup) ---
                <>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-4">
                    {authMode === "login" ? "Login" : "Sign Up"}
                  </h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      authMode === "login" ? handleLogin() : handleSignUp();
                    }}
                    className="space-y-4"
                  >
                    {authMode === "signup" && (
                      <input
                        type="text"
                        placeholder="Display Name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 text-white placeholder-white/50 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    )}
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 text-white placeholder-white/50 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 text-white placeholder-white/50 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />

                    {error && (
                      <p className="text-red-400 text-sm text-center">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full px-6 py-3 bg-green-600/80 text-white rounded-lg text-xl font-semibold transition-all hover:bg-green-500/80 active:scale-95 disabled:bg-gray-500 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {loading
                        ? "Loading..."
                        : authMode === "login"
                        ? "Login"
                        : "Create Account"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode(authMode === "login" ? "signup" : "login");
                        setError(null);
                      }}
                      className="w-full text-center text-blue-400 hover:text-blue-300"
                    >
                      {authMode === "login"
                        ? "Need an account? Sign Up"
                        : "Have an account? Login"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Scrolling Footer */}
      <div className="fixed bottom-0 left-0 w-full h-15 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-hidden z-50">
        <div className="py-2 animate-marquee whitespace-nowrap">
          <span className="text-lg mx-4 text-white font-semibold flex justify-center align-middle">
            <Link href="https://portify-amber.vercel.app/" target="_blank">
              Created by Ata, Check out More
            </Link>
            <FaArrowRight className="w-6 h-6 pt-1.5" />
          </span>
        </div>
        <div className="absolute top-0 py-2 animate-marquee2 whitespace-nowrap"></div>
      </div>
    </main>
  );
}

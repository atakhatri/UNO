"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaTimes, FaArrowRight } from "react-icons/fa";
import { Header } from "../components/Header";
import { Player, GameState, Difficulty } from "./game/game-types";
import {
  db,
  getGameDocRef,
  auth,
  onAuthStateChanged,
  User,
  getUserDocRef,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  getGameInvitesCollectionRef,
  deleteGameInvite,
} from "./lib/firebase";

const generateGameId = () => Math.random().toString().substring(2, 8);

interface UserProfile {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  friends: string[];
  pendingRequests: string[];
  sentRequests: string[];
}

interface GameInvite {
  id: string;
  gameId: string;
  senderId: string;
  senderName: string;
}
// --- END NEW ---

export default function Home() {
  const router = useRouter();

  // --- Auth State ---
  // Simplified for home page: only need user and loading status
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // --- Game State ---
  const [gameIdToJoin, setGameIdToJoin] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);

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
      } else {
        setUser(null);
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

  // --- Game Handlers (Modified to use logged-in user) ---
  const handleCreateGame = async () => {
    const currentDisplayName = user?.displayName;
    if (!user || !currentDisplayName) {
      setError("Please log in to create a game."); // Redirect to profile page to login
      router.push("/profile");
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

    const currentDisplayName = user?.displayName;
    if (!user || !currentDisplayName) {
      setError("Please log in to join a game."); // Redirect to profile page to login
      router.push("/profile");
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

  // --- NEW Invite Handlers ---
  const handleDeclineInvite = async (gameId: string) => {
    if (!user) return;
    try {
      await deleteGameInvite(user.uid, gameId);
    } catch (err: any) {
      setError("Failed to decline invite: " + err.message);
    }
  };

  // --- Render ---
  return (
    <main
      className="flex min-h-screen flex-col bg-cover bg-center"
      style={{ backgroundImage: "url('/main_bg.png')" }}
    >
      {/* Full-screen semi-transparent container */}
      <div className="relative flex flex-col bg-black/70 w-full min-h-screen p-4 sm:p-6 md:p-8">
        <Header
          user={user}
          userProfile={userProfile}
          friendsDetails={friendsDetails}
          pendingRequestsDetails={pendingRequestsDetails}
        />

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
        <div className="flex-1 flex flex-col items-center justify-baseline w-full mt-6">
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
              <div className="flex flex-col md:flex-row gap-4 mb-5">
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
      </div>
      {/* Scrolling Footer */}
      <div className="fixed bottom-0 left-0 w-full h-12 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-hidden">
        <div className=" animate-marquee whitespace-nowrap">
          <span className="text-lg mx-4 text-white font-semibold flex justify-center align-middle hover:text-blue-300 transition-all hover:scale-105 ">
            <Link href="https://portify-amber.vercel.app/" target="_blank">
              Created by Ata, Check out More
            </Link>
            <FaArrowRight className="w-6 h-6 text-amber-500 pt-1.5" />
          </span>
        </div>
        <div className="absolute top-0 py-2 animate-marquee2 whitespace-nowrap"></div>
      </div>
    </main>
  );
}

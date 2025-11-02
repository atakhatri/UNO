"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaTimes,
  FaUser,
  FaUserFriends,
  FaSearch,
  FaUserPlus,
  FaCheck,
  FaTimesCircle,
  FaCopy,
  FaClipboardCheck,
  FaUserClock,
  FaUserCheck,
  FaUserMinus,
  FaArrowLeft,
  FaQuestionCircle,
} from "react-icons/fa";
import type { User } from "firebase/auth";
import {
  auth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  createUserDocument,
  getUserDocRef,
  getDoc,
  onSnapshot,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
} from "../lib/firebase";

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

export default function ProfilePage() {
  const router = useRouter();

  // --- State Management ---
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [modalTab, setModalTab] = useState<"profile" | "friends">("profile");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Friends State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [friendSearchLoading, setFriendSearchLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [friendsDetails, setFriendsDetails] = useState<UserProfile[]>([]);
  const [pendingRequestsDetails, setPendingRequestsDetails] = useState<
    UserProfile[]
  >([]);
  const [showSearchInfo, setShowSearchInfo] = useState(false);
  const [isUidCopied, setIsUidCopied] = useState(false);

  // --- Effects ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setPlayerName(currentUser.displayName || "");
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const userDocRef = getUserDocRef(user.uid);
      const unsubProfile = onSnapshot(userDocRef, async (doc) => {
        if (doc.exists()) {
          const data = doc.data() as UserProfile;
          setUserProfile({ ...data, id: doc.id });

          // Fetch friends details
          if (data.friends && data.friends.length > 0) {
            const friendPromises = data.friends.map(async (friendId) => {
              const friendDoc = await getDoc(getUserDocRef(friendId));
              return friendDoc.exists()
                ? ({ ...friendDoc.data(), id: friendDoc.id } as UserProfile)
                : null;
            });
            setFriendsDetails(
              (await Promise.all(friendPromises)).filter(
                Boolean
              ) as UserProfile[]
            );
          } else {
            setFriendsDetails([]);
          }

          // Fetch pending requests details
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
            setPendingRequestsDetails(
              (await Promise.all(requestPromises)).filter(
                Boolean
              ) as UserProfile[]
            );
          } else {
            setPendingRequestsDetails([]);
          }
        } else if (user.displayName) {
          createUserDocument(user, user.displayName);
        }
      });
      return () => unsubProfile();
    } else {
      setUserProfile(null);
      setFriendsDetails([]);
      setPendingRequestsDetails([]);
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
      await updateProfile(userCredential.user, { displayName: playerName });
      await createUserDocument(userCredential.user, playerName);
      // Auth state listener will handle the rest
    } catch (err: any) {
      setError(err.message);
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
      // Auth state listener will handle the rest
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    await signOut(auth);
    setLoading(false);
  };

  // --- Friend Handlers ---
  const handleSearchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !user) return;
    setSearchPerformed(true);
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
    await sendFriendRequest(user.uid, targetUserId).catch((err) =>
      setError(err.message)
    );
  };
  const handleAcceptRequest = async (requesterId: string) => {
    if (!user) return;
    await acceptFriendRequest(user.uid, requesterId).catch((err) =>
      setError(err.message)
    );
  };
  const handleDeclineRequest = async (requesterId: string) => {
    if (!user) return;
    await declineFriendRequest(user.uid, requesterId, "decline").catch((err) =>
      setError(err.message)
    );
  };
  const handleCancelRequest = async (targetUserId: string) => {
    if (!user) return;
    await declineFriendRequest(user.uid, targetUserId, "cancel").catch((err) =>
      setError(err.message)
    );
  };
  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;
    await removeFriend(user.uid, friendId).catch((err) =>
      setError(err.message)
    );
  };

  const handleCopyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setIsUidCopied(true);
      setTimeout(() => {
        setIsUidCopied(false);
      }, 2000); // Reset after 2 seconds
    }
  };

  const getFriendStatus = (targetId: string) => {
    if (!userProfile) return null;
    if (userProfile.friends.includes(targetId)) return "friends";
    if (userProfile.pendingRequests.includes(targetId)) return "pending_theirs";
    if (userProfile.sentRequests.includes(targetId)) return "pending_mine";
    return null;
  };

  // --- Render ---
  if (isAuthLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: "url('/main_bg.png')" }}
      >
        <div className="flex min-h-screen w-full items-center justify-center bg-black/70">
          <div className="h-16 w-16 animate-spin rounded-full border- border-solid border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <main
      className="flex min-h-screen flex-col bg-cover bg-center"
      style={{ backgroundImage: "url('/main_bg.png')" }}
    >
      <div className="flex min-h-screen w-full flex-col bg-black/70 p-2 sm:p-6 md:p-8">
        {user ? (
          // --- LOGGED IN VIEW ---
          <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col">
            <header className="flex justify-between items-center mb-6 md:mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                Profile
              </h1>
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg transition-all hover:bg-white/20"
                aria-label="Back to home"
              >
                <FaArrowLeft />
                <span>Home</span>
              </Link>
            </header>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-8">
              {/* Left Column: Profile Info */}
              <div className="md:col-span-1 bg-gray-800/50 border border-white/20 rounded-xl p-2 sm:p-6 flex flex-col">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 text-white bg-blue-600 rounded-full flex items-center justify-center text-3xl font-bold">
                    {user.displayName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white truncate">
                      {user.displayName}
                    </h2>
                    <p className="text-sm text-white/60 break-all">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white/70">
                    User ID
                  </label>
                  <div className="flex items-center gap-2">
                    <p className="flex-1 px-3 py-2 bg-black/20 text-white/80 rounded-md text-xs break-all">
                      {user.uid}
                    </p>
                    <button
                      onClick={handleCopyUid}
                      className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                      title="Copy User ID"
                    >
                      {isUidCopied ? (
                        <FaClipboardCheck className="text-green-400" />
                      ) : (
                        <FaCopy />
                      )}
                    </button>
                  </div>
                </div>
                <div className="mt-auto">
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-red-600/80 text-white rounded-lg text-lg font-semibold transition-all hover:bg-red-500/80 active:scale-95 disabled:bg-gray-500"
                  >
                    {loading ? "Signing Out..." : "Sign Out"}
                  </button>
                </div>
              </div>

              {/* Right Column: Friends Management */}
              <div className="md:col-span-2 bg-gray-800/50 border border-white/20 rounded-xl p-2 sm:p-6 space-y-6 overflow-y-auto">
                {/* Search Users */}
                <form onSubmit={handleSearchUsers} className="space-y-2">
                  <div className="flex items-center gap-2 relative">
                    <h3 className="text-xl font-semibold text-white">
                      Add Friend
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowSearchInfo(!showSearchInfo)}
                      onBlur={() => setShowSearchInfo(false)} // Hide on blur
                      className="text-white/50 hover:text-white"
                    >
                      <FaQuestionCircle />
                    </button>
                    {showSearchInfo && (
                      <div className="absolute top-full left-0 mt-2 w-full max-w-xs bg-gray-900 border border-white/20 text-white/90 text-sm rounded-lg p-3 shadow-lg z-10">
                        <p>The search is case-sensitive.</p>
                        <p>
                          You can search for friends by their exact display name
                          or by their User ID.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search by name or User ID"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (e.target.value.trim() === "") setSearchResults([]);
                      }}
                      className="flex-1 px-4 py-2 bg-white/10 text-white placeholder-white/50 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={friendSearchLoading}
                      className="p-3 bg-blue-600/80 rounded-lg hover:bg-blue-500/80"
                    >
                      {friendSearchLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <FaSearch />
                      )}
                    </button>
                  </div>
                </form>

                {/* Search Results */}
                <div className="space-y-2">
                  {searchPerformed &&
                    !friendSearchLoading &&
                    searchResults.length === 0 && (
                      <p className="text-center text-white/60">
                        No users found.
                      </p>
                    )}
                  {searchResults.map((result) => {
                    const status = getFriendStatus(result.id);
                    return (
                      <div
                        key={result.id}
                        className="flex items-center justify-between text-white/80 bg-black/20 p-2 rounded-lg"
                      >
                        <span className="truncate">{result.displayName}</span>
                        {status === "friends" && (
                          <span className="flex items-center gap-1 text-green-400">
                            <FaUserCheck /> Friends
                          </span>
                        )}
                        {status === "pending_mine" && (
                          <button
                            onClick={() => handleCancelRequest(result.id)}
                            className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300"
                          >
                            <FaUserClock /> Sent
                          </button>
                        )}
                        {status === "pending_theirs" && (
                          <span className="flex items-center gap-1 text-blue-400">
                            <FaUserPlus /> Request
                          </span>
                        )}
                        {status === null && (
                          <button
                            onClick={() => handleSendRequest(result.id)}
                            className="p-2 bg-green-600/80 rounded-lg hover:bg-green-500/80"
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
                    <h3 className="text-xl text-white font-semibold">
                      Friend Requests
                    </h3>
                    {pendingRequestsDetails.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between text-white/80 bg-black/20 p-2 rounded-lg"
                      >
                        <span className="truncate">{req.displayName}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            className="p-2 bg-green-600/80 rounded-lg hover:bg-green-500/80"
                          >
                            <FaCheck />
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(req.id)}
                            className="p-2 bg-red-600/80 rounded-lg hover:bg-red-500/80"
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
                  <h3 className="text-xl text-white font-semibold">
                    My Friends
                  </h3>
                  {friendsDetails.length === 0 && (
                    <p className="text-center text-white/60">
                      You haven't added any friends yet.
                    </p>
                  )}
                  {friendsDetails.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between text-white/80 bg-black/20 p-2 rounded-lg"
                    >
                      <span className="truncate">{friend.displayName}</span>
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="p-2 bg-red-600/80 rounded-lg hover:bg-red-500/80"
                      >
                        <FaUserMinus />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // --- LOGGED OUT VIEW ---
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-gray-800 border border-white/20 rounded-xl p-6 sm:p-8 text-white shadow-2xl w-full max-w-md">
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
                    className="w-full px-4 py-3 bg-white/10 text-white placeholder-white/50 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 text-white placeholder-white/50 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 text-white placeholder-white/50 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {error && (
                  <p className="text-red-400 text-sm text-center">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-green-600/80 text-white rounded-lg text-xl font-semibold transition-all hover:bg-green-500/80 active:scale-95 disabled:bg-gray-500"
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
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

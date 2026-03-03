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
  FaTrophy,
  FaLevelUpAlt,
  FaPalette,
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
import { ACHIEVEMENTS_LIST } from "../lib/achievements";
import { updateDoc } from "firebase/firestore";
import { getCurrentLevel } from "../lib/levels";
import { storeItems, StoreItem } from "@/data/storeItems";
import { Coins } from "lucide-react";

interface UserProfile {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  friends: string[];
  pendingRequests: string[];
  sentRequests: string[];
  achievements?: Record<string, number>;
  xp?: number;
  wins?: number;
  coins?: number;
  points?: number;
  inventory?: string[];
  equippedAvatar?: string;
  equippedFrame?: string;
  equippedCardBack?: string;
}

const AVATAR_COLORS = [
  "bg-red-600",
  "bg-orange-600",
  "bg-amber-600",
  "bg-yellow-600",
  "bg-lime-600",
  "bg-green-600",
  "bg-emerald-600",
  "bg-teal-600",
  "bg-cyan-600",
  "bg-sky-600",
  "bg-blue-600",
  "bg-indigo-600",
  "bg-violet-600",
  "bg-purple-600",
  "bg-fuchsia-600",
  "bg-pink-600",
  "bg-rose-600",
];

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [level, setLevel] = useState(1);
  const [achievementPoints, setAchievementPoints] = useState(0);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [activeTab, setActiveTab] = useState<"friends" | "inventory">(
    "friends",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
  const [previewItem, setPreviewItem] = useState<StoreItem | null>(null);
  const [isRemoveMode, setIsRemoveMode] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<UserProfile | null>(
    null,
  );

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

          setLevel(getCurrentLevel(data.xp || 0));

          // Use stored points from user profile
          setAchievementPoints(data.points || 0);

          if (data.friends && data.friends.length > 0) {
            const friendPromises = data.friends.map(async (friendId) => {
              const friendDoc = await getDoc(getUserDocRef(friendId));
              return friendDoc.exists()
                ? ({ ...friendDoc.data(), id: friendDoc.id } as UserProfile)
                : null;
            });
            setFriendsDetails(
              (await Promise.all(friendPromises)).filter(
                Boolean,
              ) as UserProfile[],
            );
          } else {
            setFriendsDetails([]);
          }

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
              },
            );
            setPendingRequestsDetails(
              (await Promise.all(requestPromises)).filter(
                Boolean,
              ) as UserProfile[],
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
      setAchievementPoints(0);
      setLevel(1);
    }
  }, [user]);

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
        password,
      );
      await updateProfile(userCredential.user, { displayName: playerName });
      await createUserDocument(userCredential.user, playerName);
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
      setError(err.message),
    );
  };
  const handleAcceptRequest = async (requesterId: string) => {
    if (!user) return;
    await acceptFriendRequest(user.uid, requesterId).catch((err) =>
      setError(err.message),
    );
  };
  const handleDeclineRequest = async (requesterId: string) => {
    if (!user) return;
    await declineFriendRequest(user.uid, requesterId, "decline").catch((err) =>
      setError(err.message),
    );
  };
  const handleCancelRequest = async (targetUserId: string) => {
    if (!user) return;
    await declineFriendRequest(user.uid, targetUserId, "cancel").catch((err) =>
      setError(err.message),
    );
  };
  const handleRemoveFriend = (friend: UserProfile) => {
    setFriendToRemove(friend);
  };

  const confirmRemoveFriend = async () => {
    if (!user || !friendToRemove) return;
    await removeFriend(user.uid, friendToRemove.id).catch((err) =>
      setError(err.message),
    );
    setFriendToRemove(null);
    setIsRemoveMode(false);
  };

  const handleCopyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setIsUidCopied(true);
      setTimeout(() => {
        setIsUidCopied(false);
      }, 2000);
    }
  };

  const getFriendStatus = (targetId: string) => {
    if (!userProfile) return null;
    if (userProfile.friends.includes(targetId)) return "friends";
    if (userProfile.pendingRequests.includes(targetId)) return "pending_theirs";
    if (userProfile.sentRequests.includes(targetId)) return "pending_mine";
    return null;
  };

  const handleEquip = async (item: StoreItem) => {
    if (!user || !userProfile) return;
    try {
      const userRef = getUserDocRef(user.uid);
      let field = "";
      let currentEquipped: string | undefined | null = null;

      if (item.type === "avatar") {
        field = "equippedAvatar";
        currentEquipped = userProfile.equippedAvatar;
      } else if (item.type === "frame") {
        field = "equippedFrame";
        currentEquipped = userProfile.equippedFrame;
      } else if (item.type === "card-back") {
        field = "equippedCardBack";
        currentEquipped = userProfile.equippedCardBack;
      }

      if (field) {
        const isEquipped = currentEquipped === item.id;
        await updateDoc(userRef, {
          [field]: isEquipped ? null : item.id,
        });
      }
    } catch (err) {
      console.error("Error equipping item:", err);
    }
  };

  const currentAvatarId =
    previewItem?.type === "avatar"
      ? previewItem.id
      : userProfile?.equippedAvatar;
  const currentFrameId =
    previewItem?.type === "frame" ? previewItem.id : userProfile?.equippedFrame;

  const equippedAvatarItem = storeItems.find((i) => i.id === currentAvatarId);
  const equippedFrameItem = storeItems.find((i) => i.id === currentFrameId);

  // List of frame IDs that are light-colored and require dark text
  const LIGHT_FRAMES = ["frame_flames", "frame_gold", "frame_silver"]; // Add your light frame IDs here
  const isLightFrame =
    equippedFrameItem && LIGHT_FRAMES.includes(equippedFrameItem.id);
  const nameColorClass = isLightFrame ? "text-gray-900" : "text-white";
  const emailColorClass = isLightFrame ? "text-gray-900" : "text-white/60";

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

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-8 backdrop-blur-md">
              {/* Left Column: Profile Info */}
              <div className="md:col-span-1 bg-gray-800/50 border border-white/20 rounded-xl p-2 sm:p-6 flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-6">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center z-10">
                        {equippedAvatarItem ? (
                          <img
                            src={equippedAvatarItem.imageUrl}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-3xl font-bold text-white">
                            {user.displayName?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative overflow-hidden px-4 py-1 rounded-lg flex-1">
                      {equippedFrameItem && (
                        <img
                          src={equippedFrameItem.imageUrl}
                          alt="Frame"
                          className="absolute inset-0 w-full h-full z-0 pointer-events-none object-fill opacity-80"
                        />
                      )}
                      <div className="relative z-10">
                        <h2
                          className={`text-black/90 text-2xl font-bold truncate ${nameColorClass}`}
                        >
                          {user.displayName}
                        </h2>
                        <p className={`text-xs break-all ${emailColorClass}`}>
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/levels"
                    className="flex flex-col items-center justify-center p-2 md:p-0 hover:bg-white/20 transition-colors shrink-0"
                  >
                    <span className="text-xs text-cyan-400 font-bold uppercase">
                      Level
                    </span>
                    <span className="text-3xl font-black text-white">
                      {level}
                    </span>
                  </Link>
                </div>

                <div className="mb-4 p-4 bg-linear-to-r from-yellow-900/20 to-transparent border border-yellow-500/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <Coins className="text-yellow-400 text-xl" />
                    </div>
                    <div>
                      <p className="text-xs text-yellow-500/80 font-bold uppercase tracking-wider">
                        Coins
                      </p>
                      <p className="text-2xl font-black text-white">
                        {(userProfile?.coins || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-6 p-4 bg-linear-to-r from-yellow-900/20 to-transparent border border-yellow-500/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <FaTrophy className="text-yellow-400 text-xl" />
                    </div>
                    <div>
                      <p className="text-xs text-yellow-500/80 font-bold uppercase tracking-wider">
                        Achievement Points
                      </p>
                      <p className="text-2xl font-black text-white">
                        {achievementPoints}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-2 p-4 bg-linear-to-r from-blue-900/20 to-transparent border border-blue-500/20 rounded-xl">
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
              <div className="md:col-span-2 bg-gray-800/50 border border-white/20 backdrop-blur-md rounded-xl p-2 sm:p-6 space-y-6 overflow-y-auto">
                {/* Tabs */}
                <div className="flex items-center gap-4 pb-4 sticky top-0 z-10 -mx-2 px-4 sm:-mx-6 sm:px-6 pt-2 -mt-2 sm:-mt-6">
                  <button
                    onClick={() => setActiveTab("friends")}
                    className={`flex items-center gap-2 pb-2 px-2 transition-colors ${activeTab === "friends" ? "text-green-400 border-b-2 border-green-400 font-bold" : "text-white/60 hover:text-white"}`}
                  >
                    <FaUserFriends /> Friends
                  </button>
                  <button
                    onClick={() => setActiveTab("inventory")}
                    className={`flex items-center gap-2 pb-2 px-2 transition-colors ${activeTab === "inventory" ? "text-amber-400 border-b-2 border-amber-400 font-bold" : "text-white/60 hover:text-white"}`}
                  >
                    <FaPalette /> Customization
                  </button>
                </div>

                {activeTab === "friends" ? (
                  <>
                    {/* Search Users */}
                    <form onSubmit={handleSearchUsers} className="space-y-2">
                      <div className="flex items-center gap-2 relative">
                        <h3 className="text-xl font-semibold text-white">
                          Add Friend
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowSearchInfo(!showSearchInfo)}
                          onBlur={() => setShowSearchInfo(false)}
                          className="text-white/50 hover:text-white"
                        >
                          <FaQuestionCircle />
                        </button>
                        {showSearchInfo && (
                          <div className="absolute top-full left-0 mt-2 w-full max-w-xs bg-gray-900 border border-white/20 text-white/90 text-sm rounded-lg p-3 shadow-lg z-10">
                            <p>The search is case-sensitive.</p>
                            <p>
                              You can search for friends by their exact display
                              name or by their User ID.
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
                            setSearchQuery(e.target.value.replace(/\s/g, ""));
                            if (e.target.value.trim() === "")
                              setSearchResults([]);
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
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl text-white font-semibold">
                          My Friends
                        </h3>
                        <button
                          onClick={() => setIsRemoveMode(!isRemoveMode)}
                          className={`text-sm px-3 py-1 rounded-full transition-colors ${isRemoveMode ? "bg-red-600 text-white" : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"}`}
                        >
                          {isRemoveMode ? "Done" : "Remove"}
                        </button>
                      </div>
                      {friendsDetails.length === 0 && (
                        <p className="text-center text-white/60">
                          You haven't added any friends yet.
                        </p>
                      )}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        {friendsDetails.map((friend) => {
                          const friendFrame = storeItems.find(
                            (i) => i.id === friend.equippedFrame,
                          );
                          const friendAvatar = storeItems.find(
                            (i) => i.id === friend.equippedAvatar,
                          );
                          const isFriendLightFrame =
                            friendFrame &&
                            LIGHT_FRAMES.includes(friendFrame.id);
                          const friendNameColorClass = isFriendLightFrame
                            ? "text-gray-900 font-bold"
                            : "text-white/80";
                          const colorIndex =
                            friend.id
                              .split("")
                              .reduce(
                                (acc, char) => acc + char.charCodeAt(0),
                                0,
                              ) % AVATAR_COLORS.length;
                          const avatarColor = AVATAR_COLORS[colorIndex];
                          return (
                            <div
                              key={friend.id}
                              className="flex items-center gap-2 bg-black/20 p-2 rounded-lg relative overflow-hidden group"
                            >
                              {friendFrame && (
                                <img
                                  src={friendFrame.imageUrl}
                                  alt="Frame"
                                  className="absolute inset-0 w-full h-full z-0 pointer-events-none object-fill opacity-80"
                                />
                              )}
                              <div
                                className={`w-10 h-10 rounded-full overflow-hidden ${avatarColor} flex items-center justify-center shrink-0 z-10`}
                              >
                                {friendAvatar ? (
                                  <img
                                    src={friendAvatar.imageUrl}
                                    alt={friend.displayName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-sm font-bold text-white">
                                    {friend.displayName
                                      ?.charAt(0)
                                      .toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 z-10">
                                <span
                                  className={`truncate block w-full text-md ${friendNameColorClass}`}
                                >
                                  {friend.displayName}
                                </span>
                              </div>
                              {isRemoveMode && (
                                <button
                                  onClick={() => handleRemoveFriend(friend)}
                                  className="p-2 bg-red-600/80 text-white rounded-lg hover:bg-red-500/80 shrink-0 z-20"
                                  title="Remove Friend"
                                >
                                  <FaUserMinus />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-8 animate-fadeIn">
                    {["avatar", "frame", "card-back"].map((type) => {
                      const items = storeItems.filter(
                        (item) =>
                          item.type === type &&
                          userProfile?.inventory?.includes(item.id),
                      );

                      if (items.length === 0) return null;

                      return (
                        <div key={type} className="space-y-3">
                          <h3 className="text-lg font-bold text-white capitalize flex items-center gap-2">
                            {type.replace("-", " ")}s
                            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/60">
                              {items.length}
                            </span>
                          </h3>
                          <div className="flex overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                            {items.map((item) => {
                              const isEquipped =
                                (type === "avatar" &&
                                  userProfile?.equippedAvatar === item.id) ||
                                (type === "frame" &&
                                  userProfile?.equippedFrame === item.id) ||
                                (type === "card-back" &&
                                  userProfile?.equippedCardBack === item.id);

                              return (
                                <div
                                  key={item.id}
                                  onClick={() => handleEquip(item)}
                                  onMouseEnter={() => setPreviewItem(item)}
                                  onMouseLeave={() => setPreviewItem(null)}
                                  className={`relative p-2 m-2 rounded-xl border cursor-pointer transition-all hover:scale-105 group min-w-[6rem] w-24 shrink-0 ${
                                    isEquipped
                                      ? "bg-green-500/10 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                                      : "bg-black/40 border-white/10 hover:border-white/30 hover:bg-white/5"
                                  }`}
                                >
                                  <div className="aspect-square relative mb-1 flex items-center justify-center p-1">
                                    <img
                                      src={item.imageUrl}
                                      alt={item.name}
                                      className="max-w-full max-h-full object-contain drop-shadow-lg"
                                    />
                                  </div>
                                  <p className="text-xs text-center text-white/90 font-medium truncate">
                                    {item.name}
                                  </p>
                                  {isEquipped && (
                                    <div className="absolute top-2 right-2 text-green-400 bg-black/80 rounded-full p-1 shadow-sm border border-green-500/30">
                                      <FaCheck size={10} />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Remove Friend Confirmation Modal */}
            {friendToRemove && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-gray-800 border border-white/20 rounded-xl p-6 max-w-sm w-full shadow-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">
                    Remove Friend?
                  </h3>
                  <p className="text-white/80 mb-6">
                    Are you sure you want to remove{" "}
                    <span className="font-bold text-white">
                      {friendToRemove.displayName}
                    </span>{" "}
                    from your friends list?
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setFriendToRemove(null)}
                      className="px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmRemoveFriend}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                    onChange={(e) =>
                      setPlayerName(e.target.value.replace(/\s/g, ""))
                    }
                    className="w-full px-4 py-3 bg-white/10 text-white placeholder-white/50 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.replace(/\s/g, ""))}
                  className="w-full px-4 py-3 bg-white/10 text-white placeholder-white/50 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value.replace(/\s/g, ""))
                  }
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

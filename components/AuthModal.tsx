"use client";

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
} from "react-icons/fa";
import type { User } from "firebase/auth";

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

type AuthMode = "login" | "signup";
type ModalTab = "profile" | "friends";

interface AuthModalProps {
  isOpen: boolean;
  isLoading: boolean;
  isAuthLoading: boolean;
  user: User | null;
  authMode: AuthMode;
  modalTab: ModalTab;
  email: string;
  password: string;
  playerName: string;
  error: string | null;
  searchQuery: string;
  searchResults: UserProfile[];
  searchPerformed: boolean;
  friendSearchLoading: boolean;
  pendingRequestsDetails: UserProfile[];
  friendsDetails: UserProfile[];

  onClose: () => void;
  setModalTab: (tab: ModalTab) => void;
  handleLogout: () => void;
  handleLogin: () => void;
  handleSignUp: () => void;
  setAuthMode: (mode: AuthMode) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setPlayerName: (name: string) => void;
  setError: (error: string | null) => void;
  handleSearchUsers: (e: React.FormEvent) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: UserProfile[]) => void;
  setSearchPerformed: (performed: boolean) => void;
  getFriendStatus: (
    targetId: string
  ) => "friends" | "pending_theirs" | "pending_mine" | null;
  handleCancelRequest: (targetUserId: string) => void;
  handleSendRequest: (targetUserId: string) => void;
  handleAcceptRequest: (requesterId: string) => void;
  handleDeclineRequest: (requesterId: string) => void;
  handleRemoveFriend: (friendId: string) => void;
}

export const AuthModal = ({
  isOpen,
  isLoading,
  isAuthLoading,
  user,
  authMode,
  modalTab,
  email,
  password,
  playerName,
  error,
  searchQuery,
  searchResults,
  searchPerformed,
  friendSearchLoading,
  pendingRequestsDetails,
  friendsDetails,
  onClose,
  setModalTab,
  handleLogout,
  handleLogin,
  handleSignUp,
  setAuthMode,
  setEmail,
  setPassword,
  setPlayerName,
  setError,
  handleSearchUsers,
  setSearchQuery,
  setSearchResults,
  setSearchPerformed,
  getFriendStatus,
  handleCancelRequest,
  handleSendRequest,
  handleAcceptRequest,
  handleDeclineRequest,
  handleRemoveFriend,
}: AuthModalProps) => {
  if (!isOpen || isAuthLoading) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-white/20 rounded-xl p-6 sm:p-8 text-white shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {user ? (
          // --- LOGGED IN VIEW ---
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white truncate">
                {user.displayName || user.email}
              </h2>
              <button
                onClick={onClose}
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

            {/* --- Tab Content --- */}
            {modalTab === "profile" && (
              <div className="space-y-4 animate-fadeIn">
                <p className="text-white/80">
                  You are logged in as:
                  <br />
                  <strong className="text-white text-lg break-all">
                    {user.displayName ||
                      user.email ||
                      "Sign-out and Login again"}
                  </strong>
                </p>
                <button
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-red-600/80 text-white rounded-lg text-xl font-semibold transition-all hover:bg-red-500/80 active:scale-95 disabled:bg-gray-500"
                >
                  {isLoading ? "Signing Out..." : "Sign Out"}
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
                        <span className="truncate">{req.displayName}</span>
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
                      <span className="truncate">{friend.displayName}</span>
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
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-3 bg-green-600/80 text-white rounded-lg text-xl font-semibold transition-all hover:bg-green-500/80 active:scale-95 disabled:bg-gray-500 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading
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
                className="w-full text-center text-blue-400 hover:text-blue-300 "
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
  );
};

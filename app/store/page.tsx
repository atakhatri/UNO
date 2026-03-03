// c:\Users\atakh\OneDrive\Documents\GitHub\UNO\app\store\page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FaArrowLeft,
  FaStore,
  FaCheck,
  FaSearch,
  FaShoppingCart,
  FaEye,
  FaTimes,
} from "react-icons/fa";
import { Coins } from "lucide-react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  updateDoc,
  arrayUnion,
  increment,
  onSnapshot,
} from "firebase/firestore";
import { auth, getUserDocRef } from "../lib/firebase";
import { storeItems, StoreItem, ItemType } from "@/data/storeItems";

// Extended UserProfile to include inventory
interface UserProfile {
  coins?: number;
  inventory?: string[];
}

export default function StorePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [purchasedItem, setPurchasedItem] = useState<StoreItem | null>(null);
  const [previewItem, setPreviewItem] = useState<StoreItem | null>(null);
  const [filter, setFilter] = useState<ItemType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Select a featured item (e.g., the second item or the first one)
  const featuredItem =
    storeItems.length > 0 ? storeItems[1] || storeItems[0] : null;

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = undefined;
      }

      if (currentUser) {
        const userRef = getUserDocRef(currentUser.uid);
        unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          }
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const handlePurchase = (item: StoreItem) => {
    if (!user || !userProfile) return;

    if ((userProfile.coins || 0) < item.price) {
      alert("Not enough coins!");
      return;
    }

    setSelectedItem(item);
  };

  const confirmPurchase = async () => {
    if (!user || !selectedItem) return;

    setPurchasing(selectedItem.id);
    try {
      const userRef = getUserDocRef(user.uid);

      // Atomic update in Firestore
      await updateDoc(userRef, {
        coins: increment(-selectedItem.price),
        inventory: arrayUnion(selectedItem.id),
      });
      setPurchasedItem(selectedItem);
      setSelectedItem(null);
    } catch (error) {
      console.error("Purchase failed", error);
      alert("Purchase failed. Please try again.");
    } finally {
      setPurchasing(null);
    }
  };

  const searchFilteredItems = storeItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.type.replace("-", " ") + "s")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  const categories: ItemType[] = ["card-back", "avatar", "frame"];
  const displayedCategories =
    filter === "all" ? categories : [filter as ItemType];

  const hasAnyItems = displayedCategories.some(
    (cat) => searchFilteredItems.filter((i) => i.type === cat).length > 0,
  );

  const filterStyles = {
    all: "bg-indigo-500 text-white",
    "card-back": "bg-purple-500 text-white",
    avatar: "bg-blue-500 text-white",
    frame: "bg-orange-500 text-white",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <FaStore size={48} className="text-gray-600" />
          <p>Loading Store...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: "url('/main_bg.png')",
      }}
    >
      <div className="min-h-screen w-full bg-slate-900/90 text-white p-4 md:p-8 font-sans selection:bg-yellow-500 selection:text-black">
        {/* Navigation */}
        <div className="max-w-7xl mx-auto mb-8">
          <button
            onClick={() => router.push("/")}
            className="flex items-center text-slate-300 hover:text-white transition-colors mb-6 group"
          >
            <FaArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />{" "}
            Back to Home
          </button>

          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-r from-purple-400 via-pink-500 to-red-500 mb-2 flex items-center gap-3">
                <FaStore className="text-purple-400" /> ITEM STORE
              </h1>
              <p className="text-slate-300 text-lg">
                Spend your hard-earned coins on exclusive items!
              </p>
            </div>

            {/* Coins Display */}
            <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-xl flex items-center gap-6">
              <div className="relative w-16 h-16 flex items-center justify-center bg-yellow-500/10 rounded-full">
                <Coins className="w-8 h-8 text-yellow-400" />
              </div>
              <div>
                <div className="text-sm text-slate-400 uppercase tracking-widest font-semibold">
                  Your Balance
                </div>
                <div className="text-3xl font-black text-yellow-400">
                  {(userProfile?.coins || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="mt-8 space-y-6">
            {/* Search Bar */}
            <div className="relative max-w-md">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all backdrop-blur-sm"
              />
            </div>

            {/* Featured / Hero Section */}
            {featuredItem && !searchQuery && (
              <div className="relative w-full bg-linear-to-br from-amber-900/80 via-orange-900/80 to-yellow-900/80 rounded-3xl p-6 sm:p-10 overflow-hidden border border-white/10 shadow-2xl group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                  <div className="shrink-0 w-40 h-40 sm:w-56 sm:h-56 bg-black/40 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/10 shadow-xl transform group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                    {featuredItem.imageUrl ? (
                      <img
                        src={featuredItem.imageUrl}
                        alt={featuredItem.name}
                        className="w-full h-full object-contain py-2"
                      />
                    ) : (
                      <div className="text-8xl sm:text-9xl filter drop-shadow-lg">
                        {featuredItem.type === "card-back"
                          ? "🎴"
                          : featuredItem.type === "avatar"
                            ? "👤"
                            : "🖼️"}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-center md:text-left space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-linear-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 rounded-full text-xs font-bold uppercase tracking-wide border border-yellow-500/30 mb-3">
                      <FaStore className="text-yellow-400" /> Trending Now
                    </div>

                    <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                      {featuredItem.name}
                    </h2>

                    <p className="text-lg text-slate-300 max-w-xl leading-relaxed mx-auto md:mx-0">
                      {featuredItem.description}
                    </p>

                    <div className="pt-4 flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                      {userProfile?.inventory?.includes(featuredItem.id) ? (
                        <button
                          disabled
                          className="px-8 py-3 bg-green-500/20 text-green-400 border border-green-500/50 rounded-xl font-bold text-lg flex items-center gap-2 cursor-default"
                        >
                          <FaCheck /> Owned
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePurchase(featuredItem)}
                          disabled={
                            (userProfile?.coins || 0) < featuredItem.price ||
                            purchasing === featuredItem.id
                          }
                          className={`px-8 py-3 rounded-xl font-bold text-lg flex items-center gap-3 transition-all transform hover:-translate-y-1 active:scale-95 ${
                            (userProfile?.coins || 0) >= featuredItem.price
                              ? "bg-linear-to-r from-yellow-400 to-orange-500 text-black shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40"
                              : "bg-slate-700 text-slate-500 cursor-not-allowed"
                          }`}
                        >
                          {purchasing === featuredItem.id ? (
                            <span className="animate-pulse">Processing...</span>
                          ) : (
                            <>
                              Purchase for{" "}
                              <Coins className="w-5 h-5 fill-current" />{" "}
                              {featuredItem.price.toLocaleString()}
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => setPreviewItem(featuredItem)}
                        className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl font-bold text-lg flex items-center gap-2 transition-all"
                      >
                        <FaEye /> Preview
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="sticky top-0 z-30 py-2 -mx-4 px-4 md:static md:mx-0 md:px-0 md:py-0 bg-slate-900/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none transition-all">
              <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl max-w-full w-fit backdrop-blur-sm border border-slate-700/50 overflow-x-auto no-scrollbar mx-auto">
                {["all", "card-back", "avatar", "frame"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-6 py-2 rounded-lg text-sm font-bold uppercase whitespace-nowrap transition-all duration-200 ${
                      filter === f
                        ? `${
                            filterStyles[f as keyof typeof filterStyles] ||
                            "bg-gray-600"
                          } shadow-lg scale-105`
                        : "text-slate-400 hover:text-white hover:bg-slate-700"
                    }`}
                  >
                    {f.replace("-", " ")}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Items Sections */}
        <div className="max-w-7xl mx-auto space-y-12 pb-12">
          {displayedCategories.map((category) => {
            const items = searchFilteredItems.filter(
              (item) => item.type === category,
            );

            if (items.length === 0) return null;

            return (
              <section key={category} className="space-y-4">
                <div className="px-2 flex items-center gap-3">
                  <h2 className="text-2xl md:text-3xl font-bold text-white capitalize flex items-center gap-2">
                    {category.replace("-", " ")}s
                    <span className="text-sm font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                      {items.length}
                    </span>
                  </h2>
                </div>

                <div className="flex overflow-x-auto gap-4 pb-6 px-2 snap-x snap-mandatory scroll-smooth no-scrollbar">
                  {items.map((item) => {
                    const isOwned = userProfile?.inventory?.includes(item.id);
                    const canAfford = (userProfile?.coins || 0) >= item.price;

                    return (
                      <div
                        key={item.id}
                        className="snap-center shrink-0 w-[280px] bg-slate-800/40 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-4 hover:border-purple-500/30 transition-all hover:shadow-2xl hover:shadow-purple-900/20 group relative overflow-hidden backdrop-blur-sm"
                      >
                        {/* Background Glow Effect */}
                        <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        {/* Item Preview */}
                        <div className="w-full aspect-square max-w-[200px] bg-slate-900/50 rounded-xl flex items-center justify-center mb-2 relative overflow-hidden border border-white/5 group-hover:border-white/20 transition-colors shadow-inner">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-contain p-4 transform group-hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <div className="text-center p-4 transform group-hover:scale-110 transition-transform duration-300">
                              <div className="text-6xl mb-4 drop-shadow-lg">
                                {item.type === "card-back"
                                  ? "🎴"
                                  : item.type === "avatar"
                                    ? "👤"
                                    : "🖼️"}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="text-center w-full">
                          <h3 className="text-xl font-bold text-white mb-1 tracking-wide truncate">
                            {item.name}
                          </h3>
                          <p className="text-sm text-slate-400 mb-4 min-h-10 leading-relaxed line-clamp-2">
                            {item.description}
                          </p>
                        </div>

                        <div className="mt-auto w-full z-10 flex gap-2">
                          <button
                            onClick={() => setPreviewItem(item)}
                            className="px-4 bg-slate-700/50 hover:bg-slate-600 text-white border border-white/10 rounded-xl font-bold transition-all flex items-center justify-center"
                            title="Preview"
                          >
                            <FaEye />
                          </button>
                          {isOwned ? (
                            <button
                              disabled
                              className="flex-1 py-3 bg-green-500/10 text-green-400 border border-green-500/30 rounded-xl font-bold flex items-center justify-center gap-2 cursor-default"
                            >
                              <FaCheck /> Owned
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePurchase(item)}
                              disabled={!canAfford || purchasing === item.id}
                              className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                canAfford
                                  ? "bg-linear-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black shadow-lg hover:shadow-orange-500/20 active:scale-95"
                                  : "bg-slate-700 text-slate-500 cursor-not-allowed opacity-50"
                              }`}
                            >
                              {purchasing === item.id ? (
                                <span className="animate-pulse">
                                  Processing...
                                </span>
                              ) : (
                                <>
                                  <Coins size={18} className="fill-current" />{" "}
                                  {item.price.toLocaleString()}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {!hasAnyItems && (
            <div className="col-span-full py-20 text-center text-slate-500">
              <FaShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-xl font-medium">No items found.</p>
            </div>
          )}
        </div>

        {/* Purchase Confirmation Modal */}
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all scale-100">
              <h3 className="text-2xl font-bold text-white mb-4">
                Confirm Purchase
              </h3>
              <p className="text-slate-300 mb-6">
                Are you sure you want to buy{" "}
                <span className="text-yellow-400 font-bold">
                  {selectedItem.name}
                </span>{" "}
                for{" "}
                <span className="text-yellow-400 font-bold">
                  {selectedItem.price} coins
                </span>
                ?
              </p>
              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 rounded-lg font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                  disabled={!!purchasing}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPurchase}
                  disabled={!!purchasing}
                  className="px-6 py-2 bg-linear-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {purchasing ? "Processing..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {purchasedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-800 border border-green-500/50 rounded-2xl p-8 max-w-sm w-full shadow-2xl shadow-green-500/20 transform transition-all flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <FaCheck className="text-4xl text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Purchase Complete!
              </h3>
              <p className="text-slate-300 mb-8">
                You have successfully purchased{" "}
                <span className="text-yellow-400 font-bold">
                  {purchasedItem.name}
                </span>
              </p>
              <button
                onClick={() => setPurchasedItem(null)}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-green-900/20"
              >
                Awesome!
              </button>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {previewItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewItem(null)}
          >
            <div
              className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl transform transition-all relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewItem(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              >
                <FaTimes size={24} />
              </button>

              <div className="flex flex-col items-center gap-6">
                <div className="w-64 h-64 bg-slate-900/50 rounded-2xl flex items-center justify-center border border-white/10 relative overflow-hidden">
                  {previewItem.imageUrl ? (
                    <img
                      src={previewItem.imageUrl}
                      alt={previewItem.name}
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <div className="text-9xl drop-shadow-2xl">
                      {previewItem.type === "card-back"
                        ? "🎴"
                        : previewItem.type === "avatar"
                          ? "👤"
                          : "🖼️"}
                    </div>
                  )}
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-bold text-white">
                    {previewItem.name}
                  </h3>
                  <p className="text-slate-300 text-lg">
                    {previewItem.description}
                  </p>
                  <div className="inline-block px-4 py-1 bg-slate-700 rounded-full text-sm text-slate-300 capitalize mt-2">
                    {previewItem.type.replace("-", " ")}
                  </div>
                </div>

                <div className="w-full pt-4 border-t border-white/10 flex justify-center">
                  {userProfile?.inventory?.includes(previewItem.id) ? (
                    <button
                      disabled
                      className="px-8 py-3 bg-green-500/20 text-green-400 border border-green-500/50 rounded-xl font-bold text-lg flex items-center gap-2 cursor-default"
                    >
                      <FaCheck /> Owned
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setPreviewItem(null);
                        handlePurchase(previewItem);
                      }}
                      disabled={(userProfile?.coins || 0) < previewItem.price}
                      className={`px-8 py-3 rounded-xl font-bold text-lg flex items-center gap-2 transition-all ${
                        (userProfile?.coins || 0) >= previewItem.price
                          ? "bg-linear-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black shadow-lg"
                          : "bg-slate-700 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      <Coins className="w-5 h-5 fill-current" /> Buy for{" "}
                      {previewItem.price.toLocaleString()}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

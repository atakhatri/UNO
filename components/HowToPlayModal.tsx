"use client";

import { FaTimes } from "react-icons/fa";

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal = ({ isOpen, onClose }: HowToPlayModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-white/20 rounded-xl p-6 sm:p-8 text-white shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            How to Play UNO
          </h2>
          <button
            onClick={onClose}
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
                Match the top card of the discard pile by either number, color,
                or action.
              </li>
              <li>
                For example, if the top card is a red 7, you can play any red
                card or any color 7.
              </li>
              <li>
                If you don't have a playable card, you must draw a card from the
                deck.
              </li>
              <li>
                When you have only one card left, click the{" "}
                <span className="font-bold text-yellow-300">UNO!</span> button
                before your turn ends. If you forget and another player catches
                you, you'll draw two penalty cards!
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 border-b border-white/20 pb-2">
              Special Cards
            </h3>
            <ul className="space-y-3">
              <li>
                <strong className="text-sky-400">Reverse:</strong> Reverses the
                direction of play.
              </li>
              <li>
                <strong className="text-red-400">Skip:</strong> The next player
                in line loses their turn.
              </li>
              <li>
                <strong className="text-green-400">Draw Two:</strong> The next
                player must draw two cards and miss their turn.
              </li>
              <li>
                <strong className="font-bold">Wild:</strong> Allows you to
                change the current color.
              </li>
              <li>
                <strong className="font-black">Wild Draw Four:</strong> Change
                the color and force the next player to draw four cards and lose
                their turn.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

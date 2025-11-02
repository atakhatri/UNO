import { CSSProperties, ReactNode } from "react";
import type { Card } from "./game-logic";
import { BsBanFill, BsFillBanFill } from "react-icons/bs";
import { IoSync } from "react-icons/io5";

interface CardProps {
  card: Card;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  highlight?: boolean;
}

type CardValue = Card["value"];

// This `colorMap` is a helper object. It maps the "color" property of a card
// to a specific hex color for the background, making them more vibrant.
const colorMap: Record<Card["color"], string> = {
  red: "#ff5555",
  green: "#55aa55",
  blue: "#5555ff",
  yellow: "#ffaa00",
  black: "#222222",
};

const textColorMap: Record<Card["color"], string> = {
  red: "text-[#ff5555]",
  green: "text-[#55aa55]",
  blue: "text-[#5555ff]",
  yellow: "text-[#ffaa00]",
  black: "text-white", // Not used in center
};

const SpecialCard = ({
  value,
  cardColor,
}: {
  value: CardValue;
  cardColor: string;
}) => {
  const baseIconClass = "w-12 h-12";
  switch (value) {
    case "skip":
      return (
        <p
          className={`${baseIconClass} text-black/40 mb-8 mr-1 font-extrabold scale-120`}
        >
          ⊘
        </p>
      );
    case "reverse":
      return (
        <IoSync className={`${baseIconClass} text-black/40 font-extrabold `} />
      );
    case "draw-two":
      return (
        <div className={`relative w-14 h-14`}>
          <div className="absolute top-0 left-0 w-8 h-11 rounded-sm border-2 border-white bg-black/20 transform -rotate-12"></div>
          <div className="absolute bottom-0 right-0 w-8 h-11 rounded-sm border-2 border-white bg-black/20 transform rotate-12"></div>
        </div>
      );
    case "wild":
      return (
        <div className="w-12 h-12 rounded-full overflow-hidden">
          <div className="grid grid-cols-2 h-full">
            <div className="bg-[#ff5555]"></div>
            <div className="bg-[#5555ff]"></div>
            <div className="bg-[#ffaa00]"></div>
            <div className="bg-[#55aa55]"></div>
          </div>
        </div>
      );
    case "wild-draw-four":
      return (
        <div className="relative">
          <div className="absolute -inset-2 grid grid-cols-2 grid-rows-2 gap-px">
            <div className="bg-blue-500 rounded-tl-lg"></div>
            <div className="bg-green-500 rounded-tr-lg"></div>
            <div className="bg-red-500 rounded-bl-lg"></div>
            <div className="bg-yellow-500 rounded-br-lg"></div>
          </div>
          <span className="relative text-white font-black text-4xl drop-shadow-md">
            +4
          </span>
        </div>
      );
    default:
      return (
        <span
          className={`${
            textColorMap[cardColor as Card["color"]]
          } font-black italic -rotate-12`}
        >
          {String(value)}
        </span>
      );
  }
};

export const CardComponent = ({
  card,
  onClick,
  highlight = false,
  className,
  style,
}: CardProps) => {
  const cardColorValue = colorMap[card.color] || "#222222";

  const cornerValue = ((): ReactNode => {
    switch (card.value) {
      case "skip":
        return "⊘";
      case "reverse":
        return "⇄";
      case "draw-two":
        return "+2";
      case "wild":
        return null; // Wild cards don't have corner values
      case "wild-draw-four":
        return "+4";
      default:
        return String(card.value);
    }
  })();

  return (
    <button
      onClick={onClick}
      style={{ backgroundColor: cardColorValue, ...style }}
      className={`
        w-28 h-40
        rounded-xl
        p-2
        shadow-lg
        border-4 border-white
        relative
        flex items-center justify-center
        ${
          onClick
            ? "cursor-pointer hover:scale-110 hover:-translate-y-2 transition-transform duration-200"
            : ""
        }
        ${highlight ? "shadow-yellow-400/50 shadow-[0_0_15px]" : ""}
        ${className || ""}
      `}
      disabled={!onClick}
    >
      {/* Corner Value - Top Left */}
      {cornerValue && (
        <div className="absolute top-1 left-2 text-xl font-black text-white">
          {cornerValue}
        </div>
      )}

      {/* Center Oval & Content */}
      <div className="w-full h-2/3 bg-white rounded-[50%/40%] transform -rotate-12 flex items-center justify-center">
        <div className="text-6xl transform rotate-12">
          <SpecialCard value={card.value} cardColor={card.color} />
        </div>
      </div>

      {/* Corner Value - Bottom Right */}
      {cornerValue && (
        <div className="absolute bottom-1 right-2 text-xl font-black text-white transform rotate-180">
          {cornerValue}
        </div>
      )}
    </button>
  );
};

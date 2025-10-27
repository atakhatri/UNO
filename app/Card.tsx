import { CSSProperties } from "react";
import type { Card } from "./game/game-types"; // Import Card from the new types file

interface CardProps {
  card: Card;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

// This `colorMap` is a helper object. It maps the "color" property of a card
// (like "red", "blue", etc.) to a specific Tailwind CSS class for background colors.
const colorMap: Record<Card["color"], string> = {
  red: "bg-red-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  yellow: "bg-yellow-400",
  black: "bg-black",
};

export const CardComponent = ({
  card,
  onClick,
  className,
  style,
}: CardProps) => {
  // We look up the correct Tailwind class from our map based on the card's color.
  const cardColor = colorMap[card.color] || "bg-gray-200";

  // Build display text for corners and center based on the card value.
  // If the card has a `value` property it will be used; otherwise we map some common action names.
  const display = (() => {
    const v = card.value;

    if (v === "skip") return { corners: "⤫", center: "Skip" };
    if (v === "reverse") return { corners: "↺", center: "Rev" };
    if (v === "draw-two") return { corners: "+2", center: "+2" };
    if (v === "wild") return { corners: "★", center: "Wild" };
    if (v === "wild-draw-four") return { corners: "+4", center: "+4" };

    // Default: show the value (number or text) in center and corners
    return { corners: String(v), center: String(v) };
  })();

  return (
    <button
      onClick={onClick}
      style={style}
      // All the styling happens right here in the `className` prop!
      // Each string is a Tailwind utility class that applies a specific CSS rule.
      className={`
        w-20 h-28                         
        rounded-lg                        
        flex items-center justify-center  
        text-white font-bold text-2xl    
        shadow-lg                        
        border-2 border-gray-200         
        relative                          
        ${cardColor}                     
        ${
          onClick
            ? "cursor-pointer hover:scale-105 hover:-translate-y-2 transition-all duration-200"
            : ""
        } 
        ${className || ""}
      `}
      disabled={!onClick}
    >
      <div className="absolute top-2 left-2 text-lg">{display.corners}</div>
      <div className="text-4xl">{display.center}</div>
      <div className="absolute bottom-2 right-2 text-lg transform rotate-180">
        {display.corners}
      </div>
    </button>
  );
};

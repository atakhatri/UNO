export interface Card {
    color: "red" | "green" | "blue" | "yellow" | "black";
    value:
    | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
    | "skip" | "reverse" | "draw-two" | "wild" | "wild-draw-four";
}

export const createDeck = (): Card[] => {
    const colors: Card["color"][] = ["red", "green", "blue", "yellow"];
    const values: Card["value"][] = [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "skip",
        "reverse",
        "draw-two",
    ];

    let deck: Card[] = [];

    colors.forEach((color) => {
        values.forEach((value) => {
            deck.push({ color, value: value });
            if (value !== "0") {
                deck.push({ color, value: value });
            }
        });
    });

    for (let i = 0; i < 4; i++) {
        deck.push({ color: "black", value: "wild" });
        deck.push({ color: "black", value: "wild-draw-four" });
    }

    return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

export const drawCards = (deck: Card[], count: number) => {
    const drawn = deck.slice(0, count);
    const remaining = deck.slice(count);
    return { drawn, remaining };
};

export const isCardPlayable = (card: Card, topOfDiscard: Card): boolean => {
    if (!topOfDiscard) return true;
    if (card.color === "black") return true;
    if (topOfDiscard.color === "black") return true;
    return (
        card.color === topOfDiscard.color || card.value === topOfDiscard.value
    );
};

const CARD_COLOR_TO_TYPE = {
    blue: "spaceShip",
    violet: "duration",
    orange: "event",
    red: "missile",
    green: "defense",
};
const FakeTheSwarmDeck = require("./FakeTheSwarmDeck.js");

module.exports = function CardDataAssembler({ rawCardDataRepository }) {
    return {
        createLibrary,
        createSwarmDeck,
        createRegularDeck,
        createOneOfEach,
        createFromCommonId,
    };

    function createLibrary() {
        return [
            ...rawCardDataRepository.get().map(CardData),
            ...FakeTheSwarmDeck().reduce(
                (acc, value) =>
                    acc.find((v) => v.commonId === value.commonId)
                        ? acc
                        : acc.concat([value]),
                []
            ),
        ];
    }

    function createSwarmDeck() {
        return FakeTheSwarmDeck();
    }

    function createRegularDeck() {
        const rawCardData = rawCardDataRepository.get();
        const cards = [];
        for (const cardJson of rawCardData) {
            const copies = cardJson.number_copies
                ? parseInt(cardJson.number_copies)
                : 1;
            for (let i = 0; i < copies; i++) {
                const card = CardData(cardJson);
                cards.push(card);
            }
        }
        return cards;
    }

    function createOneOfEach() {
        const rawCardData = rawCardDataRepository.get();
        return rawCardData.map((cardJson) => CardData(cardJson));
    }

    function createFromCommonId(commonId) {
        const unmappedCardData = createLibrary();
        const cardData = unmappedCardData.find((c) => c.commonId === commonId);
        if (!cardData) {
            console.error(
                "Could not find card data for card with ID " + commonId
            );
            return {};
        } else {
            return cardData;
        }
    }
};

function CardData(cardJson) {
    const color = cardJson.type_card;
    return {
        id: createUniqueCardId(cardJson.id),
        commonId: cardJson.id,
        color,
        type: CARD_COLOR_TO_TYPE[color],
        name: cardJson.name,
        description: cardJson.detail,
        cost: cardCost(cardJson.price),
        attack: parseInt(cardJson.attack, 10),
        defense: parseInt(cardJson.defense, 10),
        paralyzed: false,
    };
}

function cardCost(cardJsonPrice) {
    if (cardJsonPrice.toLowerCase() === "x") {
        return 0;
    } else {
        return parseInt(cardJsonPrice, 10);
    }
}

function createUniqueCardId(cardCommonId) {
    const uniqueId = Math.round(Date.now() * 0.1 * Math.random())
        .toString()
        .substr(0, 5)
        .padStart(5, "0");
    return `${cardCommonId}:${uniqueId}`;
}

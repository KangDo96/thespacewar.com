const Deck = require('./Deck.js');
const FakeTheSwarmDeck = require('./FakeTheSwarmDeck.js');

module.exports = function (deps) {

    const cardDataAssembler = deps.cardDataAssembler;

    return {
        create,
        createCardsForDeck
    };

    function create(cards) {
        return Deck(cards);
    }

    function createCardsForDeck(useTheSwarmDeck = false) {
        const deck = createDeck(useTheSwarmDeck);
        shuffle(deck);
        return deck;
    }

    function createDeck(useTheSwarmDeck) {
        if (useTheSwarmDeck) {
            return FakeTheSwarmDeck();
        }
        else {
            return cardDataAssembler.createAll();
        }
    }
};

function shuffle(array) {
    let currentIndex = array.length;
    let temporaryValue;
    let randomIndex;

    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
}

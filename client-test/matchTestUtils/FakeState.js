const defaults = require('lodash/defaults');
const FakeCardDataAssembler = require('../../server/test/testUtils/FakeCardDataAssembler.js');
const createCard = FakeCardDataAssembler.createCard;

module.exports = function FakeState(options) {
    const cardsInZone = options.cardsInZone || [];
    options.cardsInZone = cardsInZone.map(c => createCard(c));
    options.cardsInOpponentZone = (options.cardsInOpponentZone || []).map(c => createCard(c));
    options.opponentCardsInZone = (options.opponentCardsInZone || []).map(c => createCard(c));
    options.cardsOnHand = (options.cardsOnHand || []).map(c => createCard(c));

    return defaults(options, {
        stationCards: [{ place: 'draw' }], //Needed to not always show a Defeated screen
        cardsOnHand: [],
        cardsInZone: [],
        cardsInOpponentZone: [],
        discardedCards: [],
        opponentCardCount: 0,
        opponentDiscardedCards: [],
        opponentStationCards: [{ place: 'draw' }], //Needed to not always show a Defeated screen
        opponentCardsInZone: [],
        opponentCardsInPlayerZone: [],
        events: [],
        requirements: [],
        phase: 'wait',
        turn: 1,
        currentPlayer: 'P2A',
        opponentRetreated: false,
        playerRetreated: false,
        playerOrder: ['P1A', 'P2A']
    });
}
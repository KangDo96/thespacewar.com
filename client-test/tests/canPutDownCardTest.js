const FakeCardDataAssembler = require('../../server/test/testUtils/FakeCardDataAssembler.js');
const createCard = FakeCardDataAssembler.createCard;
const getCardImageUrl = require('../../client/utils/getCardImageUrl.js');
const FakeState = require('../matchTestUtils/FakeState.js');
const FakeMatchController = require('../matchTestUtils/FakeMatchController.js');
const DestinyDecided = require("../../shared/card/DestinyDecided");
const { createController } = require('../matchTestUtils/index.js');
const {
    assert,
    timeout,
    dom: {
        click
    }
} = require('../bocha-jest/bocha-jest.js');

let controller;
let matchController;

function setUpController(optionsAndPageDeps = {}) { //Has side effects to afford a convenient tear down
    matchController = FakeMatchController();
    controller = createController({ matchController, ...optionsAndPageDeps });

    return controller;
}

beforeEach(() => {
    getCardImageUrl.byCommonId = commonId => `/${commonId}`
});

afterEach(() => {
    controller && controller.tearDown();
    matchController = null;
    controller = null;
});

describe('when has Destiny decided in play and hold event card', async () => {
    beforeEach(async () => {
        const { dispatch, showPage } = setUpController();
        showPage();
        dispatch('restoreState', FakeState({
            turn: 1,
            currentPlayer: 'P1A',
            phase: 'action',
            cardsInZone: [{ id: 'C1A', commonId: DestinyDecided.CommonId }],
            cardsOnHand: [{ id: 'C2A', type: 'event' }]
        }));
        await timeout();

        await click('.field-playerCardsOnHand .cardOnHand');
    });

    test('should NOT see zone ghosts', () => {
        assert.elementCount('.playerCardsInZone .card-ghost', 0);
    });
});

describe('when does NOT have Destiny decided in play and hold event card', async () => {
    beforeEach(async () => {
        const { dispatch, showPage } = setUpController();
        showPage();
        dispatch('restoreState', FakeState({
            turn: 1,
            currentPlayer: 'P1A',
            phase: 'action',
            cardsOnHand: [{ id: 'C2A', type: 'event' }]
        }));
        await timeout();

        await click('.field-playerCardsOnHand .cardOnHand');
    });

    test('should see zone ghosts', () => {
        assert.elementCount('.playerCardsInZone .card-ghost', 1);
    });
});

describe('when has Destiny decided in play and has event card as flipped station card', async () => {
    beforeEach(async () => {
        const { dispatch, showPage } = setUpController();
        showPage();
        dispatch('restoreState', FakeState({
            turn: 1,
            currentPlayer: 'P1A',
            phase: 'action',
            cardsInZone: [{ id: 'C1A', commonId: DestinyDecided.CommonId }],
            stationCards: [
                { id: 'C2A', place: 'draw', flipped: true, card: createCard({ id: 'C2A', type: 'event' }) },
                { id: 'C3A', place: 'draw' }
            ]
        }));
        await timeout();
    });

    test('should NOT be able to move station card to zone', () => {
        assert.elementCount('.playerStationCards .movable', 0);
    });
});
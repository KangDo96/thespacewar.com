const FakeCardDataAssembler = require('../../server/test/testUtils/FakeCardDataAssembler.js');
const createCard = FakeCardDataAssembler.createCard;
const getCardImageUrl = require('../../client/utils/getCardImageUrl.js');
const FakeState = require('../matchTestUtils/FakeState.js');
const FakeMatchController = require('../matchTestUtils/FakeMatchController.js');
const Neutralization = require('../../shared/card/Neutralization.js');
const { createController } = require('../matchTestUtils/index.js');
const {
    assert,
    refute,
    sinon,
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
    sinon.stub(getCardImageUrl, 'byCommonId').returns('/#');
});

afterEach(() => {
    getCardImageUrl.byCommonId.restore && getCardImageUrl.byCommonId.restore();

    controller && controller.tearDown();
    matchController = null;
    controller = null;
});

describe('misc', async () => {
    test('when in "start" phase and click card on hand should NOT see ANY card ghosts', async () => {
        const { dispatch, showPage } = setUpController();
        showPage();
        dispatch('restoreState', FakeState({
            turn: 1,
            currentPlayer: 'P1A',
            phase: 'start',
            cardsOnHand: [createCard({ id: 'C1A' })],
            stationCards: [{ place: 'draw' }]
        }));
        await timeout();

        await click('.field-playerCardsOnHand .cardOnHand');

        assert.elementCount('.card-ghost', 0);
    });
});

describe('when in discard phase and is required to discard 2 cards', async () => {
    beforeEach(async () => {
        const { dispatch, showPage } = setUpController();
        showPage();
        dispatch('restoreState', FakeState({
            turn: 1,
            currentPlayer: 'P1A',
            phase: 'discard',
            cardsOnHand: [
                createCard({ id: 'C1A' }),
                createCard({ id: 'C2A' })
            ],
        }));
        await timeout();
    });

    test('and discards 2 cards should at least go to next phase', async () => {
        await click('.field-playerCardsOnHand .cardOnHand:eq(0)');
        await click('.field-player .discardPile-cardGhost');
        await click('.field-playerCardsOnHand .cardOnHand');
        await click('.field-player .discardPile-cardGhost');

        assert.calledWith(matchController.emit, 'nextPhase');
    });

    test('and discards 1 card', async () => {
        await click('.field-playerCardsOnHand .cardOnHand:eq(0)');
        await click('.field-player .discardPile-cardGhost');

        refute.calledWith(matchController.emit, 'nextPhase');
    });
});

describe('when in action phase', async () => {
    beforeEach(async () => {
        const { dispatch, showPage } = setUpController();
        showPage();
        dispatch('restoreState', FakeState({
            turn: 1,
            currentPlayer: 'P1A',
            phase: 'action',
            cardsOnHand: [
                createCard({ id: 'C1A' })
            ],
        }));
        await timeout();
    });

    test('and discards card', async () => {
        await click('.field-playerCardsOnHand .cardOnHand');
        await click('.field-player .discardPile-cardGhost');

        refute.calledWith(matchController.emit, 'nextPhase');
    });
});

describe('when has NO cards left and it is draw phase and opponent has 1 card left', async () => {
    beforeEach(async () => {
        const { dispatch, showPage } = setUpController({
            getDeckSize: () => 2
        });
        showPage();
        dispatch('restoreState', FakeState({
            turn: 1,
            currentPlayer: 'P1A',
            phase: 'draw',
            stationCards: [{ id: 'C1A', place: 'draw' }, { id: 'C2A', place: 'draw' }],
            opponentStationCards: [{ id: 'C3A', place: 'draw' }]
        }));
        await timeout();
    });

    test('should NOT be able to draw card', async () => {
        assert.elementCount('.drawPile-draw', 0);
    });

    test('should be able to mill', async () => {
        assert.elementCount('.drawPile-discardTopTwo', 1);
    });
});

describe('when has 1 card left and it is draw phase and opponent has NO cards left', async () => {
    beforeEach(async () => {
        const { dispatch, showPage } = setUpController({
            getDeckSize: () => 2
        });
        showPage();
        dispatch('restoreState', FakeState({
            turn: 1,
            currentPlayer: 'P1A',
            phase: 'draw',
            stationCards: [{ id: 'C1A', place: 'draw' }],
            opponentStationCards: [{ id: 'C2A', place: 'draw' }, { id: 'C3A', place: 'draw' }]
        }));
        await timeout();
    });

    test('should be able to draw card', async () => {
        assert.elementCount('.drawPile-draw', 1);
    });

    test('should NOT be able to mill', async () => {
        assert.elementCount('.drawPile-discardTopTwo', 0);
    });
});

describe('when both players are out of cards', () => {
    beforeEach(async () => {
        const { dispatch, showPage } = setUpController({
            getDeckSize: () => 1
        });
        showPage();
        dispatch('restoreState', FakeState({
            turn: 1,
            currentPlayer: 'P1A',
            phase: 'draw',
            stationCards: [{ id: 'C1A', place: 'draw' }],
            opponentStationCards: [{ id: 'C2A', place: 'draw' }]
        }));
        await timeout();
    });

    test('WORKAROUND: should be able to draw card', () => {
        //notes: You must be able to proceed when no cards are available to go past the draw phase.
        // In the future the draw phase could be skipped automatically.
        // But for now the player has to "draw a card" which will trigger a next phase because no more cards are available to draw.
        assert.elementCount('.drawPile-draw', 1);
    });
});

describe('when has duration card Neutralization and other duration card', () => {
    beforeEach(async () => {
        const { dispatch, showPage } = setUpController({
            getDeckSize: () => 1
        });
        showPage();
        dispatch('restoreState', FakeState({
            turn: 1,
            currentPlayer: 'P1A',
            phase: 'draw',
            cardsInZone: [
                { id: 'C1A', type: 'duration', commonId: Neutralization.CommonId },
                { id: 'C2A', type: 'duration' }
            ]
        }));
        await timeout();
    });

    test('other, now disabled, duration card should have a disabled overlay', () => {
        assert.elementCount('.playerCardsInZone .card:eq(1) .cardDisabledOverlay', 1);
    });
});


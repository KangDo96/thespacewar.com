const FakeCardDataAssembler = require('../../shared/test/testUtils/FakeCardDataAssembler.js');
const createCard = FakeCardDataAssembler.createCard;
const getCardImageUrl = require('../utils/getCardImageUrl.js');
const FakeState = require('../testUtils/FakeState.js');
const { createController } = require('../testUtils');
const {
    assert,
    sinon,
    timeout,
    dom: {
        click
    }
} = require('../testUtils/bocha-jest/bocha-jest.js');

let controller;

beforeEach(() => {
    sinon.stub(getCardImageUrl, 'byCommonId').returns('/#');

    controller = createController();
});

afterEach(() => {
    getCardImageUrl.byCommonId.restore && getCardImageUrl.byCommonId.restore();

    controller && controller.tearDown();
});

describe('action phase', () => {
    describe('when in action phase and click card on hand', () => {
        beforeEach(async () => {
            const { dispatch, showPage } = controller;
            showPage();
            dispatch('stateChanged', FakeState({
                turn: 1,
                currentPlayer: 'P1A',
                phase: 'action',
                cardsOnHand: [createCard({ id: 'C1A' })],
                stationCards: [{ place: 'draw' }]
            }));
            await timeout();

            await click('.playerCardsOnHand .cardOnHand');
        });

        test('should see station card ghosts', async () => {
            assert.elementCount('.field-playerStation .card-ghost', 3);
        });
    });
});

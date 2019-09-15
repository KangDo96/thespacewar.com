/**
 * @jest-environment node
 */
const PutDownCardEvent = require('../../../shared/PutDownCardEvent.js');
const MoveCardEvent = require('../../../shared/event/MoveCardEvent.js');
const { PHASES } = require('../../../shared/phases.js');
const { setupFromState, BotId, PlayerId } = require('./botTestHelpers.js');

describe('Being in the attack phase', () => {
    describe('when has spaceShip that has been in play for 1 turn', () => {
        let matchController;

        beforeEach(async () => {
            const stubs = await setupFromState({
                turn: 2,
                phase: 'attack',
                cardsInZone: [{ id: 'C1A', type: 'spaceShip' }],
                events: [PutDownCardEvent({ cardId: 'C1A', turn: 1, location: 'zone' })]
            });
            matchController = stubs.matchController;
        });

        it('should move', () => {
            expect(matchController.emit).toBeCalledWith('moveCard', 'C1A');
        });

        it('should NOT go to the next phase move', () => {
            expect(matchController.emit).not.toBeCalledWith('nextPhase', expect.any(Object));
        });
    });

    it('when has spaceShip that has been in play for 1 turn should move it', async () => {
        const { matchController } = await setupFromState({
            turn: 2,
            phase: 'attack',
            cardsInZone: [{ id: 'C1A', type: 'spaceShip' }],
            events: [PutDownCardEvent({ cardId: 'C1A', turn: 1, location: 'zone' })]
        });

        expect(matchController.emit).toBeCalledWith('moveCard', 'C1A');
    });

    describe('when has spaceShip in enemy zone that has been there for 1 turn', () => {
        let matchController;

        beforeEach(async () => {
            const stubs = await setupFromState({
                turn: 3,
                phase: 'attack',
                cardsInOpponentZone: [{ id: 'C1A', type: 'spaceShip', attack: 1 }],
                opponentStationCards: [
                    unflippedStationCard('S1A')
                ],
                events: [
                    PutDownCardEvent({ cardId: 'C1A', turn: 1, location: 'zone' }),
                    MoveCardEvent({ cardId: 'C1A', turn: 2 })
                ]
            });
            matchController = stubs.matchController;
        });

        it('should attack enemy station', () => {
            expect(matchController.emit).toBeCalledWith('attackStationCard', {
                attackerCardId: 'C1A',
                targetStationCardIds: ['S1A']
            });
        });

        it('should NOT go to next phase', () => {
            expect(matchController.emit).not.toBeCalledWith('nextPhase', expect.any(Object));
        });

        it('should NOT move card', () => {
            expect(matchController.emit).not.toBeCalledWith('moveCard', 'C1A');
        });
    });

    it('should proceed to next phase', async () => {
        const { matchController } = await setupFromState({ turn: 1, phase: 'attack' });
        expect(matchController.emit).toBeCalledWith('nextPhase', { currentPhase: PHASES.attack });
    });

    test.todo('SHOULD NOT GO TO NEXT PHASE IF HAS BOTH CARD THAT CAN MOVE AND CARD THAT CAN ATTACK STATION');
    test.todo('SHOULD ATTACK CARD IN HOME ZONE INSTEAD OF MOVING');
    test.todo('SHOULD ATTACK CARD IN ENEMY ZONE IF CAN NOT ATTACK STATION');

    test.todo('MISSILE CARDS SHOULD NOT MOVE');
    test.todo('MISSILE CARDS SHOULD ATTACK ENEMY STATION WHEN POSSIBLE');
    test.todo('SHOULD NOT TRY TO MOVE DEFENSE CARDS');

    test.todo('HANDLE REQUIREMENTS OF TYPES: DRAW & DISCARD');
});

function unflippedStationCard(id, place = 'draw') {
    return {
        id,
        place,
        card: { id }
    }
}

let bocha = require('bocha');
let sinon = bocha.sinon;
let assert = bocha.assert;
let refute = bocha.refute;
let defaults = bocha.defaults;
const FakeCardDataAssembler = require("../../server/test/testUtils/FakeCardDataAssembler.js");//TODO Move to shared
const createCard = FakeCardDataAssembler.createCard;
const ServerCardFactory = require('../../server/card/ServerCardFactory.js');
const PlayerStateService = require('../match/PlayerStateService.js');
const BaseCard = require('../card/BaseCard.js');
const MatchService = require('../match/MatchService.js');
const FakeDeckFactory = require('../../server/test/testUtils/FakeDeckFactory.js')
const PlayerServiceProvider = require('../match/PlayerServiceProvider.js');

const FullForceForwardCommonId = '9';

module.exports = bocha.testCase('PlayerStateService', {
    'attack boost:': {
        'when has card Full Force Forward in play and a SPACE SHIP card asks for its attack boost': {
            async setUp() {
                const C1A = createCard({ id: 'C1A', type: 'spaceShip' });
                const card = new BaseCard({ card: C1A });
                const state = createState({
                    playerStateById: {
                        'P1A': {
                            cardsInZone: [C1A, createFullForceForward('C2A')]
                        }
                    }
                });
                const service = createServiceForPlayer(state, 'P1A');

                this.bonus = service.getAttackBoostForCard(card);
            },
            'should return 1 in attack boost': function () {
                assert.equals(this.bonus, 1);
            }
        },
        'when has card Full Force Forward in play and a MISSILE card asks for its attack boost': {
            async setUp() {
                const C1A = createCard({ id: 'C1A', type: 'missile' });
                const card = new BaseCard({ card: C1A });
                const state = createState({
                    playerStateById: {
                        'P1A': {
                            cardsInZone: [C1A, createFullForceForward('C2A')]
                        }
                    }
                });
                const service = createServiceForPlayer(state, 'P1A');

                this.bonus = service.getAttackBoostForCard(card);
            },
            'should return 0 in attack boost': function () {
                assert.equals(this.bonus, 0);
            }
        },
        'when does NOT have Full Force Forward in play and a SPACE SHIP card asks for its attack boost': {
            async setUp() {
                const C1A = createCard({ id: 'C1A', type: 'spaceShip' });
                const card = new BaseCard({ card: C1A });
                const state = createState({
                    playerStateById: {
                        'P1A': {
                            cardsInZone: [C1A]
                        }
                    }
                });
                const service = createServiceForPlayer(state, 'P1A');

                this.bonus = service.getAttackBoostForCard(card);
            },
            'should return 0 in attack boost': function () {
                assert.equals(this.bonus, 0);
            }
        },
        'when have 1 duration card that is NOT Full Force Forward in play and a SPACE SHIP card asks for its attack boost': {
            async setUp() {
                const C1A = createCard({ id: 'C1A', type: 'spaceShip' });
                const card = new BaseCard({ card: C1A });
                const state = createState({
                    playerStateById: {
                        'P1A': {
                            cardsInZone: [C1A, createCard({ id: 'C2A', type: 'duration' })]
                        }
                    }
                });
                const service = createServiceForPlayer(state, 'P1A');

                this.bonus = service.getAttackBoostForCard(card);
            },
            'should return 0 in attack boost': function () {
                assert.equals(this.bonus, 0);
            }
        }
    },
    'cardCanMoveOnTurnWhenPutDown:': {
        'should return false': function () {
            const C1A = createCard({ id: 'C1A', type: 'spaceShip' });
            const card = new BaseCard({ card: C1A });
            const state = createState({
                playerStateById: {
                    'P1A': {
                        cardsInZone: [C1A]
                    }
                }
            });
            const service = createServiceForPlayer(state, 'P1A');

            const result = service.cardCanMoveOnTurnWhenPutDown(card);

            refute(result);
        },
        'when card is space ship has Full Force Forward in zone should return true': function () {
            const C1A = createCard({ id: 'C1A', type: 'spaceShip' });
            const card = new BaseCard({ card: C1A });
            const state = createState({
                playerStateById: {
                    'P1A': {
                        cardsInZone: [
                            C1A,
                            createCard({ id: 'C2A', type: 'duration', commonId: FullForceForwardCommonId })
                        ]
                    }
                }
            });
            const service = createServiceForPlayer(state, 'P1A');

            const result = service.cardCanMoveOnTurnWhenPutDown(card);

            assert(result);
        },
        'when has Full Force Forward in zone but card is NOT space ship should return false': function () {
            const C1A = createCard({ id: 'C1A', type: 'missile' });
            const card = new BaseCard({ card: C1A });
            const state = createState({
                playerStateById: {
                    'P1A': {
                        cardsInZone: [
                            C1A,
                            createCard({ id: 'C2A', type: 'duration', commonId: FullForceForwardCommonId })
                        ]
                    }
                }
            });
            const service = createServiceForPlayer(state, 'P1A');

            const result = service.cardCanMoveOnTurnWhenPutDown(card);

            refute(result);
        }
    }
});

function createFullForceForward(id) {
    return createCard({ id, type: 'duration', commonId: FullForceForwardCommonId });
}

function createServiceForPlayer(state, playerId) {
    const matchService = new MatchService();
    matchService.setState(state);
    const playerServiceProvider = PlayerServiceProvider();
    const cardFactory = new ServerCardFactory({ matchService, playerServiceProvider, getFreshState: () => state });
    const playerStateService = new PlayerStateService({ playerId, matchService, cardFactory });
    playerServiceProvider.registerService(PlayerServiceProvider.TYPE.state, playerId, playerServiceProvider);

    return playerStateService;
}

function createState(options = {}) {
    defaults(options, {
        turn: 1,
        currentPlayer: 'P1A',
        playerOrder: ['P1A', 'P2A'],
        playerStateById: {},
        deckByPlayerId: {}
    });

    const playerStateIds = Object.keys(options.playerStateById);
    if (playerStateIds.length < 2) {
        playerStateIds.push(options.playerOrder[1]);
    }
    for (let key of playerStateIds) {
        options.playerStateById[key] = createPlayerState(options.playerStateById[key]);
    }

    for (let playerId of options.playerOrder) {
        if (!options.deckByPlayerId[playerId]) {
            options.deckByPlayerId[playerId] = FakeDeckFactory.createDeckFromCards([FakeCardDataAssembler.createCard()]);
        }
        if (!options.playerStateById[playerId]) {
            options.playerStateById[playerId] = createPlayerState();
        }
    }

    return options;
}

function createPlayerState(options = {}) {
    return defaults(options, {
        phase: 'wait',
        cardsOnHand: [],
        cardsInZone: [],
        cardsInOpponentZone: [],
        stationCards: [],
        discardedCards: [],
        events: [],
        requirements: []
    });
}
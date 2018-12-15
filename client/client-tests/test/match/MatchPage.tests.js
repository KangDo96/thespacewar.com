let {
    sinon,
    stub,
    assert,
    refute,
    defaults,
    timeoutPromise: timeout,
    dom: {
        clickAndTick: click
    },
    testCase
} = require('bocha');
const Page = require('../../../match/MatchPage.js');
const FakeCardDataAssembler = require('../../../../server/test/testUtils/FakeCardDataAssembler.js');
const createCard = FakeCardDataAssembler.createCard;
const PutDownCardEvent = require('../../../../shared/PutDownCardEvent.js');
const MoveCardEvent = require('../../../../shared/event/MoveCardEvent.js');
const RepairCardEvent = require('../../../../shared/event/RepairCardEvent.js');
const AttackEvent = require('../../../../shared/event/AttackEvent.js');
const BaseCard = require('../../../../shared/card/BaseCard.js');
const SmallCannon = require('../../../../shared/card/SmallCannon.js');

const CommonShipId = 25;
const FastMissileId = 6;

const Vue = require('vue').default;
const Vuex = require('vuex').default;
Vue.use(Vuex);

module.exports = testCase('MatchPage', {
    async setUp() {
        this.store = new Vuex.Store({});
        this.vm = new Vue({ store: this.store });
        this.vm.$mount();

        this.createController = (...args) => {
            this.controller = TestController(...args);
            return { dispatch: this.controller.dispatch };
        };
        this.createPage = (deps) => {
            deps.rootStore = this.store;
            return Page(deps);
        };
    },
    tearDown() {
        delete this.createPage;

        this.controller && this.controller.tearDown();
        delete this.createController;

        this.page && this.page.hide();
        delete this.page;

        this.vm && this.vm.$destroy();
        delete this.vm;
        delete this.store;
    },
    'attack': {
        'when player has card in opponent zone and opponent has 1 defense card': {
            async setUp() {
                const { dispatch } = this.createController();
                this.controller.showPage();

                dispatch('restoreState', FakeState({
                    turn: 2,
                    currentPlayer: 'P1A',
                    phase: 'attack',
                    cardsInOpponentZone: [{ id: 'C1A', attack: 1 }],
                    opponentCardsInZone: [{ id: 'C2A,', type: 'defense' }],
                    events: [PutDownCardEvent({ turn: 1, cardId: 'C1A' })]
                }));
                await timeout();
            },
            'player card should be able to attack'() {
                assert.elementCount('.playerCardsInOpponentZone .readyToAttack', 1);
            }
        },
        'when player has 1 card in opponent zone and opponent has 1 duration card in its zone': {
            async setUp() {
                const { dispatch } = this.createController();
                this.controller.showPage();

                dispatch('restoreState', FakeState({
                    turn: 2,
                    currentPlayer: 'P1A',
                    phase: 'attack',
                    cardsInOpponentZone: [{ id: 'C1A', attack: 1 }],
                    opponentCardsInZone: [{ id: 'C2A,', type: 'duration' }],
                    events: [PutDownCardEvent({ turn: 1, cardId: 'C1A' })]
                }));
                await timeout();
            },
            'player card should not be able to attack'() {
                assert.elementCount('.playerCardsInOpponentZone .readyToAttack', 0);
            }
        }
    },
    'duration cards': {
        'when has duration in play and is your turn': {
            async setUp() {
                const { dispatch } = this.createController();
                this.controller.showPage();
                dispatch('restoreState', FakeState({
                    cardsInZone: [{ id: 'C1A', type: 'duration' }]
                }));

                dispatch('nextPlayer', { turn: 2, currentPlayer: 'P1A' });
                await timeout();
            },
            'current phase text should say "Prepare for turn"'() {
                assert.elementText('.playerHud-phaseText', 'Prepare for turn');
            }
        },
        'when in preparation phase with 2 duration cards and click and discards the first': {
            async setUp() {
                this.matchController = FakeMatchController({ emit: stub() });
                const { dispatch } = this.createController({ matchController: this.matchController });
                this.controller.showPage();
                dispatch('restoreState', FakeState({
                    phase: 'preparation',
                    currentPlayer: 'P1A',
                    cardsInZone: [{ id: 'C1A', type: 'duration' }, { id: 'C2A', type: 'duration' }]
                }));
                await timeout();

                await click('.card[data-type="duration"]:eq(0) .discard');
            },
            'should emit discardDurationCard'() {
                assert.calledOnceWith(this.matchController.emit, 'discardDurationCard', 'C1A');
            },
            'should remove card from own field'() {
                assert.elementCount('.field-playerZoneCards .card[data-type="duration"]', 1);
            },
            'should put card in discard pile'() {
                assert.elementCount('.field-player .field-discardPile .card[data-cardId="C1A"]', 1);
            },
            'current phase text should say "Prepare for turn"'() {
                assert.elementText('.playerHud-phaseText', 'Prepare for turn');
            },
            'should see action point indicator'() {
                assert.elementCount('.playerActionPoints', 1);
            }
        },
        'when in preparation phase and go to next phase': {
            async setUp() {
                this.matchController = FakeMatchController({ emit: stub() });
                const { dispatch } = this.createController({ matchController: this.matchController });
                this.controller.showPage();
                dispatch('restoreState', FakeState({
                    phase: 'preparation',
                    currentPlayer: 'P1A'
                }));
                await timeout();

                await click('.playerHud-nextPhaseButton');
            },
            'should emit next phase'() {
                assert.calledOnceWith(this.matchController.emit, 'nextPhase');
            },
            'current phase text should say "Draw phase"'() {
                assert.elementText('.playerHud-phaseText', 'Draw phase');
            }
        },
        'when in preparation phase and has less than 0 action points': {
            async setUp() {
                this.matchController = FakeMatchController({ emit: stub() });
                const { dispatch } = this.createController({
                    matchController: this.matchController,
                    actionPointsCalculator: {
                        calculate: () => -1
                    }
                });
                this.controller.showPage();

                dispatch('restoreState', FakeState({
                    phase: 'preparation',
                    currentPlayer: 'P1A'
                }));
                await timeout();
            },
            'should NOT show next phase button'() {
                assert.elementCount('.playerHud-nextPhaseButton', 0);
            }
        },
        'when in preparation phase and discard all duration cards should AUTOMATICALLY go to the draw phase': {
            async setUp() {
                this.matchController = FakeMatchController({ emit: stub() });
                const { dispatch } = this.createController({ matchController: this.matchController });
                this.controller.showPage();
                dispatch('restoreState', FakeState({
                    phase: 'preparation',
                    currentPlayer: 'P1A',
                    cardsInZone: [{ id: 'C1A', type: 'duration' }]
                }));
                await timeout();

                await click('.card[data-type="duration"] .discard');
            },
            'should emit next phase'() {
                assert.calledOnceWith(this.matchController.emit, 'nextPhase');
            },
            'current phase text should say "Draw phase"'() {
                assert.elementText('.playerHud-phaseText', 'Draw phase');
            }
        },
        'on "opponentDiscardedDurationCard"': {
            async setUp() {
                this.matchController = FakeMatchController({ emit: stub() });
                const { dispatch } = this.createController({ matchController: this.matchController });
                this.controller.showPage();
                dispatch('restoreState', FakeState({
                    currentPlayer: 'P2A',
                    opponentCardsInZone: [{ id: 'C1A' }]
                }));
                await timeout();

                dispatch('opponentDiscardedDurationCard', { card: createCard({ id: 'C1A' }) });
            },
            'should show card in discarded pile'() {
                assert.elementCount('.field-opponent .field-discardPile .card[data-cardId="C1A"]', 1);
            },
            'should NOT show card in opponent zone'() {
                assert.elementCount('.field-opponent .field-zone .card--turnedAround', 0);
            }
        }
    },
    'enlarge': {
        'when has 1 card in own zone and click enlarge icon on it': {
            async setUp() {
                const { dispatch } = this.createController();
                this.controller.showPage();
                dispatch('restoreState', FakeState({
                    turn: 2,
                    currentPlayer: 'P1A',
                    cardsInZone: [{ id: 'C1A' }],
                    events: [PutDownCardEvent({ turn: 1, cardId: 'C1A' })]
                }));
                await timeout();

                await click('.field-playerZoneCards .card .enlargeIcon');
            },
            'should show enlarged version of card'() {
                assert.elementCount('.card--enlarged', 1);
            }
        },
        'when enlarged version of card is visible and click on overlay should hide enlarged card': async function () {
            const { dispatch } = this.createController();
            this.controller.showPage();
            dispatch('restoreState', FakeState({
                turn: 2,
                currentPlayer: 'P1A',
                cardsInZone: [{ id: 'C1A' }],
                events: [PutDownCardEvent({ turn: 1, cardId: 'C1A' })]
            }));
            await timeout();
            await click('.field-playerZoneCards .card .enlargeIcon');

            await click('.dimOverlay');

            assert.elementCount('.card--enlarged', 0);
        }
    },
    'behaviours - Small Cannon': {
        'when in attack phase with small cannon and has attacked once should be able to attack again': async function () {
            const events = [
                PutDownCardEvent({ turn: 1, cardId: 'C1A' }),
                AttackEvent({ turn: 2, attackerCardId: 'C1A', cardCommonId: 'C1A' })
            ];
            const { dispatch } = this.createController({
                cardFactory: {
                    createFromVuexStore() {
                        return new SmallCannon({
                            eventRepository: { getAll: () => events },
                            matchInfoRepository: { getTurn: () => 2, getPlayerPhase: () => 'attack' },
                            playerId: 'P1A',
                            card: { id: 'C1A', type: 'defense' }
                        });
                    }
                }
            });
            this.controller.showPage();

            dispatch('restoreState', FakeState({
                turn: 2,
                currentPlayer: 'P1A',
                cardsInZone: [{ id: 'C1A' }],
                opponentCardsInPlayerZone: [{ id: 'C2A' }],
                events
            }));
            await timeout();

            assert.elementCount('.field-playerZoneCards .readyToAttack', 1);
        }
    },
    'behaviour - New Hope': {
        setUp() {
            this.newHopeId = 29;
        },
        'when has card in zone and a damaged card in same zone BUT is action phase': {
            async setUp() {
                const events = [
                    PutDownCardEvent({ turn: 1, cardId: 'C1A' }),
                    PutDownCardEvent({ turn: 1, cardId: 'C2A' })
                ];
                const { dispatch } = this.createController();
                this.controller.showPage();
                dispatch('restoreState', FakeState({
                    turn: 2,
                    currentPlayer: 'P1A',
                    phase: 'action',
                    cardsInZone: [{ id: 'C1A', commonId: this.newHopeId }, { id: 'C2A', damage: 1 }],
                    events
                }));
                await timeout();
            },
            'should NOT be able to select card for repair'() {
                assert.elementCount('.repair', 0);
            }
        },
        'when has card in zone and a damaged card in same zone': {
            async setUp() {
                const events = [
                    PutDownCardEvent({ turn: 1, cardId: 'C1A' }),
                    PutDownCardEvent({ turn: 1, cardId: 'C2A' })
                ];
                const { dispatch } = this.createController();
                this.controller.showPage();
                dispatch('restoreState', FakeState({
                    turn: 2,
                    currentPlayer: 'P1A',
                    phase: 'attack',
                    cardsInZone: [{ id: 'C1A', commonId: this.newHopeId }, { id: 'C2A', damage: 1 }],
                    events
                }));
                await timeout();
            },
            'should be able to choose repair for New Hope'() {
                assert.elementCount('.field-playerZoneCards .card:eq(0) .repair', 1);
            },
            'should show damage indicator for other card'() {
                assert.elementText('.card-damageIndicator', '-1');
            },
            'and click repair': { // SHOULD FAIL!!!
                async setUp() {
                    await click('.field-playerZoneCards .card:eq(0) .repair');
                },
                'should NOT be able to select for attack'() {
                    assert.elementCount('.field-playerZoneCards .card:eq(0) .readyToAttack', 0);
                },
                'should NOT be able to select for move'() {
                    assert.elementCount('.field-playerZoneCards .card:eq(0) .movable', 0);
                },
                'and click selectForRepair damaged card': {
                    async setUp() {
                        await click('.field-playerZoneCards .card:eq(1) .selectForRepair');
                    },
                    'should NOT be able to choose repair for New Hope'() {
                        assert.elementCount('.field-playerZoneCards .card:eq(0) .repair', 0);
                    }
                }
            }
        },
        'when repair 3 damage of card with 4 damage and has opponent card in zone': {
            async setUp() {
                this.matchController = FakeMatchController({ emit: stub() });
                const { dispatch } = this.createController({ matchController: this.matchController });
                this.controller.showPage();
                dispatch('restoreState', FakeState({
                    turn: 2,
                    currentPlayer: 'P1A',
                    phase: 'attack',
                    cardsInZone: [{ id: 'C1A', commonId: this.newHopeId }, { id: 'C2A', damage: 4 }],
                    opponentCardsInPlayerZone: [{ id: 'C3A' }],
                    events: [
                        PutDownCardEvent({ turn: 1, cardId: 'C1A' }),
                        PutDownCardEvent({ turn: 1, cardId: 'C2A' })
                    ]
                }));
                await timeout();

                await click('.field-playerZoneCards .card:eq(0) .repair');
                await click('.field-playerZoneCards .card:eq(1) .selectForRepair');
            },
            'should show damage indicator for other card'() {
                assert.elementText('.card-damageIndicator', '-1');
            },
            'should emit repair card'() {
                assert.calledOnceWith(this.matchController.emit, 'repairCard', {
                    repairerCardId: 'C1A',
                    cardToRepairId: 'C2A'
                });
            },
            'should NOT be able to still select card for repair'() {
                assert.elementCount('.field-playerZoneCards .card:eq(0) .selectForRepair', 0);
            },
            'should NOT be able to select for attack'() {
                assert.elementCount('.field-playerZoneCards .card:eq(0) .readyToAttack', 0);
            },
            'should be able to select for move'() {
                assert.elementCount('.field-playerZoneCards .card:eq(0) .movable', 1);
            }
        },
        'when has repaired this turn and has card in same zone with damage': {
            async setUp() {
                const events = [
                    PutDownCardEvent({ turn: 1, cardId: 'C1A' }),
                    PutDownCardEvent({ turn: 1, cardId: 'C2A' }),
                    RepairCardEvent({ turn: 2, cardId: 'C1A' })
                ];
                const { dispatch } = this.createController();
                this.controller.showPage();

                dispatch('restoreState', FakeState({
                    turn: 2,
                    currentPlayer: 'P1A',
                    cardsInZone: [{ id: 'C1A', commonId: this.newHopeId }, { id: 'C2A', damage: 1 }],
                    events
                }));
                await timeout();
            },
            'should NOT be able to choose repair for New Hope'() {
                assert.elementCount('.field-playerZoneCards .card:eq(0) .repair', 0);
            }
        },
        'when has card in zone and there is NO damaged ship in same zone': {
            async setUp() {
                const { dispatch } = this.createController();
                this.controller.showPage();

                dispatch('restoreState', FakeState({
                    turn: 2,
                    currentPlayer: 'P1A',
                    cardsInZone: [{ id: this.newHopeId }],
                    events: [PutDownCardEvent({ turn: 1, cardId: this.newHopeId })]
                }));
                await timeout();
            },
            'should NOT be able to choose repair for New Hope'() {
                assert.elementCount('.field-playerZoneCards .card:eq(0) .repair', 0);
            }
        },
        //when selected card to repair and has other damaged card and is it self damaged should NOT be able to select self for repair
        //OR when is damaged should be able to select for repair and repair self
    },
    'behaviour - Energy Shield': {
        setUp() {
            this.energyShieldId = 21;
        },
        'when ready card for attack in opponent zone and they have an Energy shield': {
            async setUp() {
                const events = [
                    PutDownCardEvent({ turn: 1, cardId: 'C1A' }),
                    MoveCardEvent({ turn: 2, cardId: 'C1A' })
                ];
                const { dispatch } = this.createController();
                this.controller.showPage();
                dispatch('restoreState', FakeState({
                    turn: 3,
                    currentPlayer: 'P1A',
                    phase: 'attack',
                    cardsInOpponentZone: [{ id: 'C1A', attack: 1 }],
                    opponentCardsInZone: [{ id: 'C2A', commonId: this.energyShieldId }],
                    opponentStationCards: [{ place: 'action' }],
                    events
                }));
                await timeout();

                await click('.playerCardsInOpponentZone .readyToAttack');
            },
            'should NOT be able to select opponent station card'() {
                assert.elementCount('.field-opponentStation .attackable', 0);
            }
        }
    },
    'draw phase:': {
        'when in draw phase': {
            async setUp() {
                const { dispatch } = this.createController();
                this.controller.showPage();

                dispatch('restoreState', FakeState({
                    turn: 1,
                    currentPlayer: 'P1A',
                    phase: 'draw',
                    stationCards: [{ place: 'draw' }]
                }));
                await timeout();
            },
            'should show guide text'() {
                assert.elementCount('.guideText-drawCard', 1);
            },
            'should show draw pile action overlay'() {
                assert.elementCount('.drawPile-draw', 1);
            },
            'should show opponent draw pile action overlay'() {
                assert.elementCount('.drawPile-discardTopTwo', 1);
            },
            'should NOT show next phase button'() {
                assert.elementCount('.playerHud-nextPhaseButton', 0);
            }
        },
        'when has 1 card in draw-station row and is in draw phase and click on own draw pile': {
            async setUp() {
                this.matchController = FakeMatchController({ emit: stub() });
                const { dispatch } = this.createController({ matchController: this.matchController });
                this.controller.showPage();

                dispatch('restoreState', FakeState({
                    turn: 1,
                    currentPlayer: 'P1A',
                    phase: 'draw',
                    stationCards: [{ place: 'draw' }, { place: 'action' }]
                }));
                await timeout();

                await click('.drawPile-draw');
                dispatch('drawCards', { cards: [{ id: 'C1A' }], moreCardsCanBeDrawn: false });
                await timeout();
            },
            'should ask to draw card'() {
                assert.calledOnceWith(this.matchController.emit, 'drawCard');
            },
            'should get put new card in hand'() {
                assert.elementCount('.field-playerCardsOnHand .card', 1);
            },
            'should go to next phase'() {
                assert.elementText('.playerHud-phaseText', 'Action phase');
            },
            'should NOT show guide text'() {
                assert.elementCount('.guideText-drawCard', 0);
            },
            'should show draw pile action overlay'() {
                assert.elementCount('.drawPile-draw', 0);
            },
            'should show opponent draw pile action overlay'() {
                assert.elementCount('.drawPile-discardTopTwo', 0);
            }
        },
        'when is in draw phase and click on own draw pile and server responds with card and that more can be drawn': {
            async setUp() {
                this.matchController = FakeMatchController({ emit: stub() });
                const { dispatch } = this.createController({ matchController: this.matchController });
                this.controller.showPage();

                dispatch('restoreState', FakeState({
                    turn: 1,
                    currentPlayer: 'P1A',
                    phase: 'draw'
                }));
                await timeout();

                await click('.drawPile-draw');
                dispatch('drawCards', { cards: [{ id: 'C1A' }], moreCardsCanBeDrawn: true });
                await timeout();
            },
            'should ask to draw card'() {
                assert.calledOnceWith(this.matchController.emit, 'drawCard');
            },
            'should get put new card in hand'() {
                assert.elementCount('.field-playerCardsOnHand .card', 1);
            },
            'should NOT go to next phase'() {
                assert.elementText('.playerHud-phaseText', 'Draw phase');
            },
            'should still show guide text'() {
                assert.elementCount('.guideText-drawCard', 1);
            }
        },
        'when is in draw phase and click on opponent draw pile and server responds without any card but that more can be drawn': {
            async setUp() {
                this.matchController = FakeMatchController({ emit: stub() });
                const { dispatch } = this.createController({ matchController: this.matchController });
                this.controller.showPage();

                dispatch('restoreState', FakeState({
                    turn: 1,
                    currentPlayer: 'P1A',
                    phase: 'draw'
                }));
                await timeout();

                await click('.drawPile-discardTopTwo');
                dispatch('stateChanged', { opponentDiscardedCards: [createCard({ id: 'C2A' }), createCard({ id: 'C3A' })] });
                dispatch('drawCards', { cards: [], moreCardsCanBeDrawn: true });
                await timeout();
            },
            'should ask to discard opponent top 2 cards'() {
                assert.calledOnceWith(this.matchController.emit, 'discardOpponentTopTwoCards');
            },
            'should NOT get new card in hand'() {
                assert.elementCount('.field-playerCardsOnHand .card', 0);
            },
            'should NOT go to next phase'() {
                assert.elementText('.playerHud-phaseText', 'Draw phase');
            },
            'should still show guide text'() {
                assert.elementCount('.guideText-drawCard', 1);
            }
        }
    },
    'skip phases with NO actions:': {
        'when in draw phase with NO station cards in draw row but 1 in action row should show next phase button to Action phase': {
            async setUp() {
                this.matchController = FakeMatchController({ emit: stub() });
                const { dispatch } = this.createController({ matchController: this.matchController });
                this.controller.showPage();

                dispatch('restoreState', FakeState({
                    turn: 1,
                    currentPlayer: 'P1A',
                    phase: 'draw',
                    stationCards: [{ place: 'action' }]
                }));
                await timeout();
            },
            'should show next phase as Action phase'() {
                assert.elementText('.playerHud-nextPhaseButton', 'Action phase');
            }
        },
        'when in action phase with no cards to discard and no cards in play should show next phase as End turn': {
            async setUp() {
                this.matchController = FakeMatchController({ emit: stub() });
                const { dispatch } = this.createController({ matchController: this.matchController });
                this.controller.showPage();

                dispatch('restoreState', FakeState({
                    turn: 1,
                    currentPlayer: 'P1A',
                    phase: 'action'
                }));
                await timeout();
            },
            'should show next phase as End turn'() {
                assert.elementCount('.playerHud-endTurnButton', 1);
            }
        },
        'when in action phase with no cards to discard and no cards in play and click "End turn"': {
            async setUp() {
                this.matchController = FakeMatchController({ emit: stub() });
                const { dispatch } = this.createController({ matchController: this.matchController });
                this.controller.showPage();

                dispatch('restoreState', FakeState({
                    turn: 1,
                    currentPlayer: 'P1A',
                    phase: 'action'
                }));
                await timeout();

                await click('.playerHud-endTurnButton');
            },
            'should skip to end of turn'() {
                assert.calledThriceWith(this.matchController.emit, 'nextPhase');
            }
        },
        'when in action phase with no cards to discard and 1 in play that can move': {
            async setUp() {
                this.matchController = FakeMatchController({ emit: stub() });
                const { dispatch } = this.createController({ matchController: this.matchController });
                this.controller.showPage();

                dispatch('restoreState', FakeState({
                    turn: 2,
                    currentPlayer: 'P1A',
                    phase: 'action',
                    cardsInZone: [createCard({ id: 'C1A', commonId: CommonShipId })],
                    events: [PutDownCardEvent({ turn: 1, cardId: 'C1A', location: 'zone', cardCommonId: CommonShipId })]
                }));
                await timeout();
            },
            'should see next phase as "Attack phase"'() {
                assert.elementText('.playerHud-nextPhaseButton', 'Attack phase');
            }
        },
        'when in action phase with no cards to discard and has 1 fast missile in play': {
            async setUp() {
                this.matchController = FakeMatchController({ emit: stub() });
                const { dispatch } = this.createController({ matchController: this.matchController });
                this.controller.showPage();

                dispatch('restoreState', FakeState({
                    turn: 1,
                    currentPlayer: 'P1A',
                    phase: 'action',
                    cardsInZone: [createCard({ id: 'C1A', commonId: FastMissileId })],
                    events: [PutDownCardEvent({
                        turn: 1,
                        cardId: 'C1A',
                        location: 'zone',
                        cardCommonId: FastMissileId
                    })]
                }));
                await timeout();
            },
            'should NOT see end turn button'() {
                assert.elementCount('.playerHud-endTurnButton', 0);
            },
            'should see next phase as "Attack phase"'() {
                assert.elementText('.playerHud-nextPhaseButton', 'Attack phase');
            }
        }
    },
    'attack phase:': {
        'when card has attack level 2 and attack last opponent station card that is NOT flipped': {
            async setUp() {
                this.matchController = FakeMatchController({ emit: stub() });
                const { dispatch } = this.createController({ matchController: this.matchController });
                this.controller.showPage();
                dispatch('restoreState', FakeState({
                    turn: 3,
                    currentPlayer: 'P1A',
                    phase: 'attack',
                    cardsInOpponentZone: [createCard({ id: 'C1A', attack: 2 })],
                    events: [
                        PutDownCardEvent({ turn: 1, cardId: 'C1A', location: 'zone' }),
                        MoveCardEvent({ turn: 2, cardId: 'C1A' })
                    ],
                    opponentStationCards: [
                        { id: 'C2A', place: 'action' },
                        { id: 'C3A', place: 'action', flipped: true, card: createCard({ id: 'C3A' }) }
                    ]
                }));
                await timeout();

                await click('.playerCardsInOpponentZone .readyToAttack');
                await click('.field-opponentStation .attackable');
            },
            'should send attack'() {
                assert.calledOnceWith(this.matchController.emit, 'attackStationCard', {
                    attackerCardId: 'C1A',
                    targetStationCardIds: ['C2A']
                });
            }
        },
        'when opponent has 0 unflipped station cards': {
            async setUp() {
                this.matchController = FakeMatchController({ emit: stub() });
                const { dispatch } = this.createController({ matchController: this.matchController });
                this.controller.showPage();

                dispatch('restoreState', FakeState({
                    turn: 3,
                    currentPlayer: 'P1A',
                    phase: 'attack',
                    stationCards: [{ id: 'C1A', place: 'action', card: createCard({ id: 'C1A' }) }],
                    opponentStationCards: [
                        { id: 'C2A', place: 'action', flipped: true, card: createCard({ id: 'C2A' }) }
                    ]
                }));
                await timeout();
            },
            'should show victory text'() {
                assert.elementCount('.victoryText', 1);
            },
            'should show end game overlay'() {
                assert.elementCount('.endGameOverlay', 1);
            }
        },
        'when you have 0 unflipped station cards': {
            async setUp() {
                this.matchController = FakeMatchController({ emit: stub() });
                const { dispatch } = this.createController({ matchController: this.matchController });
                this.controller.showPage();

                dispatch('restoreState', FakeState({
                    turn: 3,
                    currentPlayer: 'P1A',
                    phase: 'attack',
                    stationCards: [
                        { id: 'C1A', place: 'action', flipped: true, card: createCard({ id: 'C1A' }) }
                    ]
                }));
                await timeout();
            },
            'should NOT show victory text'() {
                assert.elementCount('.victoryText', 0);
            },
            'should show defeat text'() {
                assert.elementCount('.defeatText', 1);
            },
            'should show end game overlay'() {
                assert.elementCount('.endGameOverlay', 1);
            }
        }
    }
});

function TestController({ playerIds = ['P1A', 'P2A'], matchId = 'M1A', ...pageDeps } = {}) {
    const store = new Vuex.Store({});
    const vm = new Vue({ store });
    vm.$mount();

    pageDeps.matchControllerFactory = pageDeps.matchControllerFactory
        || FakeMatchControllerFactory({ matchController: pageDeps.matchController || FakeMatchController() });

    const [ownId, opponentId] = playerIds;
    pageDeps.userRepository = pageDeps.userRepository || FakeUserRepository({ ownUser: { id: ownId } });

    pageDeps.cardInfoRepository = {
        getType() {
        },
        getCost() {
        }
    };
    pageDeps.rootStore = store;
    const page = Page(pageDeps);

    return {
        dispatch: (...args) => pageDeps.matchControllerFactory.getStoreDispatch()(...args),
        showPage: () => page.show({ matchId, opponentUser: { id: opponentId } }),
        tearDown: () => {
            page.hide();
            vm.$destroy();
        }
    };
}

function FakeMatchControllerFactory({ matchController = FakeMatchController() } = {}) {
    let _dispatch;
    return {
        create: ({ dispatch }) => {
            _dispatch = dispatch;
            return matchController;
        },
        getStoreDispatch: () => _dispatch
    }
}

function FakeMatchController(options = {}) {
    return defaults(options, {
        start() {
        },
        emit() {
        }
    });
}

function FakeState(options) {
    const cardsInZone = options.cardsInZone || [];
    options.cardsInZone = cardsInZone.map(c => createCard(c));
    options.cardsInOpponentZone = (options.cardsInOpponentZone || []).map(c => createCard(c));
    options.opponentCardsInZone = (options.opponentCardsInZone || []).map(c => createCard(c));

    return defaults(options, {
        stationCards: [],
        cardsOnHand: [],
        cardsInZone: [],
        cardsInOpponentZone: [],
        discardedCards: [],
        opponentCardCount: 0,
        opponentDiscardedCards: [],
        opponentStationCards: [],
        opponentCardsInZone: [],
        opponentCardsInPlayerZone: [],
        events: [],
        phase: 'wait',
        turn: 1,
        currentPlayer: 'P2A',
        opponentRetreated: false,
        playerRetreated: false
    });
}

function FakeUserRepository({ ownUser }) {
    return {
        getOwnUser() {
            return ownUser;
        }
    }
}

function FakeBaseCard({ id, playerId = 'P1A', turn = 1, phase = 'attack', events = [] }) {
    return new BaseCard({
        eventRepository: { getAll: () => events },
        matchInfoRepository: { getTurn: () => turn, getPlayerPhase: () => phase },
        playerId,
        card: { id }
    });
}
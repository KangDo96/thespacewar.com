const {
    bocha: {
        stub,
        assert,
        refute,
        sinon
    },
    FakeDeckFactory,
    createCard,
    createPlayers,
    Player,
    createPlayer,
    createMatchAndGoToFirstActionPhase,
    createMatch,
    FakeConnection,
    FakeConnection2,
    catchError,
    createState,
} = require('./shared.js');
const FakeDeck = require('../testUtils/FakeDeck.js');

module.exports = {
    'when in draw phase and has 1 card in station draw-row': {
        setUp() {
            this.firstPlayerConnection = FakeConnection2(['restoreState', 'drawCards']);
            this.secondPlayerConnection = FakeConnection2(['restoreState', 'setOpponentCardCount']);
            const players = [Player('P1A', this.firstPlayerConnection), Player('P2A', this.secondPlayerConnection)]
            this.match = createMatch({ players });
            this.match.restoreFromState(createState({
                playerStateById: {
                    'P1A': {
                        phase: 'draw',
                        stationCards: [{ place: 'draw', card: createCard() }],
                    }
                },
                deckByPlayerId: {
                    'P1A': FakeDeck.fromCards([
                        createCard({ id: 'C1A' }),
                        createCard({ id: 'C2A' }),
                    ])
                }
            }));

            this.match.drawCard('P1A');
        },
        'should emit drawCards to first player'() {
            assert.calledOnce(this.firstPlayerConnection.drawCards);
            assert.calledWith(this.firstPlayerConnection.drawCards, sinon.match({
                moreCardsCanBeDrawn: false,
                cards: [sinon.match({ id: 'C1A' })]
            }));
        },
        'first player should have new card on hand'() {
            this.match.start();
            const { cardsOnHand } = this.firstPlayerConnection.restoreState.lastCall.args[0];
            assert.equals(cardsOnHand.length, 1);
            assert.equals(cardsOnHand[0].id, 'C1A');
        },
        'should emit setOpponentCardCount to second player'() {
            assert.calledOnce(this.secondPlayerConnection.setOpponentCardCount);
            assert.calledWith(this.secondPlayerConnection.setOpponentCardCount, 1);
        }
    },
    'when in draw phase and has 2 cards in station draw-row': {
        setUp() {
            this.firstPlayerConnection = FakeConnection2(['restoreState', 'drawCards']);
            this.secondPlayerConnection = FakeConnection2(['restoreState', 'setOpponentCardCount']);
            const players = [Player('P1A', this.firstPlayerConnection), Player('P2A', this.secondPlayerConnection)]
            this.match = createMatch({ players });
            this.match.restoreFromState(createState({
                playerStateById: {
                    'P1A': {
                        phase: 'draw',
                        stationCards: [
                            { place: 'draw', card: createCard() },
                            { place: 'draw', card: createCard() }
                        ],
                    }
                },
                deckByPlayerId: {
                    'P1A': FakeDeck.fromCards([
                        createCard({ id: 'C1A' }),
                        createCard({ id: 'C2A' }),
                    ])
                }
            }));

            this.match.drawCard('P1A');
        },
        'should emit drawCards to first player'() {
            assert.calledOnce(this.firstPlayerConnection.drawCards);
            assert.calledWith(this.firstPlayerConnection.drawCards, sinon.match({
                moreCardsCanBeDrawn: true,
                cards: [sinon.match({ id: 'C1A' })]
            }));
        },
        'first player should have new card on hand'() {
            this.match.start();
            const { cardsOnHand } = this.firstPlayerConnection.restoreState.lastCall.args[0];
            assert.equals(cardsOnHand.length, 1);
            assert.equals(cardsOnHand[0].id, 'C1A');
        },
        'should emit setOpponentCardCount to second player'() {
            assert.calledOnce(this.secondPlayerConnection.setOpponentCardCount);
            assert.calledWith(this.secondPlayerConnection.setOpponentCardCount, 1);
        }
    },
    'when can draw 1 card and draws 2 cards': {
        setUp() {
            this.firstPlayerConnection = FakeConnection2(['drawCards']);
            const players = [Player('P1A', this.firstPlayerConnection), Player('P2A')]
            this.match = createMatch({ players });
            this.match.restoreFromState(createState({
                playerStateById: {
                    'P1A': {
                        phase: 'draw',
                        stationCards: [{ place: 'draw', card: createCard() }],
                    }
                },
                deckByPlayerId: {
                    'P1A': FakeDeck.fromCards([createCard({ id: 'C1A' })])
                }
            }));

            this.match.drawCard('P1A');
            this.match.drawCard('P1A');
        },
        'should emit NO cards and that there are no more cards to draw'() {
            const args = this.firstPlayerConnection.drawCards.lastCall.args[0];
            assert.equals(args, {
                moreCardsCanBeDrawn: false,
                cards: []
            });
        }
    },
    'when discard opponent top 2 cards and has more cards to draw': {
        async setUp() {
            this.firstPlayerConnection = FakeConnection2(['restoreState', 'drawCards', 'stateChanged']);
            this.secondPlayerConnection = FakeConnection2(['restoreState', 'stateChanged', 'setOpponentCardCount']);
            const players = [Player('P1A', this.firstPlayerConnection), Player('P2A', this.secondPlayerConnection)]
            this.match = createMatch({ players });
            this.match.restoreFromState(createState({
                playerStateById: {
                    'P1A': {
                        phase: 'draw',
                        stationCards: [
                            { place: 'draw', card: createCard() },
                            { place: 'draw', card: createCard() }
                        ],
                    }
                },
                deckByPlayerId: {
                    'P2A': FakeDeck.fromCards([
                        createCard({ id: 'C2A' }),
                        createCard({ id: 'C3A' }),
                    ])
                }
            }));

            this.match.discardOpponentTopTwoCards('P1A');
        },
        'should emit drawCards to first player'() {
            assert.calledOnce(this.firstPlayerConnection.drawCards);
            assert.calledWith(this.firstPlayerConnection.drawCards, sinon.match({
                moreCardsCanBeDrawn: true,
                cards: []
            }));
        },
        'first player should NOT have new card on hand'() {
            this.match.start();
            const { cardsOnHand } = this.firstPlayerConnection.restoreState.lastCall.args[0];
            assert.equals(cardsOnHand.length, 0);
        },
        'should NOT emit setOpponentCardCount to second player'() {
            refute.called(this.secondPlayerConnection.setOpponentCardCount);
        },
        'should emit stateChanged to first player'() {
            assert.calledOnce(this.firstPlayerConnection.stateChanged);
            assert.calledWith(this.firstPlayerConnection.stateChanged, sinon.match({
                opponentDiscardedCards: [
                    sinon.match({ id: 'C2A' }),
                    sinon.match({ id: 'C3A' })
                ],
                events: [sinon.match({ type: 'drawCard' })]
            }));
        },
        'should emit stateChanged to second player'() {
            assert.calledOnce(this.secondPlayerConnection.stateChanged);
            assert.calledWith(this.secondPlayerConnection.stateChanged, sinon.match({
                discardedCards: [
                    sinon.match({ id: 'C2A' }),
                    sinon.match({ id: 'C3A' })
                ],
                events: [sinon.match({ type: 'discardCard' }), sinon.match({ type: 'discardCard' })]
            }));
        }
    }
}

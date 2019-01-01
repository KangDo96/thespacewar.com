const {
    bocha: {
        assert,
        refute,
        sinon
    },
    createCard,
    Player,
    createMatch,
    FakeConnection2,
    catchError,
    createState,
} = require('./shared.js');

module.exports = {
    'when has damageOwnStationCard requirement with count 2 and player has all target station cards': {
        setUp() {
            this.firstPlayerConnection = FakeConnection2(['stateChanged']);
            this.secondPlayerConnection = FakeConnection2(['stateChanged']);
            const players = [Player('P1A', this.firstPlayerConnection), Player('P2A', this.secondPlayerConnection)];
            this.match = createMatch({ players });
            this.match.restoreFromState(createState({
                playerStateById: {
                    'P1A': {
                        phase: 'action',
                        stationCards: [
                            { card: createCard({ id: 'C1A' }), place: 'action' },
                            { card: createCard({ id: 'C2A' }), place: 'action' }
                        ],
                        requirements: [
                            { type: 'damageOwnStationCard', count: 2 }
                        ]
                    }
                }
            }));

            this.match.damageOwnStationCards('P1A', { targetIds: ['C1A', 'C2A'] });
        },
        'should emit stateChanged with own flipped station card to first player'() {
            assert.calledOnce(this.firstPlayerConnection.stateChanged);
            assert.calledWith(this.firstPlayerConnection.stateChanged, sinon.match({
                stationCards: [
                    { card: sinon.match({ id: 'C1A' }), place: 'action', flipped: true },
                    { card: sinon.match({ id: 'C2A' }), place: 'action', flipped: true }
                ]
            }));
        },
        'should emit stateChanged WITHOUT requirement to first player'() {
            assert.calledOnce(this.firstPlayerConnection.stateChanged);
            assert.calledWith(this.firstPlayerConnection.stateChanged, sinon.match({
                requirements: []
            }));
        },
        'should emit stateChanged with flipped player station card to second player'() {
            assert.calledOnce(this.secondPlayerConnection.stateChanged);
            assert.calledWith(this.secondPlayerConnection.stateChanged, sinon.match({
                opponentStationCards: [
                    { card: sinon.match({ id: 'C1A' }), place: 'action', flipped: true },
                    { card: sinon.match({ id: 'C2A' }), place: 'action', flipped: true }
                ]
            }));
        }
    },
    'when player is MISSING 1 of the 2 target station cards': {
        setUp() {
            this.firstPlayerConnection = FakeConnection2(['stateChanged']);
            this.secondPlayerConnection = FakeConnection2(['stateChanged']);
            const players = [Player('P1A', this.firstPlayerConnection), Player('P2A', this.secondPlayerConnection)];
            this.match = createMatch({ players });
            this.match.restoreFromState(createState({
                playerStateById: {
                    'P1A': {
                        phase: 'action',
                        stationCards: [{ card: createCard({ id: 'C1A' }), place: 'action' }]
                    }
                }
            }));

            this.error = catchError(() => this.match.damageOwnStationCards('P1A', { targetIds: ['C1A', 'C2A'] }));
        },
        'should throw error'() {
            assert(this.error);
            assert.equals(this.error.message, 'Cannot damage station card');
        },
        'should NOT emit stateChanged to first player'() {
            refute.called(this.firstPlayerConnection.stateChanged);
        },
        'should NOT emit stateChanged to second player'() {
            refute.called(this.secondPlayerConnection.stateChanged);
        }
    },
    'when player does NOT have damageOwnStationCard requirement should throw': {
        setUp() {
            this.firstPlayerConnection = FakeConnection2(['stateChanged']);
            this.secondPlayerConnection = FakeConnection2(['stateChanged']);
            const players = [Player('P1A', this.firstPlayerConnection), Player('P2A', this.secondPlayerConnection)];
            this.match = createMatch({ players });
            this.match.restoreFromState(createState({
                playerStateById: {
                    'P1A': {
                        phase: 'action',
                        stationCards: [{ card: createCard({ id: 'C1A' }), place: 'action' }]
                    }
                }
            }));

            this.error = catchError(() => this.match.damageOwnStationCards('P1A', { targetIds: ['C1A'] }));
        },
        'should throw error'() {
            assert(this.error);
            assert.equals(this.error.message, 'Cannot damage station card');
        },
        'should NOT emit stateChanged to first player'() {
            refute.called(this.firstPlayerConnection.stateChanged);
        },
        'should NOT emit stateChanged to second player'() {
            refute.called(this.secondPlayerConnection.stateChanged);
        }
    },
    'when player has damageOwnStationCard requirement with count of 1 and has 2 target station cards should throw': {
        setUp() {
            this.firstPlayerConnection = FakeConnection2(['stateChanged']);
            this.secondPlayerConnection = FakeConnection2(['stateChanged']);
            const players = [Player('P1A', this.firstPlayerConnection), Player('P2A', this.secondPlayerConnection)];
            this.match = createMatch({ players });
            this.match.restoreFromState(createState({
                playerStateById: {
                    'P1A': {
                        phase: 'action',
                        stationCards: [
                            { card: createCard({ id: 'C1A' }), place: 'action' },
                            { card: createCard({ id: 'C2A' }), place: 'action' }
                        ],
                        requirements: [{ type: 'damageOwnStationCard', count: 1 }]
                    }
                }
            }));

            this.error = catchError(() => this.match.damageOwnStationCards('P1A', { targetIds: ['C1A', 'C2A'] }));
        },
        'should throw error'() {
            assert(this.error);
            assert.equals(this.error.message, 'Cannot damage station card');
        },
        'should NOT emit stateChanged to first player'() {
            refute.called(this.firstPlayerConnection.stateChanged);
        },
        'should NOT emit stateChanged to second player'() {
            refute.called(this.secondPlayerConnection.stateChanged);
        }
    }
};
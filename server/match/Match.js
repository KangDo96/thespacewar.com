const PutDownCardEvent = require('../../shared/PutDownCardEvent.js');
const DiscardCardEvent = require('../../shared/event/DiscardCardEvent.js');
const ActionPointsCalculator = require('../../shared/match/ActionPointsCalculator.js');

const TEMPORARY_START_PHASE = 'start';
const PHASES = ['draw', 'action', 'discard', 'attack'];
PHASES.draw = 'draw';
PHASES.action = 'action';
PHASES.discard = 'discard';
PHASES.attack = 'attack';
PHASES.wait = 'wait';

module.exports = function (deps) {

    const deckFactory = deps.deckFactory;
    const cardInfoRepository = deps.cardInfoRepository;
    const matchId = deps.matchId;
    const players = deps.players;

    const actionPointsCalculator = ActionPointsCalculator({ cardInfoRepository });

    const playerOrder = players.map(p => p.id);
    const firstPlayer = players.find(p => p.id === playerOrder[0]);
    const lastPlayer = players.find(p => p.id === playerOrder[1]);

    const state = {
        turn: 1,
        currentPlayer: players[0].id,
        playerOrder,
        playersReady: 0,
        playerState: {},
        deckByPlayerId: {
            [players[0].id]: deckFactory.create(),
            [players[1].id]: deckFactory.create(),
        }
    };

    return {
        id: matchId,
        matchId, //TODO Remove all uses
        players,
        start,
        getOwnState: getPlayerState,
        nextPhase,
        putDownCard,
        discardCard,
        updatePlayer,
        toClientModel
    };

    function start() { // TODO Should take player id and only restore game state for player responsible for event
        const gameHasAlreadyStarted = state.playersReady >= players.length;
        if (gameHasAlreadyStarted) {
            for (let player of players) {
                emitRestoreStateForPlayer(player.id);
            }
        }
        else {
            state.playersReady++;
            if (state.playersReady === players.length) {
                players.forEach(player => startGameForPlayer(player.id));
                players.forEach(player => emitBeginGameForPlayer(player.id));
            }
        }
    }

    function nextPhase(playerId) {
        if (playerId !== state.currentPlayer) {
            throw CheatError('Switching phase when not your own turn');
        }

        const playerState = getPlayerState(playerId);

        if (playerState.phase === PHASES.discard) {
            leaveDiscardPhaseForPlayer(state.currentPlayer);
        }

        const isLastPhase = playerState.phase === PHASES.attack;
        if (isLastPhase) {
            endTurnForCurrentPlayer();
        }
        else {
            playerState.phase = getNextPhase(playerState.phase);
        }

        const currentPlayerState = getPlayerState(state.currentPlayer);
        if (currentPlayerState.phase === PHASES.draw) {
            startDrawPhaseForPlayer(state.currentPlayer);
        }
        else if (currentPlayerState.phase === PHASES.action) {
            startActionPhaseForPlayer(state.currentPlayer);
        }
    }

    function getNextPhase(currentPhase) {
        return PHASES[(PHASES.indexOf(currentPhase) + 1)];
    }

    function startActionPhaseForPlayer(playerId) {
        emitToPlayer(playerId, 'setActionPoints', getActionPointsForPlayer(playerId));
    }

    function leaveDiscardPhaseForPlayer(playerId) {
        const playerStationCards = getPlayerStationCards(playerId);
        const maxHandSize = getMaxHandSizeFromStationCards(playerStationCards);
        const playerState = getPlayerState(playerId);
        if (playerState.cardsOnHand.length > maxHandSize) {
            throw CheatError('Cannot leave the discard phase without discarding enough cards');
        }
    }

    function endTurnForCurrentPlayer() {
        let playerState = getPlayerState(state.currentPlayer);
        playerState.phase = PHASES.wait;

        const isLastPlayerOfTurn = state.currentPlayer === lastPlayer.id;
        if (isLastPlayerOfTurn) {
            state.turn += 1;
            state.currentPlayer = firstPlayer.id;
        }
        else {
            state.currentPlayer = lastPlayer.id;
        }

        let newCurrentPlayerState = getPlayerState(state.currentPlayer);
        newCurrentPlayerState.phase = PHASES.draw;

        emitNextPlayer();
    }

    function putDownCard(playerId, { location, cardId }) {
        if (playerId !== state.currentPlayer) {
            throw CheatError('Cannot put down card when it is not your turn');
        }

        const playerState = getPlayerState(playerId);
        const cardIndexOnHand = playerState.cardsOnHand.findIndex(c => c.id === cardId);
        const card = playerState.cardsOnHand[cardIndexOnHand];
        if (!card) throw CheatError('Card is not on hand');

        const playerActionPoints = getActionPointsForPlayer(playerId)
        const canAffordCard = playerActionPoints >= card.cost;
        const isStationCard = location.startsWith('station');
        const hasAlreadyPutDownStationCard = playerState.events.some(e => {
            return e.turn === state.turn
                && e.type === 'putDownCard'
                && e.location.startsWith('station');
        })
        if (isStationCard && hasAlreadyPutDownStationCard) {
            throw CheatError('Cannot put down more than one station card on the same turn');
        }
        if (!canAffordCard && !isStationCard) {
            throw CheatError('Cannot afford card');
        }

        if (isStationCard) {
            const stationLocation = location.split('-').pop();
            playerState.stationCards.push({ place: stationLocation, card });
        }
        else if (location === 'zone') {
            playerState.cardsInZone.push(card);
        }

        playerState.cardsOnHand.splice(cardIndexOnHand, 1);
        playerState.events.push(PutDownCardEvent({ turn: state.turn, location, cardId }));

        emitToOpponent(playerId, 'putDownOpponentCard', { location });
    }

    function discardCard(playerId, cardId) {
        const playerState = getPlayerState(playerId);
        const cardIndexOnHand = playerState.cardsOnHand.findIndex(c => c.id === cardId);
        const discardedCard = playerState.cardsOnHand[cardIndexOnHand];
        if (!discardedCard) throw new Error('Invalid state - someone is cheating');
        playerState.cardsOnHand.splice(cardIndexOnHand, 1);
        playerState.discardedCards.push(discardedCard);

        const opponentId = getOpponentId(playerId);
        const opponentDeck = getOpponentDeck(playerId);
        const opponentState = getOpponentState(playerId);
        const opponentCardCount = getPlayerCardCount(playerId)
        if (playerState.phase === 'action') {
            const bonusCard = opponentDeck.drawSingle();
            opponentState.cardsOnHand.push(bonusCard);
            emitToPlayer(opponentId, 'opponentDiscardedCard', {
                bonusCard,
                discardedCard,
                opponentCardCount
            });
        }
        else {
            emitToPlayer(opponentId, 'opponentDiscardedCard', { discardedCard, opponentCardCount });
        }

        playerState.events.push(DiscardCardEvent({ turn: state.turn, phase: playerState.phase, cardId }));
        emitOpponentCardCountToPlayer(playerId);
    }

    function startDrawPhaseForPlayer(playerId) {
        const deck = getPlayerDeck(playerId);
        const amountCardsToDraw = getStationDrawCardsCount(playerId);
        let cards = deck.draw(amountCardsToDraw);
        const playerState = getPlayerState(playerId);
        playerState.cardsOnHand.push(...cards);
        emitToPlayer(playerId, 'drawCards', cards);

        const opponentId = getOpponentId(playerId)
        emitOpponentCardCountToPlayer(opponentId);
    }

    function getPlayerState(playerId) {
        return state.playerState[playerId];
    }

    function updatePlayer(playerId, mergeData) {
        const player = players.find(p => p.id === playerId);
        Object.assign(player, mergeData);
    }

    function emitOpponentCardCountToPlayer(playerId) {
        emitToPlayer(playerId, 'setOpponentCardCount', getOpponentCardCount(playerId));
    }

    function emitRestoreStateForPlayer(playerId) {
        const playerState = state.playerState[playerId];
        const actionPointsForPlayer = getActionPointsForPlayer(playerId)
        emitToPlayer(playerId, 'restoreState', {
            ...playerState,
            actionPoints: actionPointsForPlayer,
            turn: state.turn,
            currentPlayer: state.currentPlayer,
            opponentCardCount: getOpponentCardCount(playerId),
            opponentDiscardedCards: getOpponentDiscardedCards(playerId),
            opponentStationCards: getOpponentStationCards(playerId)
        });
    }

    function startGameForPlayer(playerId) {
        let playerDeck = state.deckByPlayerId[playerId];
        let stationCards = [
            { card: playerDeck.drawSingle(), place: 'draw' },
            { card: playerDeck.drawSingle(), place: 'action' },
            { card: playerDeck.drawSingle(), place: 'action' },
            { card: playerDeck.drawSingle(), place: 'action' },
            { card: playerDeck.drawSingle(), place: 'handSize' }
        ];
        let cardsOnHand = playerDeck.draw(7);
        state.playerState[playerId] = {
            cardsOnHand,
            stationCards,
            cardsInZone: [],
            discardedCards: [],
            phase: TEMPORARY_START_PHASE,
            actionPoints: 0,
            events: []
        };
    }

    function emitBeginGameForPlayer(playerId) {
        const { stationCards, cardsOnHand, phase } = state.playerState[playerId];
        emitToPlayer(playerId, 'beginGame', {
            stationCards,
            cardsOnHand,
            phase,
            currentPlayer: state.currentPlayer,
            opponentCardCount: getOpponentCardCount(playerId),
            opponentStationCards: getOpponentStationCards(playerId)
        });
    }

    function emitNextPlayer() {
        for (const player of players) {
            emitToPlayer(player.id, 'nextPlayer', {
                turn: state.turn,
                currentPlayer: state.currentPlayer
            });
        }
    }

    function emitToOpponent(playerId, action, value) {
        const opponent = players.find(p => p.id !== playerId);
        emitToPlayer(opponent.id, action, value);
    }

    function emitToPlayer(playerId, action, value) {
        const player = players.find(p => p.id === playerId)
        player.connection.emit('match', { matchId, action, value });
    }

    function getActionPointsForPlayer(playerId) {
        const playerState = getPlayerState(playerId);
        const playerStationCards = getPlayerStationCards(playerId);
        const actionStationCardsCount = playerStationCards.filter(s => s.place === 'action').length;
        return actionPointsCalculator.calculate({
            phase: playerState.phase,
            events: playerState.events,
            turn: state.turn,
            actionStationCardsCount
        });
    }

    function getStationDrawCardsCount(playerId) {
        let stationCards = getPlayerStationCards(playerId);
        return stationCards
            .filter(card => card.place === 'draw')
            .length;
    }

    function getMaxHandSizeFromStationCards(stationCards) {
        return stationCards
            .filter(c => c.place === 'handSize')
            .length * 3;
    }

    function toClientModel() {
        return {
            playerIds: players.map(p => p.id),
            id: matchId
        }
    }

    function getOpponentCardCount(playerId) {
        const opponentId = getOpponentId(playerId);
        return getPlayerCardCount(opponentId);
    }

    function getPlayerCardCount(playerId) {
        const playerState = state.playerState[playerId];
        return playerState.cardsOnHand.length;
    }

    function getOpponentDiscardedCards(playerId) {
        const opponentId = getOpponentId(playerId);
        return getPlayerDiscardedCards(opponentId);
    }

    function getPlayerDiscardedCards(playerId) {
        const playerState = state.playerState[playerId];
        return playerState.discardedCards;
    }

    function getOpponentStationCards(playerId) {
        return getPlayerStationCards(getOpponentId(playerId));
    }

    function getPlayerStationCards(playerId) {
        const opponentState = state.playerState[playerId];
        return opponentState.stationCards.map(s => ({ place: s.place }));
    }

    function getOpponentId(playerId) {
        return players.find(p => p.id !== playerId).id;
    }

    function getOpponentState(playerId) {
        return state.playerState[getOpponentId(playerId)];
    }

    function getPlayerDeck(playerId) {
        return state.deckByPlayerId[playerId];
    }

    function getOpponentDeck(playerId) {
        return getPlayerDeck(getOpponentId(playerId));
    }
};

function CheatError(reason) {
    const error = new Error(reason);
    error.message = reason;
    error.type = 'CheatDetected';
    return error;
}
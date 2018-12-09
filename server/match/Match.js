const PutDownCardEvent = require('../../shared/PutDownCardEvent.js');
const DiscardCardEvent = require('../../shared/event/DiscardCardEvent.js');
const MoveCardEvent = require('../../shared/event/MoveCardEvent.js');
const RepairCardEvent = require('../../shared/event/RepairCardEvent.js');
const ActionPointsCalculator = require('../../shared/match/ActionPointsCalculator.js');
const DrawPhaseController = require('./DrawPhaseController.js');
const AttackController = require('./AttackController.js');
const MatchComService = require('./MatchComService.js');
const MatchService = require('../../shared/match/MatchService.js');
const ServerQueryEvents = require('./ServerQueryEvents.js');
const PlayerStateService = require('../../shared/match/PlayerStateService.js');
const CardFactory = require('../card/ServerCardFactory.js');
const { COMMON_PHASE_ORDER, PHASES, TEMPORARY_START_PHASE } = require('../../shared/phases.js');

const itemNamesForOpponentByItemNameForPlayer = {
    stationCards: 'opponentStationCards',
    cardsInZone: 'opponentCardsInZone',
    cardsInOpponentZone: 'opponentCardsInPlayerZone',
    discardedCards: 'opponentDiscardedCards'
};

module.exports = function (deps) {

    const deckFactory = deps.deckFactory;
    const cardInfoRepository = deps.cardInfoRepository;
    const matchId = deps.matchId;
    const players = deps.players;
    const actionPointsCalculator = deps.actionPointsCalculator || ActionPointsCalculator({ cardInfoRepository });

    const playerOrder = players.map(p => p.id);
    const firstPlayer = players.find(p => p.id === playerOrder[0]);
    const lastPlayer = players.find(p => p.id === playerOrder[1]);

    const state = {
        turn: 1,
        currentPlayer: players[0].id,
        playerOrder,
        playersReady: 0,
        playerStateById: {},
        deckByPlayerId: {
            [players[0].id]: deckFactory.create(),
            [players[1].id]: deckFactory.create(),
        }
    };

    const matchService = new MatchService();
    matchService.setState(state);
    const cardFactory = new CardFactory({ getFreshState: () => state });
    const matchComService = new MatchComService({
        matchId,
        playerIds: players.map(p => p.id),
        connectionsByPlayerId: {
            [players[0].id]: players[0].connection,
            [players[1].id]: players[1].connection
        }
    });
    const playerStateServiceById = {};
    for (let player of players) {
        playerStateServiceById[player.id] = new PlayerStateService({
            playerId: player.id,
            matchService,
            queryEvents: new ServerQueryEvents({ playerId: player.id, matchService })
        });
    }
    const controllerDeps = {
        matchService,
        matchComService,
        playerStateServiceById,
        cardFactory
    };
    const drawPhaseController = DrawPhaseController(controllerDeps);
    const attackController = AttackController(controllerDeps);

    return {
        id: matchId,
        matchId, //TODO Remove all uses
        players,
        start,
        getOwnState: getPlayerState,
        nextPhase,
        putDownCard,
        drawCard: drawPhaseController.onDrawCard,
        discardOpponentTopTwoCards: drawPhaseController.onDiscardOpponentTopTwoCards,
        discardCard, //TODO Rename discardFromHand
        discardDurationCard,
        moveCard,
        attack: attackController.onAttack,
        attackStationCard: attackController.onAttackStationCards, // TODO Rename attackStationCards (pluralized)
        repairCard,
        retreat,
        updatePlayer,
        restoreFromState,
        toClientModel,
        hasEnded
    };

    function start() {
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
        if (playerState.phase === PHASES.preparation) {
            const actionPoints = getActionPointsForPlayer(playerId);
            if (actionPoints < 0) {
                throw CheatError('Cannot go to next phase with less than 0 action points');
            }
        }


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
        if (currentPlayerState.phase === PHASES.action) {
            startActionPhaseForPlayer(state.currentPlayer);
        }
    }

    function getNextPhase(currentPhase) {
        return COMMON_PHASE_ORDER[(COMMON_PHASE_ORDER.indexOf(currentPhase) + 1)];
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
        const hasDurationCardInPlay = newCurrentPlayerState.cardsInZone.some(c => c.type === 'duration');
        if (hasDurationCardInPlay) {
            newCurrentPlayerState.phase = PHASES.preparation;
        }
        else {
            newCurrentPlayerState.phase = PHASES.draw;
        }

        emitNextPlayer();
    }

    function putDownCard(playerId, { location, cardId }) {
        if (playerId !== state.currentPlayer) {
            throw CheatError('Cannot put down card when it is not your turn');
        }
        const playerState = getPlayerState(playerId);
        const puttingDownStationCard = location === 'zone' && playerState.stationCards.some(s => s.card.id === cardId);
        if (puttingDownStationCard) {
            moveStationCardToOwnZone(playerId, cardId);
            return;
        }

        const cardIndexOnHand = playerState.cardsOnHand.findIndex(c => c.id === cardId);
        const cardOnHand = playerState.cardsOnHand[cardIndexOnHand];
        if (!cardOnHand) throw CheatError('Card is not on hand');

        const playerActionPoints = getActionPointsForPlayer(playerId)
        const canAffordCard = playerActionPoints >= cardOnHand.cost;
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

        playerState.cardsOnHand.splice(cardIndexOnHand, 1);
        playerState.events.push(PutDownCardEvent({
            turn: state.turn,
            location,
            cardId,
            cardCommonId: cardOnHand.commonId
        }));

        const opponentId = getOpponentId(playerId);
        if (isStationCard) {
            const stationLocation = location.split('-').pop();
            const stationCard = { place: stationLocation, card: cardOnHand };
            playerState.stationCards.push(stationCard);
            emitToPlayer(opponentId, 'putDownOpponentStationCard', prepareStationCardForClient(stationCard));
        }
        else if (location === 'zone') {
            if (cardOnHand.type === 'event') {
                playerState.discardedCards.push(cardOnHand);
                emitToPlayer(opponentId, 'opponentDiscardedCard', {
                    discardedCard: cardOnHand,
                    opponentCardCount: playerState.cardsOnHand.length
                });
            }
            else {
                playerState.cardsInZone.push(cardOnHand);
                emitToPlayer(opponentId, 'putDownOpponentCard', { location, card: cardOnHand });
            }
        }
    }

    function moveStationCardToOwnZone(playerId, cardId) {
        const playerState = getPlayerState(playerId);
        const stationCard = playerState.stationCards.find(s => s.card.id === cardId);
        if (!stationCard.flipped) throw CheatError('Cannot move station card that is not flipped to zone');

        const card = stationCard.card;
        const playerActionPoints = getActionPointsForPlayer(playerId)
        const canAffordCard = playerActionPoints >= card.cost;
        if (!canAffordCard) {
            throw CheatError('Cannot afford card');
        }

        playerState.stationCards = playerState.stationCards.filter(s => s.card.id !== cardId);
        playerState.events.push(PutDownCardEvent({
            turn: state.turn,
            location: 'zone',
            cardId,
            cardCommonId: card.commonId
        }));

        const opponentId = getOpponentId(playerId);
        if (card.type === 'event') {
            playerState.discardedCards.push(card);
            emitToPlayer(opponentId, 'opponentDiscardedCard', {
                discardedCard: card,
                opponentCardCount: playerState.cardsOnHand.length
            });
        }
        else {
            playerState.cardsInZone.push(card);
            emitToPlayer(opponentId, 'putDownOpponentCard', { location: 'zone', card });
        }
    }

    function discardCard(playerId, cardId) {
        const playerState = getPlayerState(playerId);
        const cardIndexOnHand = playerState.cardsOnHand.findIndex(c => c.id === cardId);
        const discardedCard = playerState.cardsOnHand[cardIndexOnHand];
        if (!discardedCard) throw new Error('Invalid state - someone is cheating');

        playerState.cardsOnHand.splice(cardIndexOnHand, 1);
        playerState.discardedCards.push(discardedCard);

        const playerCardCount = getPlayerCardCount(playerId)
        const opponentId = getOpponentId(playerId);
        const opponentDeck = getOpponentDeck(playerId);
        const opponentState = getOpponentState(playerId);

        if (playerState.phase === 'action') {
            const bonusCard = opponentDeck.drawSingle();
            opponentState.cardsOnHand.push(bonusCard);
            emitToPlayer(opponentId, 'opponentDiscardedCard', {
                bonusCard,
                discardedCard,
                opponentCardCount: playerCardCount
            });
        }
        else {
            emitToPlayer(opponentId, 'opponentDiscardedCard', { discardedCard, opponentCardCount: playerCardCount });
        }

        playerState.events.push(DiscardCardEvent({
            turn: state.turn,
            phase: playerState.phase,
            cardId,
            cardCommonId: discardedCard.commonId
        }));
        emitOpponentCardCountToPlayer(playerId);
    }

    function discardDurationCard(playerId, cardId) {
        const playerState = getPlayerState(playerId);
        if (playerState.phase !== PHASES.preparation) {
            throw CheatError('Cannot discard duration cards after turn your has started');
        }

        const cardData = playerState.cardsInZone.find(c => c.id === cardId);
        removePlayerCard(playerId, cardId);
        playerState.discardedCards.push(cardData);

        const opponentId = getOpponentId(playerId);
        emitToPlayer(opponentId, 'opponentDiscardedDurationCard', { card: cardData });

        playerState.events.push(DiscardCardEvent({
            turn: state.turn,
            phase: playerState.phase,
            cardId,
            cardCommonId: cardData.commonId
        }));
    }

    function moveCard(playerId, cardId) {
        let playerState = getPlayerState(playerId);
        let cardIndex = playerState.cardsInZone.findIndex(c => c.id === cardId);
        let cardData = playerState.cardsInZone[cardIndex];
        if (!cardData) throw CheatError('Cannot move card that is not in your own zone');
        const card = cardFactory.createCardForPlayer(cardData, playerId);
        if (!card.canMove()) throw CheatError('Cannot move card');

        playerState.cardsInZone.splice(cardIndex, 1);
        playerState.cardsInOpponentZone.push(cardData);
        playerState.events.push(MoveCardEvent({ turn: state.turn, cardId, cardCommonId: cardData.commonId }));

        emitToOpponent(playerId, 'opponentMovedCard', cardId)
    }

    function findPlayerCard(playerId, cardId) {
        const playerState = getPlayerState(playerId);
        return playerState.cardsInZone.find(c => c.id === cardId)
            || playerState.cardsInOpponentZone.find(c => c.id === cardId)
            || null;
    }

    function removePlayerCard(playerId, cardId) {
        const playerState = getPlayerState(playerId);

        const cardInZoneIndex = playerState.cardsInZone.findIndex(c => c.id === cardId);
        if (cardInZoneIndex >= 0) {
            playerState.cardsInZone.splice(cardInZoneIndex, 1);
        }
        else {
            const cardInOpponentZoneIndex = playerState.cardsInOpponentZone.findIndex(c => c.id === cardId);
            if (cardInOpponentZoneIndex >= 0) {
                playerState.cardsInOpponentZone.splice(cardInOpponentZoneIndex, 1);
            }
        }
    }

    function updatePlayerCard(playerId, cardId, updateFn) {
        const playerState = getPlayerState(playerId);
        let card = playerState.cardsInZone.find(c => c.id === cardId)
            || playerState.cardsInOpponentZone.find(c => c.id === cardId);
        if (!card) throw Error('Could not find card when trying to update it. ID: ' + cardId);
        updateFn(card);
    }

    function repairCard(playerId, { repairerCardId, cardToRepairId }) {
        const repairerCardData = findPlayerCard(playerId, repairerCardId);
        const repairerCard = cardFactory.createCardForPlayer(repairerCardData, playerId);
        if (!repairerCard.canRepair()) throw CheatError('Cannot repair');

        const cardToRepairData = findPlayerCard(playerId, cardToRepairId);
        const cardToRepair = cardFactory.createCardForPlayer(cardToRepairData, playerId);
        repairerCard.repairCard(cardToRepair);
        updatePlayerCard(playerId, cardToRepair.id, card => {
            card.damage = cardToRepair.damage;
        });

        const playerState = getPlayerState(playerId);
        playerState.events.push(RepairCardEvent({
            turn: state.turn,
            cardId: repairerCard.id,
            cardCommonId: repairerCard.commonId,
            repairedCardId: cardToRepair.id,
            repairedCardCommonId: cardToRepair.commonId
        }));
        let zoneName = playerState.cardsInZone.some(c => c.id === cardToRepair.id)
            ? 'cardsInZone'
            : 'cardsInOpponentZone';
        emitToOpponent(playerId, 'stateChanged', {
            [itemNamesForOpponentByItemNameForPlayer[zoneName]]: playerState[zoneName],
            events: playerState.events
        });
    }

    function retreat(playerId) {
        const opponentId = getOpponentId(playerId);
        emitToPlayer(opponentId, 'opponentRetreated');

        state.ended = true;
        state.playerRetreated = playerId;
    }

    function getPlayerState(playerId) {
        return state.playerStateById[playerId];
    }

    function updatePlayer(playerId, mergeData) {
        const player = players.find(p => p.id === playerId);
        Object.assign(player, mergeData);
    }

    function restoreFromState(restoreState) {
        for (let key of Object.keys(restoreState)) {
            state[key] = restoreState[key];
        }

        state.playersReady = 2;
    }

    function emitOpponentCardCountToPlayer(playerId) {
        emitToPlayer(playerId, 'setOpponentCardCount', getOpponentCardCount(playerId));
    }

    function emitRestoreStateForPlayer(playerId) {
        const playerState = getPlayerState(playerId);
        const actionPointsForPlayer = getActionPointsForPlayer(playerId)
        const opponentState = getOpponentState(playerId);
        const playerRetreated = !!state.playerRetreated ? state.playerRetreated === playerId : false;
        const opponentRetreated = !!state.playerRetreated ? state.playerRetreated !== playerId : false;
        const opponentStationCards = getOpponentStationCards(playerId);
        emitToPlayer(playerId, 'restoreState', {
            ...playerState,
            stationCards: prepareStationCardsForClient(playerState.stationCards),
            actionPoints: actionPointsForPlayer,
            turn: state.turn,
            currentPlayer: state.currentPlayer,
            opponentCardsInZone: opponentState.cardsInZone,
            opponentCardsInPlayerZone: opponentState.cardsInOpponentZone,
            opponentCardCount: getOpponentCardCount(playerId),
            opponentDiscardedCards: getOpponentDiscardedCards(playerId),
            opponentStationCards: prepareStationCardsForClient(opponentStationCards),
            opponentRetreated,
            playerRetreated
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
        state.playerStateById[playerId] = {
            cardsOnHand,
            stationCards,
            cardsInZone: [],
            cardsInOpponentZone: [],
            discardedCards: [],
            phase: TEMPORARY_START_PHASE,
            actionPoints: 0,
            events: []
        };
    }

    function emitBeginGameForPlayer(playerId) {
        const {
            stationCards,
            cardsOnHand,
            phase,
        } = getPlayerState(playerId);
        const opponentStationCards = getOpponentStationCards(playerId)
        emitToPlayer(playerId, 'beginGame', {
            stationCards: prepareStationCardsForClient(stationCards),
            cardsOnHand,
            phase,
            currentPlayer: state.currentPlayer,
            opponentCardCount: getOpponentCardCount(playerId),
            opponentStationCards: prepareStationCardsForClient(opponentStationCards)
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

    function hasEnded() {
        return state.ended;
    }

    function getOpponentCardCount(playerId) {
        const opponentId = getOpponentId(playerId);
        return getPlayerCardCount(opponentId);
    }

    function getPlayerCardCount(playerId) {
        const playerState = getPlayerState(playerId);
        return playerState.cardsOnHand.length;
    }

    function getOpponentDiscardedCards(playerId) {
        const opponentId = getOpponentId(playerId);
        return getPlayerDiscardedCards(opponentId);
    }

    function getPlayerDiscardedCards(playerId) {
        const playerState = getPlayerState(playerId);
        return playerState.discardedCards;
    }

    function getOpponentStationCards(playerId) {
        return getPlayerStationCards(getOpponentId(playerId));
    }

    function getPlayerStationCards(playerId) {
        const playerState = getPlayerState(playerId);
        return playerState.stationCards;
    }

    function prepareStationCardsForClient(stationCards) {
        return stationCards.map(prepareStationCardForClient);
    }

    function prepareStationCardForClient(stationCard) {
        let model = {
            id: stationCard.card.id,
            place: stationCard.place
        };
        if (stationCard.flipped) {
            model.flipped = true;
            model.card = stationCard.card;
        }
        return model;
    }

    function getOpponentId(playerId) {
        return players.find(p => p.id !== playerId).id;
    }

    function getOpponentState(playerId) {
        return getPlayerState(getOpponentId(playerId));
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
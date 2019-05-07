const PlayerServiceProvider = require('../../../shared/match/PlayerServiceProvider.js');
const CheatError = require('../CheatError.js');

module.exports = function (deps) {

    const {
        matchComService,
        playerServiceProvider,
        cardFactory
    } = deps;

    return {
        onMoveCard
    };

    function onMoveCard(playerId, cardId) {
        let cannotMove = playerServiceProvider.byTypeAndId(PlayerServiceProvider.TYPE.canThePlayer, playerId).moveCards();
        if (!cannotMove) throw new CheatError('Cannot move');

        let playerStateService = playerServiceProvider.getStateServiceById(playerId);
        const cardData = playerStateService.findCard(cardId);
        const card = cardFactory.createCardForPlayer(cardData, playerId);
        if (!card.canMove()) throw new CheatError('Cannot move card');

        playerStateService.moveCard(cardId);
        matchComService.emitToOpponentOf(playerId, 'opponentMovedCard', cardId)
    }
};

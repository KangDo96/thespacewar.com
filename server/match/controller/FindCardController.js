const CheatError = require('../CheatError.js');
const SourceFetcher = require("../../../shared/match/requirement/SourceFetcher.js");

module.exports = function ({
    playerRequirementUpdaterFactory,
    playerServiceProvider,
    matchService,
    playerServiceFactory,
    stateMemento
}) {

    return {
        onSelectCard
    };

    function onSelectCard(playerId, { cardGroups }) {
        const selectedCardsCount = getSelectedCardsCount(cardGroups);
        validateIfCanProgressRequirementByCount(selectedCardsCount, playerId);

        const playerRequirementService = playerServiceProvider.getRequirementServiceById(playerId);
        const requirement = playerRequirementService.getFirstMatchingRequirement({ type: 'findCard' });

        progressRequirementByCount(selectedCardsCount, playerId);

        if (requirement.target === 'homeZone') {
            moveCardsToHomeZone(cardGroups, playerId);
        }
        else if (requirement.target === 'hand') {
            moveCardsToHand(cardGroups, playerId);
        }
        else if (requirement.target === 'opponentDiscardPile') {
            moveCardsToOpponentDiscardPile(cardGroups, playerId);
        }
    }

    function validateIfCanProgressRequirementByCount(count, playerId) {
        const playerRequirementUpdater = playerRequirementUpdaterFactory.create(playerId, { type: 'findCard' });
        const canProgressRequirement = playerRequirementUpdater.canProgressRequirementByCount(count);
        if (!canProgressRequirement) {
            throw new CheatError('Cannot select more cards than required');
        }
    }

    function progressRequirementByCount(count, playerId) {
        const playerRequirementUpdater = playerRequirementUpdaterFactory.create(playerId, { type: 'findCard' });
        playerRequirementUpdater.progressRequirementByCount(count);
    }

    function moveCardsToHomeZone(cardGroups, playerId) {
        const playerStateService = playerServiceProvider.getStateServiceById(playerId);

        const cardIds = [];
        const cardCommonIds = [];
        for (const group of cardGroups) {
            for (const cardId of group.cardIds) {
                const cardData = removeCardFromSource(cardId, group.source, playerId);
                playerStateService.putDownCardInZone(cardData, { grantedForFreeByEvent: true });

                cardIds.push(cardData.id);
                cardCommonIds.push(cardData.commonId);
            }
        }

        //NOTE:
        // Problematic scenario: You put down 2 cards using Missiles Launched. Opponent counters one of them.
        //  Depending on which card is countered, both cards might be removed, and you would get 2 choose 2 cards again
        //  which could be the same cards again! But logically in the physical game, only the card countered in that scenario
        //  should be removed. A workaround is as follows below, register the state after both cards has been played and
        //  requirement removed. When you counter any of these cards they will be removed from play (as opposed to before being played).
        //  A caveat is that if any card here would add a requirement when played, that requirement would still be active
        //  after the card has been countered. If that would be the case in the future, this solution would have to be reconsidered.
        for (const group of cardGroups) {
            for (const cardId of group.cardIds) {
                stateMemento.saveStateForCardId(cardId);
            }
        }

        const opponentId = matchService.getOpponentId(playerId);
        const opponentActionLog = playerServiceFactory.actionLog(opponentId);
        opponentActionLog.opponentPlayedCards({ cardIds, cardCommonIds })
    }

    function moveCardsToHand(cardGroups, playerId) {
        const playerStateService = playerServiceProvider.getStateServiceById(playerId);
        for (const group of cardGroups) {
            for (const cardId of group.cardIds) {
                const cardData = removeCardFromSource(cardId, group.source, playerId);
                playerStateService.addCardToHand(cardData);
            }
        }
    }

    function moveCardsToOpponentDiscardPile(cardGroups, playerId) {
        const opponentId = matchService.getOpponentId(playerId);
        const opponentStateService = playerServiceProvider.getStateServiceById(opponentId);

        const cardCommonIds = [];
        for (const group of cardGroups) {
            for (const cardId of group.cardIds) {
                const playerSource = SourceFetcher.opponentSourceToPlayerSource(group.source);
                const cardData = removeCardFromSource(cardId, playerSource, opponentId);
                cardCommonIds.push(cardData.commonId);
                opponentStateService.discardCard(cardData);
            }
        }

        const opponentActionLog = playerServiceFactory.actionLog(opponentId);
        opponentActionLog.cardsDiscarded({ cardCommonIds });
    }

    function removeCardFromSource(cardId, source, playerId) {
        const playerStateService = playerServiceProvider.getStateServiceById(playerId);
        if (source === 'deck') {
            return playerStateService.removeCardFromDeck(cardId);
        }
        else if (source === 'discardPile') {
            return playerStateService.removeCardFromDiscardPile(cardId);
        }
        else if (source === 'hand') {
            return playerStateService.removeCardFromHand(cardId);
        }
        else if (source === 'cardsInZone') {
            return playerStateService.removeCardFromHomeZone(cardId);
        }
        else if (sourceIsStationCard(source)) {
            const stationCard = playerStateService.removeStationCard(cardId);
            return stationCard.card;
        }
    }

    function sourceIsStationCard(source) {
        return source === 'drawStationCards'
            || source === 'actionStationCards'
            || source === 'handSizeStationCards'
    }

    function getSelectedCardsCount(cardGroups) {
        return cardGroups.reduce((total, group) => total + group.cardIds.length, 0);
    }
};

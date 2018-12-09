const itemNamesForOpponentByItemNameForPlayer = require('./itemNamesForOpponentByItemNameForPlayer.js');
const CheatError = require('./CheatError.js');
const { PHASES } = require('../../shared/phases.js');

function AttackController(deps) {

    const {
        matchService,
        matchComService,
        playerStateServiceById,
        cardFactory
    } = deps;

    return {
        onAttack,
        onAttackStationCards
    }

    function onAttack(playerId, { attackerCardId, defenderCardId }) {
        const playerStateService = playerStateServiceById[playerId];
        const playerPhase = playerStateService.getPhase();
        if (playerPhase !== PHASES.attack) throw new CheatError('Cannot attack when not in attack phase');

        const attackerCardData = playerStateService.findCard(attackerCardId);

        const attackerCard = cardFactory.createCardForPlayer(attackerCardData, playerId);
        if (!attackerCard.canAttack()) throw new CheatError('Cannot attack with card');

        const opponentId = matchComService.getOpponentId(playerId);
        const opponentStateService = playerStateServiceById[opponentId];
        const defenderCardData = opponentStateService.findCard(defenderCardId);
        const defenderCard = cardFactory.createCardForPlayer(defenderCardData, opponentId);
        if (!attackerCard.canAttackCard(defenderCard)) throw new CheatError('Cannot attack that card');
        if (defenderCard.isInOpponentZone() === attackerCard.isInOpponentZone()) {
            throw new CheatError('Cannot attack card in another zone');
        }

        attackerCard.attackCard(defenderCard);

        matchComService.emitToPlayer(opponentId, 'opponentAttackedCard', {
            attackerCardId,
            defenderCardId,
            newDamage: defenderCard.damage,
            defenderCardWasDestroyed: defenderCard.destroyed,
            attackerCardWasDestroyed: attackerCard.destroyed
        });
        playerStateService.registerAttack(attackerCardId);

        if (defenderCard.destroyed) {
            opponentStateService.removeCard(defenderCardId);
        }
        else {
            opponentStateService.updateCard(defenderCardId, card => {
                card.damage = defenderCard.damage;
            });
        }

        if (attackerCard.destroyed) {
            playerStateService.removeCard(attackerCardId);
        }
    }

    function onAttackStationCards(playerId, { attackerCardId, targetStationCardIds }) {
        let opponentId = matchComService.getOpponentId(playerId);
        let opponentStateService = playerStateServiceById[opponentId];
        let opponentState = opponentStateService._getPlayerState();

        let playerStateService = playerStateServiceById[playerId];
        const attackerCardData = playerStateService
            .getCardsInOpponentZone()
            .find(c => c.id === attackerCardId);
        if (!attackerCardData) throw new CheatError('Can only attack station card from enemy zone');

        const opponentStationCards = opponentState.stationCards;
        if (opponentStationCards.length > targetStationCardIds.length
            && attackerCardData.attack > targetStationCardIds.length) {
            throw new CheatError('Need more target station cards to attack');
        }

        const attackerCard = cardFactory.createCardForPlayer(attackerCardData, playerId);
        if (!attackerCard.canAttackStationCards()) {
            throw new CheatError('Cannot attack station');
        }
        if (targetStationCardIds.length > attackerCard.attack) {
            throw new CheatError('Cannot attack that many station cards with card');
        }

        const targetStationCards = opponentStationCards.filter(s => targetStationCardIds.includes(s.card.id));
        if (!targetStationCards.length) return;
        if (targetStationCards.some(c => c.flipped)) {
            throw new CheatError('Cannot attack a flipped station card');
        }

        const opponentCardsInHomeZone = opponentState.cardsInZone.map(cardData => cardFactory.createCardForPlayer(cardData, opponentId));

        let opponentAffectedItems = new Set();
        let finalTargetStationCardIds = targetStationCardIds;
        const cardsWithEffectOnAttack = opponentCardsInHomeZone.filter(card => card.hasEffectOnStationAttack({ targetStationCards }));
        if (cardsWithEffectOnAttack.length) {
            cardsWithEffectOnAttack.sort((a, b) => a.getImportanceOnStationAttack() - b.getImportanceOnStationAttack());
            for (let card of cardsWithEffectOnAttack) {
                const outcome = card.applyEffectOnStationAttack({
                    attackerCard,
                    targetStationCardIds
                });
                outcome.affectedItems.forEach(item => opponentAffectedItems.add(item));
                finalTargetStationCardIds = outcome.targetStationCardIds;
            }
        }
        else {
            opponentAffectedItems.add('stationCards');
        }

        performAttackOnStation({
            playerId,
            opponentId,
            attackerCardId,
            targetStationCardIds: finalTargetStationCardIds,
            opponentAffectedItems: Array.from(opponentAffectedItems)
        });

    }

    function performAttackOnStation({ playerId, opponentId, attackerCardId, targetStationCardIds, opponentAffectedItems }) {
        let playerStateService = playerStateServiceById[playerId];
        let opponentStateService = playerStateServiceById[opponentId];

        for (let targetCardId of targetStationCardIds) {
            opponentStateService.updateStationCard(targetCardId, card => {
                card.flipped = true;
            });
        }

        const opponentState = matchService.getPlayerState(opponentId);
        const opponentEvent = {};
        const playerEvent = {};
        for (let itemName of opponentAffectedItems) {
            const item = opponentState[itemName];
            const itemNameForOtherPlayer = itemNamesForOpponentByItemNameForPlayer[itemName];
            if (itemName === 'stationCards') {
                const stationCards = matchComService.prepareStationCardsForClient(item);
                opponentEvent[itemName] = stationCards;
                playerEvent[itemNameForOtherPlayer] = stationCards;
            }
            else {
                opponentEvent[itemName] = item;
                playerEvent[itemNameForOtherPlayer] = item;
            }
        }

        matchComService.emitToPlayer(opponentId, 'stateChanged', opponentEvent);
        matchComService.emitToPlayer(playerId, 'stateChanged', playerEvent);

        playerStateService.registerAttack(attackerCardId);
    }
}

module.exports = AttackController;
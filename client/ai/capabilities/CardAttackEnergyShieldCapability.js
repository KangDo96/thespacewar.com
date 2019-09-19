module.exports = function CardAttackEnergyShieldCapability({
    card,
    matchController,
    opponentStateService,
}) {
    return {
        canDoIt,
        doIt
    };

    function canDoIt() {
        if (card.isInHomeZone()) return false;

        return targets().length > 0;
    }

    function doIt() {
        matchController.emit('attack', {
            attackerCardId: card.id,
            defenderCardId: firstTarget().id
        });
    }

    function firstTarget() {
        return targets()[0];
    }

    function targets() {
        return opponentStateService.getMatchingBehaviourCards(card => card.stopsStationAttack());
    }
};

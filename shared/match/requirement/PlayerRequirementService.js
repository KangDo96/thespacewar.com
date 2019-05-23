class PlayerRequirementService { //TODO Rename PlayerRequirements

    constructor({
        playerStateService,
        opponentStateService,
        playerRequirementFactory,
        opponentRequirementFactory
    }) {
        this._playerStateService = playerStateService;
        this._opponentStateService = opponentStateService;
        this._playerRequirementFactory = playerRequirementFactory;
        this._opponentRequirementFactory = opponentRequirementFactory;
    }

    getRequirements() {
        return this._playerStateService.getPlayerState()
            .requirements
            .slice();
    }

    hasAnyRequirement() {
        return this.getRequirements().length > 0;
    }

    isWaitingOnOpponentFinishingRequirement() {
        return this.getRequirements().some(r => r.waiting);
    }

    getFirstMatchingRequirement({ type, common = null, waiting = null }) {
        const requirements = this
            ._playerStateService
            .getPlayerState()
            .requirements
            .slice();
        return this._findMatchingRequirement(requirements, { type, common, waiting });
    }

    addCardRequirement(requirement) {
        const type = requirement.type;
        if (type === 'drawCard') {
            this.addDrawCardRequirement(requirement);
        }
        else if (type === 'discardCard') {
            this.addDiscardCardRequirement(requirement);
        }
        else if (type === 'damageStationCard') {
            this.addDamageStationCardRequirement(requirement);
        }
        else if (type === 'findCard') {
            this.addFindCardRequirement(requirement);
        }
        else if (type === 'counterCard') {
            this.addCounterCardRequirement(requirement);
        }
        else if (type === 'counterAttack') {
            this.addCounterAttackRequirement(requirement);
        }
    }

    addDiscardCardRequirement({ count, common = false, cardCommonId = null }) {
        let countToDiscard = this.getCountOrMinimumAvailableForDiscardingCards(count);
        if (countToDiscard > 0) {
            const requirement = {
                type: 'discardCard',
                count: countToDiscard
            };
            if (common) {
                requirement.common = true;
            }
            if (cardCommonId) {
                requirement.cardCommonId = cardCommonId;
            }
            this.addRequirement(requirement);
        }
    }

    addDrawCardRequirement({ count, common = false, cardCommonId = null }) {
        let countToDraw = this.getCountOrMinimumAvailableForDrawingCards(count);
        if (countToDraw > 0) {
            const requirement = { type: 'drawCard', count: countToDraw };
            if (common) {
                requirement.common = true;
            }
            if (cardCommonId) {
                requirement.cardCommonId = cardCommonId;
            }
            this.addRequirement(requirement);
        }
    }

    addDamageStationCardRequirement({ count, common = false, cardCommonId = null, reason = '' }) {
        const stationCardCount = this._opponentStateService.getUnflippedStationCardsCount();

        const currentDamageStationCardRequirementsCount = this
            .getRequirements()
            .filter(r => r.type === 'damageStationCard')
            .reduce((total, requirement) => total + requirement.count, 0);

        const maxStationCardCount = stationCardCount - currentDamageStationCardRequirementsCount;
        const countToDraw = Math.min(maxStationCardCount, count);
        if (countToDraw > 0) {
            const requirement = { type: 'damageStationCard', count: countToDraw };
            if (reason) {
                requirement.reason = reason;
            }
            if (common) {
                requirement.common = true;
            }
            if (cardCommonId) {
                requirement.cardCommonId = cardCommonId;
            }
            this.addRequirement(requirement);
        }
    }

    addFindCardRequirement({ count, cardGroups, ...uncheckedProperties }) {
        const totalCardCount = cardGroups.reduce((acc, group) => acc + group.cards.length, 0);
        this.addRequirement({
            ...uncheckedProperties,
            type: 'findCard',
            count: Math.min(totalCardCount, count),
            cardGroups: cardGroups.filter(g => g.cards.length)
        });
    }

    addCounterCardRequirement({ count, cardGroups, ...uncheckedProperties }) {
        const totalCardCount = cardGroups.reduce((acc, group) => acc + group.cards.length, 0);
        this.addRequirement({
            ...uncheckedProperties,
            type: 'counterCard',
            count: Math.min(totalCardCount, count),
            cardGroups: cardGroups.filter(g => g.cards.length)
        });
    }

    addCounterAttackRequirement({ count, attacks, ...uncheckedProperties }) {
        this.addRequirement({
            ...uncheckedProperties,
            type: 'counterAttack',
            count: Math.min(attacks.length, count),
            attacks
        });
    }

    canAddDiscardCardRequirementWithCountOrLess(count) {
        return this.getCountOrMinimumAvailableForDiscardingCards(count) > 0;
    }

    getCountOrMinimumAvailableForDiscardingCards(maxCount) {
        const cardsOnHandCount = this._playerStateService.getCardsOnHandCount();

        const currentDiscardCardRequirementsCount = this
            .getRequirements()
            .filter(r => r.type === 'discardCard')
            .reduce((total, requirement) => total + requirement.count, 0);

        const maxDiscardCount = cardsOnHandCount - currentDiscardCardRequirementsCount;
        return Math.min(maxDiscardCount, maxCount);
    }

    getCountOrMinimumAvailableForDrawingCards(maxCount) {
        const deckCardCount = this._playerStateService.getDeck().getCardCount();
        const opponentDeckPossibleMillsCount = this._opponentStateService.getDeck().getPossibleMillCount();

        const currentDrawCardRequirementsCount = this
            .getRequirements()
            .filter(r => r.type === 'drawCard')
            .reduce((total, requirement) => total + requirement.count, 0);

        const maxDrawCount = (deckCardCount + opponentDeckPossibleMillsCount) - currentDrawCardRequirementsCount;
        return Math.min(maxDrawCount, maxCount);
    }

    addRequirement(requirement) { //TODO Find a better name to differentiate this from addCardRequirement
        this._playerStateService.update(playerState => {
            playerState.requirements.push(requirement);
        });
    }

    addEmptyCommonWaitingRequirement(requirement) {
        this.addRequirement({
            ...requirement,
            count: 0,
            common: true,
            waiting: true
        });
    }

    updateFirstMatchingRequirement({ type, common = null, waiting = null }, updateFn) {
        this._playerStateService.update(playerState => {
            const requirements = playerState.requirements.slice();
            const requirement = this._findMatchingRequirement(
                requirements,
                { type, common, waiting }
            );
            return updateFn(requirement);
        });

        const updatedRequirements = this.getRequirements();
        return this._findMatchingRequirement(updatedRequirements, { type, common, waiting });
    }

    removeFirstMatchingRequirement({ type, common = null, waiting = null }) {
        this._playerStateService
            .update(playerState => {
                const requirements = playerState.requirements.slice();
                const requirement = this._findMatchingRequirement(requirements, { type, common, waiting });
                const reverseIndexOfRequirement = requirements.indexOf(requirement);
                playerState.requirements.splice(reverseIndexOfRequirement, 1);
            });
    }

    _findMatchingRequirement(requirements, { type, common = null, waiting = null }) {
        return requirements.find(r => {
            return r.type === type
                && (common === null || r.common === common)
                && (waiting === null || r.waiting === waiting);
        });
    }
}

module.exports = PlayerRequirementService;

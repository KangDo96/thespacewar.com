FindCardRequirementFactory.type = 'findCard';

function FindCardRequirementFactory({
    sourceFetcher,
    requirementSpec,
    card
}) {

    return {
        create
    };

    function create() {
        const requirement = {
            type: requirementSpec.type,
            cardGroups: cardGroupsFromSpec(requirementSpec),
            cardCommonId: card.commonId,
            count: requirementSpec.count,
            target: requirementSpec.target,
            common: requirementSpec.common,
            waiting: requirementSpec.count === 0 && requirementSpec.common
        };
        if (requirementSpec.dormantEffect) {
            requirement.usedDormantEffect = {
                cardId: card.id,
                destroyCard: requirementSpec.dormantEffect.destroyTriggerCard
            }
        }

        return requirement;
    }

    function cardGroupsFromSpec(spec) {
        if (spec.count > 0) {
            return requirementSpec.sources.map(cardGroupFromSource);
        }
        else {
            return [];
        }
    }

    function cardGroupFromSource(source) {
        return {
            source,
            cards: sourceFetcher[source](requirementSpec.filter)
        };
    }
}

module.exports = FindCardRequirementFactory;

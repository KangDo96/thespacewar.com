const phases = require('../phases.js');
const BaseCard = require('./BaseCard.js');

module.exports = class RepairShip extends BaseCard {
    constructor({ repairCapability, ...deps }) {
        super(deps);

        this._matchService = deps.matchService;
        this._repairCapability = repairCapability;
    }

    canAttack() {
        const currentTurn = this._matchInfoRepository.getTurn();
        let repairsThisTurn = this._queryEvents.getRepairsOnTurn(this.id, currentTurn);
        return super.canAttack() && repairsThisTurn.length === 0;
    }

    canRepair() {
        const currentPhase = this._matchInfoRepository.getPlayerPhase(this.playerId);
        if (currentPhase !== phases.PHASES.attack) return false;

        const currentTurn = this._matchInfoRepository.getTurn();
        let repairsThisTurn = this._queryEvents.getRepairsOnTurn(this.id, currentTurn);
        if (repairsThisTurn.length > 0) return false;
        let ownZone = this._matchService.getZoneWhereCardIs(this.id);
        let otherCards = ownZone.filter(c => c.id !== this.id);
        return otherCards.some(c => !!c.damage);
    }

    repairCard(otherCard) {
        otherCard.damage = Math.max(0, otherCard.damage - this._repairCapability);
    }
};
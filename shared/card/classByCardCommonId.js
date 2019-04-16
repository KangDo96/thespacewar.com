const classes = [
    require('./EnergyShield.js'),
    require('./SmallCannon.js'),
    require('./TriggerHappyJoe.js'),
    require('./Hunter.js'),
    require('./SmallRepairShop.js'),
    require('./FastMissile.js'),
    require('./Discovery.js'),
    require('./FatalError.js'),
    require('./BigRepairShop.js'),
    require('./GoodKarma.js'),
    require('./Neutralization.js'),
    require('./Supernova.js'),
    require('./DeadlySniper.js'),
    require('./TheDarkDestroyer.js'),
    require('./Expansion.js'),
    require('./Pursuiter.js'),
    require('./TheShade.js'),
    require('./FullForceForward.js'),
    require('./NuclearMissile.js'),
    require('./DisturbingSensor.js'),
    require('./OverCapacity.js'),
    require('./EmpMissile.js'),
    require('./ExcellentWork.js'),
    require('./MissilesLaunched.js'),
    require('./PerfectPlan.js'),
    require('./DestinyDecided.js')
];

const classByCardCommonId = {};
classes.forEach(c => {
    classByCardCommonId[c.CommonId] = c
});

module.exports = classByCardCommonId;
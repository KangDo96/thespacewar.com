const classes = [
    require('./EnergyShield.js'),
    require('./SmallCannon.js'),
    require('./TriggerHappyJoe.js'),
    require('./Hunter.js'),
    require('./NewHope.js'),
    require('./FastMissile.js'),
    require('./Discovery.js'),
    require('./FatalError.js'),
    require('./LastHope.js'),
    require('./GoodKarma.js'),
    require('./Neutralization.js'),
    require('./Supernova.js'),
    require('./DeadlySniper.js'),
    require('./TheDarkDestroyer.js'),
    require('./Expansion.js'),
    require('./Pursuiter.js')
];

const classByCardCommonId = {}
classes.forEach(c => {
    classByCardCommonId[c.CommonId] = c
});

module.exports = classByCardCommonId;
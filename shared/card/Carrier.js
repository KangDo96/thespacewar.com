const BaseCard = require("./BaseCard.js");
const info = require("./info/77.config.js");

module.exports = class Carrier extends BaseCard {
  constructor(deps) {
    super({ ...deps });
  }

  static get commonId() {
    return "77";
  }

  static get Info() {
    return info;
  }
};

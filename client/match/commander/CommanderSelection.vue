<template>
  <div v-if="canSelectCommander && !hidden" class="commanderSelection">
    <div class="commanderSelection-header">
      <div class="commanderSelection-headerText">
        Select your commander
      </div>
    </div>
    <div class="commanderSelection-cards">
      <div
        v-for="(row, index) in commandersOptionsRows"
        :key="index"
        class="commanderSelection-cardsRow"
      >
        <CommanderCard
          v-for="commander in row.commanderOptions"
          :key="commander.value"
          :commander="commander.value"
          :selected="selectedCommander === commander.value"
          @select="selectCommander(commander)"
        >
          {{ commander.name }}
        </CommanderCard>
      </div>
    </div>
  </div>
</template>
<script>
const Vuex = require("vuex");
const startGameHelpers = Vuex.createNamespacedHelpers("startGame");
const resolveModule = require("../../utils/resolveModuleWithPossibleDefault.js");
const CommanderCard = resolveModule(require("./CommanderCard.vue"));
const Commander = require("../../../shared/match/commander/Commander.js");


module.exports = {
  computed: {
    ...startGameHelpers.mapGetters([
      "canSelectCommander",
      "commandersOptionsRows",
    ]),
    hidden: {
      get() {
        return this.$store.state.startGame.commanderSelectionHidden;
      },
      set(value) {
        return (this.$store.state.startGame.commanderSelectionHidden = value);
      },
    },
    selectedCommander: {
      get() {
        return this.$store.state.match.commanders[0];
      },
      set(value) {
        this.$store.dispatch("startGame/selectCommander", value);
      },
    },
  },
  watch: {
    canSelectCommander() {
      if (this.canSelectCommander) {
        this.hidden = !!this.selectedCommander;
      }
    },
  },
  methods: {
    selectCommander(commander) {
      this.selectedCommander = commander.value;
      this.hide();
    },
    hide() {
      this.hidden = true;
    },
  },
  components: {
    CommanderCard,
  },
};
</script>
<style lang="scss">
@import "../cardVariables";

.commanderSelection {
  position: absolute;
  z-index: 4;
  top: 5%;
  left: 50%;
  transform: translateX(-50%);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.commanderSelection-header {
  line-height: 100%;
  font-size: 48px;
  color: white;
  font-weight: bold;
  font-family: "Space mono", sans-serif;
  margin-bottom: 20px;

  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.commanderSelection-headerText {
  flex: 0 0 auto;
}

button.commanderSelection-hide {
  padding: 10px 20px;
  margin: 0 20px;
}

.commanderSelection-cards {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.commanderSelection-cardsRow {
  display: flex;
  align-items: center;
  justify-content: center;
}

.commanderSelection .commanderCard {
  width: $commanderCardWidth;
  height: $commanderCardHeight;
  margin: 10px 50px;

  &:hover {
    transform: scale(1.6);
    box-shadow: 0px 0px 150px 10px #000;
    transition: all 0.2s ease;
    cursor: pointer;
    z-index: 2;
  }
}

.commanderSelection .commanderCard--selected {
  filter: brightness(25%);
}

.commanderSelection .commanderCard:not(.commanderCard--selected):hover::after {
}

* {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}


// Phones in landscape mode, by Jim 2021-03-09
@media (max-height: 700px) and (orientation: landscape) {
  .commanderSelection-header {font-size:30px;}
}





</style>

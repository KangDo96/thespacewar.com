<template>
  <div class="matchHeader">
    <PlayerBanner :is-player="false" :reverse="false" />
    <div class="matchHeader-topRightButtons">
      <ToggleInfoModeButtonContainer v-if="!isHideInfoModeButtonContainer" @changeShowingTutorial="toggleModalGame($event)" ref="toggleInfoModeButtonContainer"/>
      <button
        class="matchHeader-escapeMenuButton escapeMenuButton"
        @click="toggleEscapeMenu"
      >
        <svg
          id="Layer_1"
          viewBox="0 0 74 74"
          xmlns="http://www.w3.org/2000/svg"
        >
          >
          <path
            d="M69.5 29.7l-7.7-1.5-1-2.5 4.4-6.5c1.2-1.7.9-4.1-.5-5.6l-4.2-4.2a4.4 4.4 0 0 0-5.6-.5l-6.5 4.4-2.5-1-1.5-7.7A4.6 4.6 0 0 0 40 1h-6a4.4 4.4 0 0 0-4.3 3.5l-1.5 7.7-2.5 1-6.5-4.4a4.4 4.4 0 0 0-5.5.5l-4.2 4.2a4.4 4.4 0 0 0-.5 5.6l4.4 6.5-1 2.5-7.7 1.5A4.6 4.6 0 0 0 1 34v6c0 2.1 1.5 3.9 3.5 4.3l7.7 1.5 1 2.5-4.4 6.5a4.5 4.5 0 0 0 .5 5.6l4.2 4.2a4.4 4.4 0 0 0 5.6.5l6.5-4.4 2.5 1 1.5 7.7a4.3 4.3 0 0 0 4.3 3.5H40c2.1 0 3.9-1.5 4.3-3.5l1.5-7.7 2.5-1 6.5 4.4c1.7 1.2 4.1.9 5.6-.5l4.2-4.2a4.3 4.3 0 0 0 .5-5.5l-4.4-6.5 1-2.5 7.7-1.5a4.3 4.3 0 0 0 3.5-4.3V34a4.2 4.2 0 0 0-3.4-4.3zM69 40c0 .2-.1.3-.3.4l-8.8 1.7a2 2 0 0 0-1.5 1.4c-.4 1.4-1 2.8-1.7 4a2 2 0 0 0 .1 2.1l5 7.5v.5l-4.2 4.2c-.1.1-.3.2-.5 0l-7.5-5a2 2 0 0 0-2.1-.1c-1.3.7-2.6 1.2-4 1.7-.7.2-1.2.8-1.4 1.5l-1.7 8.8c0 .2-.2.3-.4.3h-6c-.2 0-.3-.1-.4-.3l-1.7-8.8a2 2 0 0 0-1.4-1.5 20 20 0 0 1-4-1.7c-.3-.2-.6-.2-.9-.2a2 2 0 0 0-1.1.3l-7.5 5h-.5l-4.2-4.2c-.1-.1-.2-.3 0-.5l5-7.5a2 2 0 0 0 .1-2.1 20 20 0 0 1-1.7-4c-.2-.7-.8-1.2-1.5-1.4l-8.8-1.7c-.3-.1-.4-.2-.4-.4v-6c0-.2.1-.3.3-.4l8.8-1.7a2 2 0 0 0 1.5-1.4c.4-1.4 1-2.8 1.7-4a2 2 0 0 0-.1-2.1l-5-7.5v-.5l4.2-4.2h.5l7.5 5a2 2 0 0 0 2.1.1 20 20 0 0 1 4-1.7c.7-.2 1.2-.8 1.4-1.5l1.7-8.8c.1-.2.2-.3.4-.3h6c.2 0 .4.1.4.3l1.7 8.8a2 2 0 0 0 1.4 1.5c1.4.4 2.7 1 4 1.7a2 2 0 0 0 2.1-.1l7.5-5c.2-.1.4-.1.5.1l4.2 4.2c.1.1.2.3.1.5l-5 7.5a2 2 0 0 0-.1 2.1 20 20 0 0 1 1.7 4c.2.7.8 1.2 1.5 1.4l8.8 1.7c.2 0 .3.2.3.4V40z"
          />
          <path
            d="M37 24.8c-6.7 0-12.2 5.5-12.2 12.2S30.3 49.2 37 49.2 49.2 43.7 49.2 37 43.7 24.8 37 24.8zm0 20.4c-4.5 0-8.2-3.7-8.2-8.2s3.7-8.2 8.2-8.2 8.2 3.7 8.2 8.2-3.7 8.2-8.2 8.2z"
          />
        </svg>
      </button>
      <FullScreen />
    </div>
    <ActionLog />
    <PlayerBanner :is-player="true" :reverse="true"> </PlayerBanner>

    <!--<div:title="`Match ID: ${matchId}`">-->
    <!--</div>-->
  </div>
</template>
<script>
import ToggleInfoModeButtonContainer from "../infoMode/ToggleInfoModeButtonContainer.vue";
import FullScreen from "../../start/FullScreen.vue";

const Vuex = require("vuex");
const matchHelpers = Vuex.createNamespacedHelpers("match");
const escapeMenuHelpers = Vuex.createNamespacedHelpers("escapeMenu");

const resolveModule = require("../../utils/resolveModuleWithPossibleDefault.js");
const PlayerBanner = resolveModule(require("./PlayerBanner.vue"));
const ActionLog = resolveModule(require("../log/ActionLog.vue"));

module.exports = {
  data(){
    return {
        isHideInfoModeButtonContainer: false
    }
  },
  computed: {
    ...matchHelpers.mapState(["matchId"]),
  },
  methods: {
    ...escapeMenuHelpers.mapActions({
      toggleEscapeMenu: "toggleVisible",
    }),

    toggleModalGame(e)
    {
      console.log("Llego al MatchHeader!!");
      this.$emit("changeShowingTutorial",e);
    },

    hideInfoModeButtonContainer()
    {
      this.isHideInfoModeButtonContainer = true;
    }

  },
  components: {
    PlayerBanner,
    ActionLog,
    ToggleInfoModeButtonContainer,
    FullScreen,
  },
};
</script>
<style lang="scss">
@import "banner";

.matchHeader-topRightButtons {
  position: absolute;
  z-index: 3;
  top: 0;
  right: 0;

  height: 50px;
  margin: $bannerTopMargin $bannerSideMargin 0 0;

  display: flex;
  justify-content: space-between;
  align-items: center;

  > .matchHeader-escapeMenuButton {
    padding: 0;
    margin-right: 2px;
    width: $bannerHeight;
    height: $bannerHeight;
    border: 2px solid $bannerBorderColor;
    box-sizing: border-box;
    font-size: 13px;
    font-family: "Space mono", sans-serif;
    line-height: 102%;
    background: $bannerBackgroundColor;
    color: $bannerTextColor;

    &:hover,
    &:focus {
      outline: 1px solid $bannerOutlineFocusColor;
      border: 2px solid $bannerBorderFocusColor;
      background: $bannerBackgroundFocusColor;
    }

    &:active {
      border: 2px solid rgb(40, 40, 40);
      background: rgb(20, 20, 20);
    }

    > svg {
      display: block;
      width: 100%;
      height: 100%;
      padding: 22%;
      box-sizing: border-box;
      fill: $bannerTextColor;
    }
  }
}
</style>

<template>
  <button
    class="toggleInfoMode"
    title="Soon you will be able to click here to show a tutorial overlay"
    @click="click"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <defs />
      <circle cx="256" cy="378.5" r="25" />
      <path
        d="M256 0C114.516 0 0 114.497 0 256c0 141.484 114.497 256 256 256 141.484 0 256-114.497 256-256C512 114.516 397.503 0 256 0zm0 472c-119.377 0-216-96.607-216-216 0-119.377 96.607-216 216-216 119.377 0 216 96.607 216 216 0 119.377-96.607 216-216 216z"
      />
      <path
        d="M256 128.5c-44.112 0-80 35.888-80 80 0 11.046 8.954 20 20 20s20-8.954 20-20c0-22.056 17.944-40 40-40s40 17.944 40 40-17.944 40-40 40c-11.046 0-20 8.954-20 20v50c0 11.046 8.954 20 20 20s20-8.954 20-20v-32.531c34.466-8.903 60-40.26 60-77.469 0-44.112-35.888-80-80-80z"
      />
    </svg>
  </button>
</template>
<script>
export default {
  name: "ToggleInfoModeButton",
  data(){
    return{
      showedInfoMode: false
    }
  },
  methods: {
    click() {
      this.$emit("toggleInfoMode");
      // if(this.showedInfoMode)
      //   {
      //     this.$emit("toggleInfoMode",true);
      //     this.showedInfoMode = false;
      //   }
      // else {
      //   this.$emit("toggleInfoMode",false);
      //   this.showedInfoMode = true;
      // }
    },
  },
};
</script>
<style lang="scss">
@import "../banner/banner.scss";

.toggleInfoMode {
  padding: 0;
  margin-right: 2px;
  width: $bannerHeight;
  height: $bannerHeight;
  background: $bannerBackgroundColor;
  color: $bannerTextColor;
  border: $borderButtonDefault;

  &:focus {
    filter: brightness(125%);
  }

  &:hover {
    filter: brightness(135%);
    outline: 1px solid $bannerOutlineFocusColor;
    border: 2px solid $bannerBorderFocusColor;
    background: $bannerBackgroundFocusColor;
  }

  &:active,
  &:focus,
  &:hover {
    outline: 0;
  }

  > svg {
    display: block;
    width: 100%;
    height: 100%;
    padding: 18%;
    box-sizing: border-box;
    fill: $bannerTextColor;
  }
}
</style>

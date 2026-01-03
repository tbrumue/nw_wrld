import Dashboard from "./dashboard/Dashboard.js";
import Projector from "./projector/Projector.js";
import ModuleBase from "./projector/helpers/moduleBase.js";
import BaseThreeJsModule from "./projector/helpers/threeBase.js";
import * as THREE from "three";
import p5 from "p5";
import * as d3 from "d3";

import "./shared/styles/_main.scss";

if (!globalThis.nwWrldSdk) {
  globalThis.nwWrldSdk = { ModuleBase, BaseThreeJsModule };
}
if (!globalThis.THREE) {
  globalThis.THREE = THREE;
}
if (!globalThis.p5) {
  globalThis.p5 = p5;
}
if (!globalThis.d3) {
  globalThis.d3 = d3;
}

const App = {
  init() {
    const projector = document.querySelector(".projector");

    if (projector) {
      Projector.init();
    }
  },
};

App.init();

export default App;

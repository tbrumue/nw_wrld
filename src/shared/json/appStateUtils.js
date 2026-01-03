import {
  loadJsonFile,
  loadJsonFileSync,
  saveJsonFile,
  saveJsonFileSync,
} from "./jsonFileBase.js";

const DEFAULT_APP_STATE = {
  activeTrackId: null,
  activeSetId: null,
  sequencerMuted: false,
  workspacePath: null,
};

export const loadAppState = () =>
  loadJsonFile(
    "appState.json",
    DEFAULT_APP_STATE,
    "Could not load appState.json, initializing with defaults."
  );

export const saveAppState = (state) => saveJsonFile("appState.json", state);

export const saveAppStateSync = (state) =>
  saveJsonFileSync("appState.json", state);

export const loadAppStateSync = () =>
  loadJsonFileSync(
    "appState.json",
    DEFAULT_APP_STATE,
    "Could not load appState.json, initializing with defaults."
  );

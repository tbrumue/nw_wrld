import Dashboard from "./dashboard/Dashboard.js";
import Projector from "./projector/Projector.js";
import ModuleBase from "./projector/helpers/moduleBase.js";
import BaseThreeJsModule from "./projector/helpers/threeBase.js";
import * as THREE from "three";
import p5 from "p5";
import * as d3 from "d3";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

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

const getWorkspaceDirFromArgv = () => {
  const prefix = "--nwWrldProjectDir=";
  const arg = (process && process.argv ? process.argv : []).find((a) =>
    String(a).startsWith(prefix)
  );
  if (!arg) return null;
  const value = String(arg).slice(prefix.length);
  return value || null;
};

const resolveWorkspaceAssetPath = (workspaceDir, relPath) => {
  if (!workspaceDir || typeof workspaceDir !== "string") return null;
  if (!relPath || typeof relPath !== "string") return null;

  const safeRel = String(relPath).replace(/^[/\\]+/, "");
  const assetsDir = path.resolve(workspaceDir, "assets");
  const resolved = path.resolve(assetsDir, safeRel);
  const assetsDirWithSep = assetsDir.endsWith(path.sep)
    ? assetsDir
    : `${assetsDir}${path.sep}`;
  if (!resolved.startsWith(assetsDirWithSep) && resolved !== assetsDir) {
    return null;
  }
  return resolved;
};

if (globalThis.nwWrldSdk) {
  if (typeof globalThis.nwWrldSdk.getWorkspaceDir !== "function") {
    globalThis.nwWrldSdk.getWorkspaceDir = () => getWorkspaceDirFromArgv();
  }

  if (typeof globalThis.nwWrldSdk.assetUrl !== "function") {
    globalThis.nwWrldSdk.assetUrl = (relPath) => {
      try {
        const workspaceDir = getWorkspaceDirFromArgv();
        const resolved = resolveWorkspaceAssetPath(workspaceDir, relPath);
        if (!resolved) return null;
        return pathToFileURL(resolved).href;
      } catch {
        return null;
      }
    };
  }

  if (typeof globalThis.nwWrldSdk.readText !== "function") {
    globalThis.nwWrldSdk.readText = async (relPath) => {
      try {
        const workspaceDir = getWorkspaceDirFromArgv();
        const resolved = resolveWorkspaceAssetPath(workspaceDir, relPath);
        if (!resolved) return null;
        const data = await fs.promises.readFile(resolved, "utf-8");
        return data;
      } catch {
        return null;
      }
    };
  }

  if (typeof globalThis.nwWrldSdk.loadJson !== "function") {
    globalThis.nwWrldSdk.loadJson = async (relPath) => {
      try {
        const text = await globalThis.nwWrldSdk.readText(relPath);
        if (!text) return null;
        return JSON.parse(text);
      } catch {
        return null;
      }
    };
  }
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

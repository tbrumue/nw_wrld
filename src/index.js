const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  nativeImage,
  dialog,
} = require("electron");
const path = require("path");
const fs = require("fs");
const InputManager = require("./main/InputManager");
const { DEFAULT_USER_DATA } = require("./shared/config/defaultConfig");

app.setName("nw_wrld");

if (process.platform === "darwin") {
  app.setAboutPanelOptions({
    applicationName: "nw_wrld",
    applicationVersion: app.getVersion(),
  });
}

let projector1Window;
let dashboardWindow;
let inputManager;
let workspaceWatcher = null;
let workspaceWatcherDebounce = null;
let currentWorkspacePath = null;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForWorkspaceSettle = async (modulesDir, filename) => {
  const maxAttempts = 6;
  const intervalMs = 120;
  const target =
    filename && typeof filename === "string"
      ? path.join(modulesDir, filename)
      : null;

  let prevSig = null;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      if (target) {
        const stat = await fs.promises.stat(target);
        const sig = `${stat.size}:${stat.mtimeMs}`;
        if (prevSig && sig === prevSig) return;
        prevSig = sig;
      } else {
        const entries = await fs.promises.readdir(modulesDir);
        const jsFiles = entries.filter((f) => f.endsWith(".js"));
        const stats = await Promise.all(
          jsFiles.map(async (f) => {
            try {
              const s = await fs.promises.stat(path.join(modulesDir, f));
              return `${f}:${s.size}:${s.mtimeMs}`;
            } catch {
              return `${f}:missing`;
            }
          })
        );
        const sig = stats.sort().join("|");
        if (prevSig && sig === prevSig) return;
        prevSig = sig;
      }
    } catch {
      return;
    }
    await delay(intervalMs);
  }
};

const getLegacyJsonDirForMain = () =>
  path.join(__dirname, "..", "src", "shared", "json");

const getJsonDirForMain = () => {
  const dir = path.join(app.getPath("userData"), "json");
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {}

  // One-time best-effort migration from legacy dev location into userData
  try {
    const legacyDir = getLegacyJsonDirForMain();
    [
      "userData.json",
      "appState.json",
      "config.json",
      "recordingData.json",
    ].forEach((filename) => {
      const destPath = path.join(dir, filename);
      const legacyPath = path.join(legacyDir, filename);
      if (!fs.existsSync(destPath) && fs.existsSync(legacyPath)) {
        fs.copyFileSync(legacyPath, destPath);
      }
      const legacyBackupPath = `${legacyPath}.backup`;
      const destBackupPath = `${destPath}.backup`;
      if (
        !fs.existsSync(destBackupPath) &&
        fs.existsSync(legacyBackupPath) &&
        !fs.existsSync(destPath)
      ) {
        fs.copyFileSync(legacyBackupPath, destBackupPath);
      }
    });
  } catch {}

  return dir;
};

const getAppStatePathForMain = () =>
  path.join(getJsonDirForMain(), "appState.json");

const loadAppStateForMain = () => {
  const appStatePath = getAppStatePathForMain();
  try {
    const data = fs.readFileSync(appStatePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
};

const broadcastWorkspaceModulesChanged = () => {
  if (
    dashboardWindow &&
    !dashboardWindow.isDestroyed() &&
    dashboardWindow.webContents &&
    !dashboardWindow.webContents.isDestroyed()
  ) {
    dashboardWindow.webContents.send("workspace:modulesChanged", {});
  }
  if (
    projector1Window &&
    !projector1Window.isDestroyed() &&
    projector1Window.webContents &&
    !projector1Window.webContents.isDestroyed()
  ) {
    projector1Window.webContents.send("workspace:modulesChanged", {});
  }
};

const startWorkspaceWatcher = (workspacePath) => {
  if (!workspacePath || typeof workspacePath !== "string") {
    currentWorkspacePath = null;
    if (workspaceWatcher) {
      try {
        workspaceWatcher.close();
      } catch {}
      workspaceWatcher = null;
    }
    return;
  }

  if (workspacePath === currentWorkspacePath && workspaceWatcher) {
    return;
  }

  currentWorkspacePath = workspacePath;

  if (workspaceWatcher) {
    try {
      workspaceWatcher.close();
    } catch {}
    workspaceWatcher = null;
  }

  const modulesDir = path.join(workspacePath, "modules");
  try {
    fs.mkdirSync(modulesDir, { recursive: true });
  } catch {}

  try {
    workspaceWatcher = fs.watch(modulesDir, (eventType, filename) => {
      if (filename && !String(filename).endsWith(".js")) return;
      if (workspaceWatcherDebounce) {
        clearTimeout(workspaceWatcherDebounce);
      }
      workspaceWatcherDebounce = setTimeout(async () => {
        workspaceWatcherDebounce = null;
        try {
          await waitForWorkspaceSettle(modulesDir, filename);
        } catch {}
        broadcastWorkspaceModulesChanged();
      }, 350);
    });
    workspaceWatcher.on("error", () => {
      try {
        workspaceWatcher.close();
      } catch {}
      workspaceWatcher = null;
    });
  } catch {
    workspaceWatcher = null;
  }
};

// Performance-focused command line switches
app.commandLine.appendSwitch("max-webgl-contexts", "64");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");

// Register IPC handlers ONCE at module level (outside createWindow)
const messageChannels = {
  "dashboard-to-projector": (data) => {
    if (
      projector1Window &&
      !projector1Window.isDestroyed() &&
      projector1Window.webContents &&
      !projector1Window.webContents.isDestroyed()
    ) {
      projector1Window.webContents.send("from-dashboard", data);
    }
  },
  "projector-to-dashboard": (data) => {
    if (
      dashboardWindow &&
      !dashboardWindow.isDestroyed() &&
      dashboardWindow.webContents &&
      !dashboardWindow.webContents.isDestroyed()
    ) {
      dashboardWindow.webContents.send("from-projector", data);
    }
  },
};

Object.entries(messageChannels).forEach(([channel, handler]) => {
  ipcMain.on(channel, (event, data) => {
    handler(data);
  });
});

ipcMain.handle("input:configure", async (event, payload) => {
  if (inputManager) {
    await inputManager.initialize(payload);
  }
  return { success: true };
});

ipcMain.handle("input:get-midi-devices", async () => {
  return await InputManager.getAvailableMIDIDevices();
});

ipcMain.on("log-to-main", (event, message) => {
  console.log(message);
});

const ensureWorkspaceScaffold = async (workspacePath) => {
  if (!workspacePath || typeof workspacePath !== "string") return;

  const modulesDir = path.join(workspacePath, "modules");
  try {
    fs.mkdirSync(modulesDir, { recursive: true });
  } catch {}

  const readmePath = path.join(workspacePath, "README.md");
  if (!fs.existsSync(readmePath)) {
    try {
      fs.writeFileSync(
        readmePath,
        [
          "# nw_wrld Modules Workspace",
          "",
          "Edit files in `modules/` and nw_wrld will reload them automatically.",
          "",
        ].join("\n"),
        "utf-8"
      );
    } catch {}
  }

  const helloWorldPath = path.join(modulesDir, "HelloWorld.js");
  if (!fs.existsSync(helloWorldPath)) {
    try {
      fs.writeFileSync(
        helloWorldPath,
        [
          "const { ModuleBase } = globalThis.nwWrldSdk || {};",
          "",
          "class HelloWorld extends ModuleBase {",
          '  static name = "HelloWorld";',
          '  static category = "Text";',
          "  static methods = [",
          "    ...((ModuleBase && ModuleBase.methods) || []),",
          "    {",
          '      name: "setText",',
          "      executeOnLoad: true,",
          "      options: [",
          '        { name: "text", defaultVal: "Hello world", type: "text" },',
          "      ],",
          "    },",
          "  ];",
          "",
          "  constructor(container) {",
          "    super(container);",
          '    this.textEl = document.createElement("div");',
          "    this.textEl.style.cssText = [",
          '      "width: 100%;",',
          '      "height: 100%;",',
          '      "display: flex;",',
          '      "align-items: center;",',
          '      "justify-content: center;",',
          '      "font-family: monospace;",',
          '      "font-size: 48px;",',
          '      "color: white;",',
          '    ].join(" ");',
          "    if (this.elem) {",
          "      this.elem.appendChild(this.textEl);",
          "    }",
          '    this.setText({ text: "Hello world" });',
          "  }",
          "",
          '  setText({ text = "Hello world" } = {}) {',
          "    if (this.textEl) {",
          "      this.textEl.textContent = String(text);",
          "    }",
          "    this.show();",
          "  }",
          "",
          "  destroy() {",
          "    if (this.textEl && this.textEl.parentNode) {",
          "      this.textEl.parentNode.removeChild(this.textEl);",
          "    }",
          "    this.textEl = null;",
          "    super.destroy();",
          "  }",
          "}",
          "",
          "export default HelloWorld;",
          "",
        ].join("\n"),
        "utf-8"
      );
    } catch {}
  }

  const spinningCubePath = path.join(modulesDir, "SpinningCube.js");
  if (!fs.existsSync(spinningCubePath)) {
    try {
      fs.writeFileSync(
        spinningCubePath,
        [
          "const { BaseThreeJsModule } = globalThis.nwWrldSdk || {};",
          "const THREE = globalThis.THREE;",
          "",
          "class SpinningCube extends BaseThreeJsModule {",
          '  static name = "SpinningCube";',
          '  static category = "3D";',
          "  static methods = [",
          "    ...((BaseThreeJsModule && BaseThreeJsModule.methods) || []),",
          "  ];",
          "",
          "  constructor(container) {",
          "    super(container);",
          "    if (!THREE) return;",
          "    const geometry = new THREE.BoxGeometry(1, 1, 1);",
          "    const material = new THREE.MeshStandardMaterial({ color: 0x00ff99 });",
          "    this.cube = new THREE.Mesh(geometry, material);",
          "    const light = new THREE.DirectionalLight(0xffffff, 2);",
          "    light.position.set(2, 2, 4);",
          "    this.scene.add(light);",
          "    this.setModel(this.cube);",
          "    this.setCustomAnimate(() => {",
          "      if (!this.cube) return;",
          "      this.cube.rotation.x += 0.01;",
          "      this.cube.rotation.y += 0.015;",
          "    });",
          "    this.show();",
          "  }",
          "",
          "  destroy() {",
          "    this.cube = null;",
          "    super.destroy();",
          "  }",
          "}",
          "",
          "export default SpinningCube;",
          "",
        ].join("\n"),
        "utf-8"
      );
    } catch {}
  }
};

ipcMain.handle("workspace:select", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return { cancelled: true };
  }
  const workspacePath = result.filePaths[0];
  await ensureWorkspaceScaffold(workspacePath);
  startWorkspaceWatcher(workspacePath);
  return { cancelled: false, workspacePath };
});

function loadConfig() {
  const configPath = path.join(getJsonDirForMain(), "userData.json");

  try {
    const data = fs.readFileSync(configPath, "utf-8");

    try {
      const parsed = JSON.parse(data);
      return parsed;
    } catch (parseErr) {
      console.error(
        "[Main] JSON parse error - config file is corrupted:",
        parseErr.message
      );
      console.error("[Main] Using default configuration");
      return DEFAULT_USER_DATA;
    }
  } catch (readErr) {
    if (readErr.code === "ENOENT") {
      console.warn("[Main] Config file not found, using defaults");
    } else {
      console.error("[Main] Failed to read config file:", readErr.message);
    }
    return DEFAULT_USER_DATA;
  }
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } =
    primaryDisplay.workAreaSize;
  const { x: screenX, y: screenY } = primaryDisplay.workArea;

  const halfWidth = Math.floor(screenWidth / 2);
  const additionalArgs = [`--nwWrldUserDataDir=${app.getPath("userData")}`];

  // Create Projector 1 Window with optimized preferences
  projector1Window = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: false,
      backgroundThrottling: false,
      webgl: true,
      enableHardwareAcceleration: true,
      additionalArguments: additionalArgs,
      // Additional performance optimizations
      pageVisibility: true, // Prevents throttling when page isn't visible
      autoplayPolicy: "no-user-gesture-required", // Helps with audio processing
    },
    x: screenX + halfWidth,
    y: screenY,
    width: halfWidth,
    height: screenHeight,
    title: "Projector 1",
    // Additional window optimizations
    show: false, // Don't show until ready
    paintWhenInitiallyHidden: true, // Start rendering before window is shown
    frame: false,
  });

  // Show window when ready to prevent white flash
  projector1Window.once("ready-to-show", () => {
    projector1Window.show();
  });

  projector1Window.loadFile("projector/views/projector.html");

  // Create Dashboard Window with appropriate optimizations
  dashboardWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableHardwareAcceleration: true, // Enable for dashboard too
      backgroundThrottling: false, // Prevent throttling
      additionalArguments: additionalArgs,
    },
    x: screenX,
    y: screenY,
    width: halfWidth,
    height: screenHeight,
    title: "nw_wrld",
    show: false,
    // frame: false,
  });

  dashboardWindow.once("ready-to-show", () => {
    dashboardWindow.show();
  });

  dashboardWindow.loadFile("dashboard/views/dashboard.html");

  dashboardWindow.webContents.once("did-finish-load", () => {
    const fullConfig = loadConfig();
    inputManager = new InputManager(dashboardWindow, projector1Window);
    const { DEFAULT_INPUT_CONFIG } = require("./shared/config/defaultConfig");
    const inputConfig = fullConfig.config?.input || DEFAULT_INPUT_CONFIG;
    inputManager.initialize(inputConfig).catch((err) => {
      console.error("[Main] Failed to initialize InputManager:", err);
    });
  });

  const appState = loadAppStateForMain();
  if (appState && appState.workspacePath) {
    startWorkspaceWatcher(appState.workspacePath);
  }

  app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit();
  });

  // Clear cache on startup for consistent performance
  app.on("ready", () => {
    const { session } = require("electron");
    session.defaultSession.clearCache();
  });
}

// Handle app ready state
app.whenReady().then(() => {
  if (process.platform === "darwin") {
    try {
      const iconPath = path.join(
        __dirname,
        "assets",
        "images",
        "blueprint.png"
      );
      const icon = nativeImage.createFromPath(iconPath);
      if (!icon.isEmpty()) {
        app.dock.setIcon(icon);
      }
    } catch (err) {
      console.error("[Main] Failed to set dock icon:", err?.message || err);
    }
  }

  createWindow();

  // Handle app activation (macOS)
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", async () => {
  if (inputManager) {
    await inputManager.disconnect();
  }
});

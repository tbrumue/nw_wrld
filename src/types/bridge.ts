import type {
  ListAssetsResult,
  WorkspaceModuleSummary,
  WorkspaceModuleTextWithMeta,
  WorkspaceModuleUrl,
} from "./workspace";
import type { SandboxEnsureResult, SandboxRequestType } from "./sandbox";

export interface NwWrldBridge {
  project: {
    getDir: () => string | null;
    isRequired: () => boolean;
    isDirAvailable: () => boolean;
  };
  sandbox: {
    registerToken: (
      token: string
    ) => { ok: boolean; reason?: string } | unknown;
    unregisterToken: (token: string) => boolean | unknown;
    ensure: () => Promise<SandboxEnsureResult>;
    request: (
      token: string,
      type: SandboxRequestType | string,
      props?: unknown
    ) => Promise<unknown>;
    destroy: () => Promise<{ ok: boolean; reason?: string } | unknown>;
  };
  workspace: {
    listModuleFiles: () => Promise<string[]>;
    listModuleSummaries: () => Promise<WorkspaceModuleSummary[]>;
    getModuleUrl: (moduleName: string) => Promise<WorkspaceModuleUrl | null>;
    readModuleText: (moduleName: string) => Promise<string | null>;
    readModuleWithMeta: (
      moduleName: string
    ) => Promise<WorkspaceModuleTextWithMeta | null>;
    writeModuleTextSync: (
      moduleName: string,
      text: string
    ) => { ok: boolean; reason?: string; path?: string } | unknown;
    moduleExists: (moduleName: string) => boolean;
    showModuleInFolder: (moduleName: string) => void;
    assetUrl: (relPath: string) => string | null;
    listAssets: (relDir: string) => Promise<ListAssetsResult>;
    readAssetText: (relPath: string) => Promise<string | null>;
  };
  app: {
    getBaseMethodNames: () => { moduleBase: string[]; threeBase: string[] };
    getMethodCode: (
      moduleName: string,
      methodName: string
    ) => {
      code: string | null;
      filePath: string | null;
    };
    getKickMp3ArrayBuffer: () => ArrayBuffer | null;
    isPackaged: () => boolean;
  };
  messaging: {
    sendToProjector: (type: string, props?: Record<string, unknown>) => void;
    sendToDashboard: (type: string, props?: Record<string, unknown>) => void;
    onFromProjector: (
      handler: (event: unknown, data: unknown) => void
    ) => void | (() => void);
    onFromDashboard: (
      handler: (event: unknown, data: unknown) => void
    ) => void | (() => void);
    onInputEvent: (
      handler: (event: unknown, payload: unknown) => void
    ) => void | (() => void);
    onInputStatus: (
      handler: (event: unknown, payload: unknown) => void
    ) => void | (() => void);
    onWorkspaceModulesChanged: (
      handler: (event: unknown, payload: unknown) => void
    ) => void | (() => void);
    onWorkspaceLostSync: (
      handler: (event: unknown, payload: unknown) => void
    ) => void | (() => void);
    configureInput: (payload: unknown) => Promise<unknown>;
    getMidiDevices: () => Promise<unknown>;
    selectWorkspace: () => Promise<unknown>;
  };
}

export interface NwWrldAppBridge {
  json: {
    read: <T = unknown>(filename: string, defaultValue: T) => Promise<T>;
    readSync: <T = unknown>(filename: string, defaultValue: T) => T;
    write: (filename: string, data: unknown) => Promise<unknown>;
    writeSync: (filename: string, data: unknown) => unknown;
  };
  logToMain: (message: unknown) => void;
}

export interface NwSandboxIpc {
  send: (payload: unknown) => void;
  on: (handler: (payload: unknown) => void) => void | (() => void);
}

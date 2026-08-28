import { describe, it, expect, vi } from 'vitest';

// Mock VS Code API for headless test execution
vi.mock('vscode', () => {
  return {
    languages: {
      createDiagnosticCollection: vi.fn(() => ({
        set: vi.fn(),
        clear: vi.fn(),
        dispose: vi.fn()
      })),
      registerCodeActionsProvider: vi.fn(),
      registerHoverProvider: vi.fn()
    },
    workspace: {
      workspaceFolders: [],
      getConfiguration: vi.fn(() => ({
        get: (key: string, defVal: any) => defVal
      })),
      createFileSystemWatcher: vi.fn(() => ({
        onDidChange: vi.fn(),
        onDidCreate: vi.fn(),
        onDidDelete: vi.fn()
      })),
      onDidSaveTextDocument: vi.fn(),
      onDidOpenTextDocument: vi.fn()
    },
    window: {
      createStatusBarItem: vi.fn(() => ({
        text: '',
        tooltip: '',
        backgroundColor: undefined,
        command: '',
        show: vi.fn(),
        hide: vi.fn(),
        dispose: vi.fn()
      })),
      showInformationMessage: vi.fn(),
      showWarningMessage: vi.fn(),
      showErrorMessage: vi.fn(),
      withProgress: vi.fn()
    },
    commands: {
      registerCommand: vi.fn(),
      executeCommand: vi.fn()
    },
    Diagnostic: class {
      public source?: string;
      public code?: string | number;
      public tags?: any[];
      constructor(public range: any, public message: string, public severity: any) {}
    },
    DiagnosticSeverity: {
      Error: 0,
      Warning: 1,
      Information: 2,
      Hint: 3
    },
    DiagnosticTag: {
      Unnecessary: 1
    },
    CodeActionKind: {
      QuickFix: 'quickfix'
    },
    CodeAction: class {
      public diagnostics?: any[];
      public isPreferred?: boolean;
      public edit?: any;
      public command?: any;
      constructor(public title: string, public kind: any) {}
    },
    WorkspaceEdit: class {
      public replace = vi.fn();
    },
    StatusBarAlignment: {
      Right: 2
    },
    ThemeColor: class {
      constructor(public id: string) {}
    },
    Position: class {
      constructor(public line: number, public character: number) {}
    },
    Range: class {
      constructor(public start: any, public end: any) {}
    },
    Uri: {
      file: (path: string) => ({ fsPath: path, scheme: 'file' }),
      parse: (uri: string) => ({ fsPath: uri, scheme: 'file' })
    },
    MarkdownString: class {
      public isTrusted = false;
      public appendMarkdown = vi.fn();
    },
    Hover: class {
      constructor(public contents: any, public range: any) {}
    }
  };
});

import { EnvGuardDiagnosticsManager } from '../packages/vscode-extension/src/diagnostics.js';
import { EnvGuardQuickFixProvider } from '../packages/vscode-extension/src/quickfix.js';
import { EnvGuardHoverProvider } from '../packages/vscode-extension/src/hover.js';
import { EnvGuardStatusBarManager } from '../packages/vscode-extension/src/statusbar.js';

describe('VS Code & Cursor Extension Engine', () => {
  it('instantiates diagnostics manager and creates diagnostic collection', () => {
    const manager = new EnvGuardDiagnosticsManager();
    expect(manager).toBeDefined();
    expect(manager.getCollection()).toBeDefined();
    manager.dispose();
  });

  it('provides quick fix code actions for framework client leaks', () => {
    const provider = new EnvGuardQuickFixProvider();

    const mockDoc = {
      getText: () => 'process.env.SECRET_KEY',
      fileName: 'src/components/Header.tsx',
      uri: { fsPath: 'src/components/Header.tsx' }
    } as any;

    const mockContext = {
      diagnostics: [
        {
          code: 'framework-client-leak',
          source: 'EnvGuard',
          message: 'Client exposure',
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 22 } }
        }
      ]
    } as any;

    const actions = provider.provideCodeActions(mockDoc, {} as any, mockContext);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0].title).toContain('NEXT_PUBLIC_');
  });

  it('provides quick fix code actions for Vite files', () => {
    const provider = new EnvGuardQuickFixProvider();

    const mockDoc = {
      getText: () => 'API_URL',
      fileName: 'src/App.vue',
      uri: { fsPath: 'src/App.vue' }
    } as any;

    const mockContext = {
      diagnostics: [
        {
          code: 'framework-client-leak',
          source: 'EnvGuard',
          message: 'Client exposure',
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 7 } }
        }
      ]
    } as any;

    const actions = provider.provideCodeActions(mockDoc, {} as any, mockContext);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0].title).toContain('VITE_');
  });

  it('updates status bar item with errors, warnings and clean states', () => {
    const statusBar = new EnvGuardStatusBarManager();
    expect(statusBar).toBeDefined();

    // Clean state
    statusBar.updateStatus(0, 0);

    // Warnings state
    statusBar.updateStatus(0, 3);

    // Error state
    statusBar.updateStatus(2, 1);

    statusBar.dispose();
  });
});

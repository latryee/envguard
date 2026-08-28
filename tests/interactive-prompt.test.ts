import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import {
  promptQuestion,
  promptSelect,
  promptConfirm,
  runInteractiveSync
} from '../src/index.js';

// Helper to create a mock readline interface for testing interactive prompts
function createMockReadline(answers: string[]): any {
  const emitter = new EventEmitter() as any;
  let index = 0;
  emitter.question = async (query: string) => {
    const ans = answers[index++] ?? '';
    return ans;
  };
  emitter.close = () => {};
  return emitter;
}

describe('Interactive TUI Prompts & Wizard', () => {
  it('prompts question with custom answer and default fallback', async () => {
    const mockRl1 = createMockReadline(['custom-value']);
    const ans1 = await promptQuestion('Enter name', 'default-name', mockRl1);
    expect(ans1).toBe('custom-value');

    const mockRl2 = createMockReadline(['']);
    const ans2 = await promptQuestion('Enter name', 'default-name', mockRl2);
    expect(ans2).toBe('default-name');
  });

  it('prompts select with numeric choice and default selection', async () => {
    const options = [
      { label: 'Option 1', value: 'opt1' },
      { label: 'Option 2', value: 'opt2' }
    ];

    const mockRl1 = createMockReadline(['2']);
    const ans1 = await promptSelect('Choose option', options, 0, mockRl1);
    expect(ans1).toBe('opt2');

    const mockRl2 = createMockReadline(['invalid']);
    const ans2 = await promptSelect('Choose option', options, 0, mockRl2);
    expect(ans2).toBe('opt1');
  });

  it('prompts confirmation properly', async () => {
    const mockRl1 = createMockReadline(['y']);
    expect(await promptConfirm('Continue?', false, mockRl1)).toBe(true);

    const mockRl2 = createMockReadline(['n']);
    expect(await promptConfirm('Continue?', true, mockRl2)).toBe(false);

    const mockRl3 = createMockReadline(['']);
    expect(await promptConfirm('Continue?', true, mockRl3)).toBe(true);
  });

  it('runs interactive sync wizard to populate .env.example', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-interactive-sync-'));
    try {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      // Code uses PORT and NEW_SECRET
      fs.writeFileSync(path.join(srcDir, 'index.ts'), 'const p = process.env.PORT; const s = process.env.NEW_SECRET;\n');
      fs.writeFileSync(path.join(tempDir, '.env'), 'PORT=3000\nNEW_SECRET=my-super-secret-key\n');
      fs.writeFileSync(path.join(tempDir, '.env.example'), 'PORT=3000\n');

      // Answers for NEW_SECRET: choose option 1 (placeholder)
      const mockRl = createMockReadline(['1']);

      const result = await runInteractiveSync({
        cwd: tempDir,
        rlInstance: mockRl
      });

      expect(result.addedToExample).toContain('NEW_SECRET');
      const exampleContent = fs.readFileSync(path.join(tempDir, '.env.example'), 'utf8');
      expect(exampleContent).toContain('NEW_SECRET=');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

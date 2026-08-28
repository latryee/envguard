import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { auditDockerFiles } from '../src/index.js';

describe('Docker & Container Leak Guard', () => {
  it('detects missing .dockerignore in Docker projects', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-docker-1-'));
    try {
      fs.writeFileSync(
        path.join(tempDir, 'Dockerfile'),
        'FROM node:20\nWORKDIR /app\nCOPY . .\nCMD ["npm", "start"]\n'
      );

      const audit = auditDockerFiles(tempDir);
      expect(audit.hasDockerfile).toBe(true);
      expect(audit.hasDockerignore).toBe(false);
      expect(audit.findings.length).toBeGreaterThan(0);
      expect(audit.findings[0].severity).toBe('critical');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('detects when .dockerignore fails to exclude .env files', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-docker-2-'));
    try {
      fs.writeFileSync(path.join(tempDir, 'Dockerfile'), 'FROM node:20\nCOPY . .\n');
      fs.writeFileSync(path.join(tempDir, '.dockerignore'), 'node_modules\n.git\n');

      const audit = auditDockerFiles(tempDir);
      expect(audit.findings.length).toBeGreaterThan(0);
      expect(audit.findings[0].message).toContain('.dockerignore file is missing an entry for ".env*"');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('passes cleanly when .dockerignore properly excludes .env files', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-docker-3-'));
    try {
      fs.writeFileSync(path.join(tempDir, 'Dockerfile'), 'FROM node:20\nCOPY . .\n');
      fs.writeFileSync(path.join(tempDir, '.dockerignore'), 'node_modules\n.git\n.env*\n');

      const audit = auditDockerFiles(tempDir);
      expect(audit.findings.length).toBe(0);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

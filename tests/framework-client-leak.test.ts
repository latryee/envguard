import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  detectFramework,
  loadCascadingEnv,
  isClientContext,
  checkClientSideExposures,
  getFrameworkInfo
} from '../src/index.js';

describe('Framework Detection, Cascading Env & Client-Side Leak Prevention', () => {
  it('detects frameworks from package.json dependencies and project markers', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-fw-detect-'));
    try {
      // Next.js
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: { next: '14.0.0' } })
      );
      expect(detectFramework(tempDir).name).toBe('nextjs');

      // Vite
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ devDependencies: { vite: '^5.0.0' } })
      );
      expect(detectFramework(tempDir).name).toBe('vite');

      // Remix
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: { '@remix-run/react': '^2.0.0' } })
      );
      expect(detectFramework(tempDir).name).toBe('remix');

      // Generic
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: { express: '^4.18.0' } })
      );
      expect(detectFramework(tempDir).name).toBe('generic');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('loads cascading env files in correct precedence (.env.local overrides .env)', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-fw-cascade-'));
    try {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: { next: '14.0.0' } })
      );

      fs.writeFileSync(path.join(tempDir, '.env'), 'PORT=3000\nDATABASE_URL=postgresql://base:5432/db\n');
      fs.writeFileSync(path.join(tempDir, '.env.local'), 'DATABASE_URL=postgresql://local:5432/override_db\n');

      const cascade = loadCascadingEnv(tempDir, 'development');
      expect(cascade.loadedFiles).toContain('.env');
      expect(cascade.loadedFiles).toContain('.env.local');

      const dbVar = cascade.mergedVariables.get('DATABASE_URL');
      expect(dbVar?.value).toBe('postgresql://local:5432/override_db');

      const portVar = cascade.mergedVariables.get('PORT');
      expect(portVar?.value).toBe('3000');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('detects client context for Next.js use client and Vite components', () => {
    const nextFw = getFrameworkInfo('nextjs');
    const viteFw = getFrameworkInfo('vite');

    expect(isClientContext('src/app/page.tsx', "'use client';\nexport default function Page() {}", nextFw)).toBe(true);
    expect(isClientContext('src/components/Header.tsx', "export function Header() {}", nextFw)).toBe(true);
    expect(isClientContext('src/app/api/route.ts', "export async function GET() {}", nextFw)).toBe(false);

    expect(isClientContext('src/components/Button.tsx', "export function Button() {}", viteFw)).toBe(true);
  });

  it('intercepts client-side private secret exposures', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-client-leak-'));
    try {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: { next: '14.0.0' } })
      );

      const clientFilePath = 'src/components/PaymentModal.tsx';
      const clientContent = `
'use client';
export function PaymentModal() {
  const secretKey = process.env.STRIPE_SECRET_KEY; // DANGEROUS! Leaking secret to client bundle
  const publicKey = process.env.NEXT_PUBLIC_STRIPE_KEY; // Safe
  return <div>Payment</div>;
}
`;
      const fileContents = new Map<string, string>([[clientFilePath, clientContent]]);

      const references = [
        {
          key: 'STRIPE_SECRET_KEY',
          file: clientFilePath,
          line: 4,
          column: 32,
          rawMatch: 'process.env.STRIPE_SECRET_KEY'
        },
        {
          key: 'NEXT_PUBLIC_STRIPE_KEY',
          file: clientFilePath,
          line: 5,
          column: 32,
          rawMatch: 'process.env.NEXT_PUBLIC_STRIPE_KEY'
        }
      ];

      const exposures = checkClientSideExposures(references, fileContents, tempDir);
      expect(exposures.length).toBe(1);
      expect(exposures[0].key).toBe('STRIPE_SECRET_KEY');
      expect(exposures[0].message).toContain('NEXT_PUBLIC_');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

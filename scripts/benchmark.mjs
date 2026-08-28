import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { scanCodebase } from '../dist/index.js';
import { parseEnv } from '../dist/index.js';
import { computeEnvDiff } from '../dist/index.js';

function createBenchmarkWorkspace(dir, fileCount) {
  const srcDir = path.join(dir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  const envContent = `
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb
REDIS_URL=redis://localhost:6379
JWT_SECRET=super_secret_jwt_token_1234567890
API_KEY=your_api_key_here
`;
  fs.writeFileSync(path.join(dir, '.env'), envContent);

  const exampleContent = `
# @type port @required
PORT=3000
# @type enum(development, staging, production)
NODE_ENV=development
# @type url
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb
REDIS_URL=redis://localhost:6379
API_KEY=your_api_key_here
`;
  fs.writeFileSync(path.join(dir, '.env.example'), exampleContent);

  for (let i = 0; i < fileCount; i++) {
    const fileContent = `
// Module ${i}
import { helper } from './helper';
const port = process.env.PORT || 3000;
const db = process.env.DATABASE_URL;
const nodeEnv = process.env.NODE_ENV;
const { REDIS_URL, API_KEY: apiKey } = process.env;
export function run() {
  return port + db + nodeEnv + REDIS_URL + apiKey;
}
`;
    fs.writeFileSync(path.join(srcDir, `module_${i}.ts`), fileContent);
  }
}

async function benchmark() {
  console.log('\n========================================');
  console.log('  🛡️  EnvGuard Real Performance Benchmark');
  console.log('========================================\n');

  const tiers = [
    { name: 'Small Project', files: 25 },
    { name: 'Medium Project', files: 250 },
    { name: 'Large Project', files: 1000 }
  ];

  for (const tier of tiers) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `envguard-bench-${tier.files}-`));
    try {
      createBenchmarkWorkspace(tempDir, tier.files);

      // Warm up
      await scanCodebase({ cwd: tempDir });

      // Measure 5 iterations
      const iterations = 5;
      let totalDuration = 0;
      let lastScanResult = null;

      for (let it = 0; it < iterations; it++) {
        const start = performance.now();

        const envAst = parseEnv(fs.readFileSync(path.join(tempDir, '.env'), 'utf8'));
        const exampleAst = parseEnv(fs.readFileSync(path.join(tempDir, '.env.example'), 'utf8'));
        const scanResult = await scanCodebase({ cwd: tempDir });
        computeEnvDiff({
          envAst,
          exampleAst,
          codeKeys: scanResult.uniqueKeys,
          codeReferences: scanResult.keyLocations
        });

        const duration = performance.now() - start;
        totalDuration += duration;
        lastScanResult = scanResult;
      }

      const avgDuration = (totalDuration / iterations).toFixed(2);
      console.log(`📦 ${tier.name.padEnd(16)} | ${String(tier.files).padStart(4)} files | ${String(lastScanResult.references.length).padStart(5)} references | Avg: ${avgDuration}ms (${iterations} runs)`);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  console.log('\n========================================\n');
}

benchmark().catch(console.error);

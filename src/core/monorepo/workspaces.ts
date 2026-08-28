import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';

export interface WorkspacePackage {
  name: string;
  packageDir: string;
  relPath: string;
  envPath: string;
  examplePath: string;
  hasEnv: boolean;
  hasExample: boolean;
}

/**
 * Discovers monorepo workspaces and packages (npm, pnpm, yarn, turborepo, lerna).
 */
export async function findWorkspaces(cwd = process.cwd()): Promise<WorkspacePackage[]> {
  const rootPkgPath = path.join(cwd, 'package.json');
  let workspaceGlobs: string[] = [];

  // 1. Check root package.json "workspaces"
  if (fs.existsSync(rootPkgPath)) {
    try {
      const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
      if (Array.isArray(rootPkg.workspaces)) {
        workspaceGlobs = rootPkg.workspaces;
      } else if (rootPkg.workspaces && Array.isArray(rootPkg.workspaces.packages)) {
        workspaceGlobs = rootPkg.workspaces.packages;
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // 2. Check pnpm-workspace.yaml
  const pnpmWorkspacePath = path.join(cwd, 'pnpm-workspace.yaml');
  if (workspaceGlobs.length === 0 && fs.existsSync(pnpmWorkspacePath)) {
    try {
      const content = fs.readFileSync(pnpmWorkspacePath, 'utf8');
      const lines = content.split(/\r?\n/);
      let inPackages = false;
      for (const line of lines) {
        if (line.trim().startsWith('packages:')) {
          inPackages = true;
          continue;
        }
        if (inPackages) {
          const match = line.match(/^\s*-\s*['"]?([^'"]+)['"]?/);
          if (match) {
            workspaceGlobs.push(match[1]);
          } else if (line.trim() && !line.startsWith(' ') && !line.startsWith('#')) {
            break;
          }
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // 3. Fallback: discover packages using glob
  if (workspaceGlobs.length === 0) {
    workspaceGlobs = ['packages/*', 'apps/*', 'services/*', 'modules/*'];
  }

  const pkgJsonPatterns = workspaceGlobs.map((g) => {
    const clean = g.replace(/\/+$/, '');
    return `${clean}/package.json`;
  });

  const matchedPkgFiles = await fg(pkgJsonPatterns, {
    cwd,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
    absolute: true
  });

  const workspaces: WorkspacePackage[] = [];

  for (const pkgFile of matchedPkgFiles) {
    const packageDir = path.dirname(pkgFile);
    const relPath = path.relative(cwd, packageDir).replace(/\\/g, '/');

    let name = relPath;
    try {
      const pkgJson = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
      if (pkgJson.name) {
        name = pkgJson.name;
      }
    } catch {
      // Ignore
    }

    const envPath = path.join(packageDir, '.env');
    const examplePath = path.join(packageDir, '.env.example');

    workspaces.push({
      name,
      packageDir,
      relPath,
      envPath,
      examplePath,
      hasEnv: fs.existsSync(envPath),
      hasExample: fs.existsSync(examplePath)
    });
  }

  return workspaces;
}

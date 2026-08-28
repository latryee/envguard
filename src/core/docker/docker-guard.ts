import fs from 'node:fs';
import path from 'node:path';

export interface DockerFinding {
  severity: 'critical' | 'warning';
  title: string;
  message: string;
  file: string;
  remediation: string;
}

export interface DockerAuditResult {
  hasDockerfile: boolean;
  hasDockerignore: boolean;
  findings: DockerFinding[];
}

/**
 * Audits Dockerfile and .dockerignore for dangerous .env file leakage into image layers.
 */
export function auditDockerFiles(cwd = process.cwd()): DockerAuditResult {
  const dockerfilePath = path.join(cwd, 'Dockerfile');
  const dockerignorePath = path.join(cwd, '.dockerignore');

  const hasDockerfile = fs.existsSync(dockerfilePath);
  const hasDockerignore = fs.existsSync(dockerignorePath);
  const findings: DockerFinding[] = [];

  if (!hasDockerfile) {
    return {
      hasDockerfile: false,
      hasDockerignore,
      findings
    };
  }

  const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
  const hasCopyAll = /COPY\s+(?:\.\s+|\.\/|\*\s+)/i.test(dockerfileContent) || /ADD\s+(?:\.\s+|\.\/|\*\s+)/i.test(dockerfileContent);

  if (!hasDockerignore) {
    findings.push({
      severity: 'critical',
      title: 'Missing .dockerignore in Docker Build Context',
      message: 'Dockerfile copies project files ("COPY ."), but no .dockerignore file exists. Your local .env and secret files will be baked into the Docker image layers!',
      file: 'Dockerfile',
      remediation: 'Create a .dockerignore file containing ".env*", "*.local", and "node_modules".'
    });
  } else {
    const dockerignoreContent = fs.readFileSync(dockerignorePath, 'utf8');
    const lines = dockerignoreContent.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

    const excludesEnv = lines.some(
      (line) => line === '.env' || line === '.env*' || line === '*.env' || line === '**/.env*' || line.startsWith('.env')
    );

    if (!excludesEnv && hasCopyAll) {
      findings.push({
        severity: 'critical',
        title: '.dockerignore does not exclude .env files',
        message: 'Your .dockerignore file is missing an entry for ".env*". Local secrets risk being committed to Docker registries!',
        file: '.dockerignore',
        remediation: 'Add ".env" and ".env.*" to your .dockerignore file.'
      });
    }
  }

  return {
    hasDockerfile: true,
    hasDockerignore,
    findings
  };
}

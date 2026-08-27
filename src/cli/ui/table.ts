import pc from 'picocolors';

export interface TableRow {
  key: string;
  status: string;
  expected: string;
  actual: string;
  location?: string;
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export function renderDiffTable(rows: TableRow[]): string {
  if (rows.length === 0) return '';

  const maxKeyLen = Math.max(...rows.map((r) => r.key.length), 8);
  const maxStatusLen = Math.max(...rows.map((r) => stripAnsi(r.status).length), 6);
  const maxExpLen = Math.max(...rows.map((r) => r.expected.length), 8);
  const maxActLen = Math.max(...rows.map((r) => r.actual.length), 6);

  const header = `  ${pc.dim('Variable'.padEnd(maxKeyLen))}  ${pc.dim('Status'.padEnd(maxStatusLen))}  ${pc.dim('Expected'.padEnd(maxExpLen))}  ${pc.dim('Actual')}`;
  const divider = `  ${pc.dim('─'.repeat(maxKeyLen))}  ${pc.dim('─'.repeat(maxStatusLen))}  ${pc.dim('─'.repeat(maxExpLen))}  ${pc.dim('─'.repeat(maxActLen))}`;

  const lines = [header, divider];

  for (const row of rows) {
    const loc = row.location ? ` ${pc.dim(`(${row.location})`)}` : '';
    lines.push(
      `  ${pc.bold(row.key.padEnd(maxKeyLen))}  ${row.status.padEnd(maxStatusLen)}  ${pc.cyan(row.expected.padEnd(maxExpLen))}  ${row.actual}${loc}`
    );
  }

  return lines.join('\n');
}

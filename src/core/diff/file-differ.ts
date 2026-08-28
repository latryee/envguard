import { parseEnv } from '../parser/env-parser.js';
import { maskSecret } from '../secrets/detector.js';
import { inferType } from '../validator/type-inference.js';
import { InferredType } from '../parser/types.js';

export interface FileDiffItem {
  key: string;
  valueA?: string;
  valueB?: string;
  maskedValueA?: string;
  maskedValueB?: string;
  typeA?: InferredType;
  typeB?: InferredType;
  status: 'added' | 'removed' | 'changed' | 'identical';
}

export interface FileDiffResult {
  fileA: string;
  fileB: string;
  added: FileDiffItem[];
  removed: FileDiffItem[];
  changed: FileDiffItem[];
  identical: FileDiffItem[];
  hasDifferences: boolean;
}

export function compareEnvFiles(
  contentA: string,
  contentB: string,
  fileAName = 'File A',
  fileBName = 'File B'
): FileDiffResult {
  const astA = parseEnv(contentA);
  const astB = parseEnv(contentB);

  const allKeys = new Set<string>([
    ...Array.from(astA.variables.keys()),
    ...Array.from(astB.variables.keys())
  ]);

  const added: FileDiffItem[] = [];
  const removed: FileDiffItem[] = [];
  const changed: FileDiffItem[] = [];
  const identical: FileDiffItem[] = [];

  for (const key of allKeys) {
    const varA = astA.variables.get(key);
    const varB = astB.variables.get(key);

    const valA = varA?.value;
    const valB = varB?.value;

    const typeA = valA !== undefined ? inferType(valA) : undefined;
    const typeB = valB !== undefined ? inferType(valB) : undefined;

    const maskedA = valA !== undefined ? maskSecret(valA) : undefined;
    const maskedB = valB !== undefined ? maskSecret(valB) : undefined;

    if (varA && !varB) {
      removed.push({
        key,
        valueA: valA,
        maskedValueA: maskedA,
        typeA,
        status: 'removed'
      });
    } else if (!varA && varB) {
      added.push({
        key,
        valueB: valB,
        maskedValueB: maskedB,
        typeB,
        status: 'added'
      });
    } else if (valA !== valB) {
      changed.push({
        key,
        valueA: valA,
        valueB: valB,
        maskedValueA: maskedA,
        maskedValueB: maskedB,
        typeA,
        typeB,
        status: 'changed'
      });
    } else {
      identical.push({
        key,
        valueA: valA,
        valueB: valB,
        maskedValueA: maskedA,
        maskedValueB: maskedB,
        typeA,
        typeB,
        status: 'identical'
      });
    }
  }

  return {
    fileA: fileAName,
    fileB: fileBName,
    added,
    removed,
    changed,
    identical,
    hasDifferences: added.length > 0 || removed.length > 0 || changed.length > 0
  };
}

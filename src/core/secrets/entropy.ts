/**
 * Calculates the Shannon Entropy of a string.
 * Higher entropy indicates higher randomness (typical for cryptographic keys, hashes, tokens).
 * Shannon Entropy formula: H = -sum(P(x) * log2(P(x)))
 */
export function calculateShannonEntropy(str: string): number {
  if (!str || str.length === 0) return 0;

  const frequencies = new Map<string, number>();
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  let entropy = 0;
  const len = str.length;

  for (const count of frequencies.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Checks if a string has suspicious high entropy given its length and character diversity.
 */
export function isHighEntropyString(str: string, threshold = 4.3, minLength = 20): boolean {
  if (!str || str.length < minLength) return false;

  // Filter out URLs, obvious repetitive sequences, and common placeholders
  const clean = str.trim();
  if (clean.includes(' ') || clean.includes('\n')) return false;

  // Filter out URLs and connection URIs
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(clean) || clean.includes('://')) {
    return false;
  }

  // Filter out standard UUIDs
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(clean)) {
    return false;
  }

  const entropy = calculateShannonEntropy(clean);
  return entropy >= threshold;
}

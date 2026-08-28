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

  const clean = str.trim();
  if (clean.includes(' ') || clean.includes('\n')) return false;

  // Filter out URLs and connection URIs
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(clean) || clean.includes('://')) {
    return false;
  }

  // Filter out data URIs (e.g. data:image/png;base64,...)
  if (/^data:[a-zA-Z0-9/+-]+;base64,/i.test(clean)) {
    return false;
  }

  // Filter out standard UUIDs and urn:uuid:...
  if (
    /^(?:urn:uuid:)?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(
      clean
    )
  ) {
    return false;
  }

  // Filter out pure git/commit SHA1 or SHA256 hashes if they only contain lowercase hex
  if (/^[0-9a-f]{40}$/.test(clean) || /^[0-9a-f]{64}$/.test(clean)) {
    return false;
  }

  // Filter out webpack / build asset chunk filenames
  if (/\b(?:chunk|bundle|vendor|app|main)[-._][0-9a-fA-F]{8,32}\.(?:js|css|map)$/i.test(clean)) {
    return false;
  }

  const entropy = calculateShannonEntropy(clean);
  return entropy >= threshold;
}

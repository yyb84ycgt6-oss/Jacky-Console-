const SECRET_PATTERNS: RegExp[] = [
  /(?:sk|pk|rk)_[A-Za-z0-9]{16,}/g,
  /AIza[0-9A-Za-z\-_]{35}/g,
  /ghp_[A-Za-z0-9]{36,}/g,
  /xox[baprs]-[A-Za-z0-9-]{20,}/g,
  /\b(?:api[_-]?key|token|secret|password)\b\s*[:=]\s*[^\s,;]+/gi,
];

const PRIVATE_KEY_BEGIN = "-----BEGIN ";
const PRIVATE_KEY_END = " PRIVATE KEY-----";
const PRIVATE_KEY_CLOSING_PREFIX = "-----END ";

export function redactSecrets(input: string): string {
  let out = input;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[REDACTED_SECRET]");
  }

  let beginIdx = out.indexOf(PRIVATE_KEY_BEGIN);
  while (beginIdx !== -1) {
    const beginLineEnd = out.indexOf(PRIVATE_KEY_END, beginIdx);
    if (beginLineEnd === -1) break;
    const type = out.slice(beginIdx + PRIVATE_KEY_BEGIN.length, beginLineEnd).trim();
    const closingMarker = `${PRIVATE_KEY_CLOSING_PREFIX}${type}${PRIVATE_KEY_END}`;
    const closingIdx = out.indexOf(closingMarker, beginLineEnd + PRIVATE_KEY_END.length);
    if (closingIdx === -1) {
      beginIdx = out.indexOf(PRIVATE_KEY_BEGIN, beginLineEnd + PRIVATE_KEY_END.length);
      continue;
    }
    const closingEnd = closingIdx + closingMarker.length;
    out = `${out.slice(0, beginIdx)}[REDACTED_SECRET]${out.slice(closingEnd)}`;
    beginIdx = out.indexOf(PRIVATE_KEY_BEGIN, beginIdx + "[REDACTED_SECRET]".length);
  }

  return out;
}

export function hasIrreversibleIntent(input: string): boolean {
  return /\b(delete|erase|destroy|drop\s+table|wipe|remove\s+all|purge|reset\s+all)\b/i.test(input);
}

export function normalizeLeadingCommand(input: string, command: string): string {
  return input.replace(new RegExp(`^${command}\\s*`, "i"), "").trim();
}

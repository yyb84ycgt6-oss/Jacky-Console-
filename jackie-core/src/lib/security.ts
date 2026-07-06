const SECRET_PATTERNS: RegExp[] = [
  /(?:sk|pk|rk)_[A-Za-z0-9]{16,}/g,
  /AIza[0-9A-Za-z\-_]{35}/g,
  /ghp_[A-Za-z0-9]{36,}/g,
  /xox[baprs]-[A-Za-z0-9-]{20,}/g,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g,
  /\b(?:api[_-]?key|token|secret|password)\b\s*[:=]\s*[^\s,;]+/gi,
];

export function redactSecrets(input: string): string {
  let out = input;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[REDACTED_SECRET]");
  }
  return out;
}

export function hasIrreversibleIntent(input: string): boolean {
  return /\b(delete|erase|destroy|drop\s+table|wipe|remove\s+all|purge|reset\s+all)\b/i.test(input);
}

export function normalizeLeadingCommand(input: string, command: string): string {
  return input.replace(new RegExp(`^${command}\\s*`, "i"), "").trim();
}

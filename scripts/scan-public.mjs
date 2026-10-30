import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const excluded = new Set([
  "node_modules",
  ".git",
  "dist",
  ".wrangler",
  ".local",
  "artifacts",
  "test-results",
  "playwright-report",
  "coverage",
]);
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (excluded.has(entry.name)) return [];
    if (entry.isDirectory()) return walk(full);
    return [path.relative(root, full).replaceAll("\\", "/")];
  });
}
let files;
try {
  files = execFileSync("git", ["ls-files", "--cached", "-z"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  })
    .split("\0")
    .filter(Boolean);
  if (!files.length) files = walk(root);
} catch {
  files = walk(root);
}
const checks = [
  ["provider key", /\bsk-(?:or-v1-)?[A-Za-z0-9_-]{24,}/],
  [
    "GitHub credential",
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/,
  ],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["Cloud credential", /\bAKIA[0-9A-Z]{16}\b/],
  ["literal bearer credential", /Bearer\s+[A-Za-z0-9_./+-]{28,}/],
  ["local user path", /[A-Z]:[\\/]Users[\\/][^\s/\\]+[\\/]/],
];
const issues = [];
for (const file of files) {
  if (
    /(?:^|\/)(?:\.env(?:\..+)?|\.dev\.vars(?:\..+)?)$/.test(file) &&
    !file.endsWith(".example")
  ) {
    issues.push(`${file}: sensitive configuration filename`);
    continue;
  }
  if (
    /(?:\.log|\.bak|\.sqlite|\.pem|\.key|\.pfx)$/.test(file) ||
    /^(?:artifacts|\.local|\.wrangler)\//.test(file)
  ) {
    issues.push(`${file}: local-only artifact`);
    continue;
  }
  if (
    !/\.(?:js|jsx|mjs|json|jsonc|md|yml|yaml|toml|sql|html|css|txt|example)$/.test(
      file,
    ) &&
    !["LICENSE", ".gitignore", ".gitattributes"].includes(file)
  )
    continue;
  const lines = fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++)
    for (const [label, pattern] of checks)
      if (pattern.test(lines[i]))
        issues.push(`${file}:${i + 1}: ${label}; value suppressed`);
}
if (issues.length) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Public-source scan passed (${files.length} candidate files; dependency/build/local-state directories excluded). This is a release aid, not a guarantee against every secret format.`,
  );

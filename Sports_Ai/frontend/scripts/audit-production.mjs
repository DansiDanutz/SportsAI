import { spawnSync } from 'node:child_process';

const allowedAdvisories = new Map([
  [
    'GHSA-QWWW-VCR4-C8H2',
    'React Router RSC-mode CSRF does not apply to this client-only Vite SPA, which exposes no RSC actions or request handler.',
  ],
]);

const audit = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

if (!audit.stdout) {
  console.error(audit.stderr || 'npm audit returned no report');
  process.exit(1);
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch (error) {
  console.error('Unable to parse npm audit output:', error);
  process.exit(1);
}

if (audit.error || report.error || !report.metadata?.vulnerabilities) {
  console.error('npm audit did not return a complete vulnerability report.');
  console.error(audit.error ?? report.error ?? audit.stderr);
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities ?? {};

function advisoryIdsFor(name, visited = new Set()) {
  if (visited.has(name)) return new Set();
  visited.add(name);

  const vulnerability = vulnerabilities[name];
  if (!vulnerability) return new Set([`dependency:${name}`]);

  const ids = new Set();
  for (const finding of vulnerability.via ?? []) {
    if (typeof finding === 'string') {
      for (const id of advisoryIdsFor(finding, visited)) ids.add(id);
      continue;
    }

    const match = finding.url?.match(/GHSA-[\w-]+/i);
    ids.add(match?.[0]?.toUpperCase() ?? `source:${finding.source}`);
  }

  return ids.size > 0 ? ids : new Set([`dependency:${name}`]);
}

const blocked = [];
const accepted = new Set();

for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  if (!['high', 'critical'].includes(vulnerability.severity)) continue;

  for (const advisoryId of advisoryIdsFor(name)) {
    if (allowedAdvisories.has(advisoryId)) {
      accepted.add(advisoryId);
    } else {
      blocked.push(`${name}: ${advisoryId}`);
    }
  }
}

if (blocked.length > 0) {
  console.error('Production audit found unapproved high/critical advisories:');
  for (const finding of [...new Set(blocked)]) console.error(`- ${finding}`);
  process.exit(1);
}

for (const advisoryId of accepted) {
  console.warn(`Accepted non-applicable advisory ${advisoryId}: ${allowedAdvisories.get(advisoryId)}`);
}

console.log('Production dependency audit passed: no applicable high/critical advisories.');

// Apply mechanical Microsoft Writing Style Guide fixes across docs/.
//
// Handles the high-volume mechanical sweeps:
//   - `in order to` → `to` (outside code)
//   - `utilize` → `use` (outside code)
//   - H2/H3/H4 headings: Title Case → sentence case, preserving acronyms and proper nouns
//
// Skips H1 (page titles), code fences (``` ... ```), and inline code (`...`).
// Words listed in PRESERVE_CASE keep their existing capitalization in headings.

import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';

// Words / tokens that MUST keep their existing capitalization in headings.
// Match is case-sensitive against the original token core.
const PRESERVE_CASE = new Set([
  // Microsoft brands and products
  'Microsoft', 'Power', 'Pages', 'Apps', 'Automate', 'Platform', 'BI',
  'Dataverse', 'Azure', 'Entra', 'Liquid', 'Maker', 'Office', 'Teams',
  'Outlook', 'SharePoint', 'OneDrive', 'Excel', 'Word', 'Copilot',
  'Bing', 'GitHub', 'GitLab', 'Visual', 'Studio', 'Code', 'Mermaid',
  // Technology / framework names
  'React', 'Vue', 'Angular', 'Astro', 'Vite', 'Node.js', 'TypeScript',
  'JavaScript', 'Python', 'PowerShell', 'Bash',
  'Claude', 'OpenAI',
  // Acronyms
  'API', 'APIs', 'AI', 'SPA', 'SPAs', 'ALM', 'CRUD', 'CSRF', 'OData',
  'CI', 'HTML', 'CSS', 'JSON', 'YAML', 'XML', 'HTTP', 'HTTPS',
  'SDK', 'REST', 'UI', 'UX', 'IDE', 'CLI', 'PAC', 'PR', 'PRs', 'PO',
  'ID', 'IDs', 'URL', 'URLs', 'ERP', 'SSO', 'SaaS', 'OS', 'MS', 'PDF',
  'VS', 'GUID', 'DOM', 'JSX', 'TSX', 'CDN', 'CSV', 'CRM',
  // Lab / Step / Part — used in cross-refs like "Lab 02, Step 4.4"
  'Lab', 'Step', 'Part',
]);

function isAcronym(word) {
  const core = word.replace(/[^A-Za-z]/g, '');
  return core.length >= 2 && core === core.toUpperCase();
}

function sentenceCaseHeading(text) {
  // Protect inline code
  const stash = [];
  const protectedText = text.replace(/`[^`]*`/g, (m) => {
    stash.push(m);
    return `\x00${stash.length - 1}\x00`;
  });

  const tokens = protectedText.split(/(\s+)/);
  const out = [];
  let seenWord = false;

  for (const tok of tokens) {
    if (!tok || /^\s+$/.test(tok)) {
      out.push(tok);
      continue;
    }
    const leadingMatch = tok.match(/^[^\w]*/);
    const trailingMatch = tok.match(/[^\w]*$/);
    const leading = leadingMatch ? leadingMatch[0] : '';
    const trailing = trailingMatch ? trailingMatch[0] : '';
    const core = tok.slice(leading.length, tok.length - trailing.length);

    if (!core) {
      out.push(tok);
      continue;
    }
    if (!seenWord) {
      seenWord = true;
      out.push(tok);
      continue;
    }
    if (isAcronym(core)) {
      out.push(tok);
      continue;
    }
    if (PRESERVE_CASE.has(core)) {
      out.push(tok);
      continue;
    }
    // Lowercase only Title Case-shaped words (Capitalized + lowercase tail)
    if (/^[A-Z][a-z]+$/.test(core)) {
      out.push(leading + core.toLowerCase() + trailing);
      continue;
    }
    // Otherwise leave it as-is (handles compound mixed-case, hyphenated, etc.)
    out.push(tok);
  }

  let result = out.join('');
  // Restore inline code
  result = result.replace(/\x00(\d+)\x00/g, (_, i) => stash[Number(i)]);
  return result;
}

function transformProseLine(line) {
  // Protect inline code
  const stash = [];
  const protectedLine = line.replace(/`[^`]*`/g, (m) => {
    stash.push(m);
    return `\x00${stash.length - 1}\x00`;
  });

  let result = protectedLine;

  // Note: em dashes are not used in this content (Microsoft Learn style). The
  // sweep no longer converts `--` → `—`; Vale's Microsoft.Dashes rule flags any
  // stray em dash. Use a colon, comma, parentheses, or separate sentences.

  // "in order to" → "to" (case-insensitive)
  result = result.replace(/\bin order to\b/gi, 'to');

  // "utilize"/"utilizes"/"utilized" → "use" forms
  result = result.replace(/\b(Utilize|UTILIZE|utilize|Utilizes|utilizes|Utilized|utilized)\b/g, (m) => {
    const lower = m.toLowerCase();
    let base;
    if (lower === 'utilize') base = 'use';
    else if (lower === 'utilizes') base = 'uses';
    else base = 'used';
    if (m === m.toUpperCase()) return base.toUpperCase();
    if (m[0] === m[0].toUpperCase()) return base[0].toUpperCase() + base.slice(1);
    return base;
  });

  // Restore inline code
  result = result.replace(/\x00(\d+)\x00/g, (_, i) => stash[Number(i)]);
  return result;
}

function processFile(path, { check = false } = {}) {
  const original = readFileSync(path, 'utf8');
  const lines = original.split('\n');

  let inCodeBlock = false;
  let inFrontmatter = false;
  const newLines = [];
  let headingChanges = 0;
  let proseChanges = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (i === 0 && line.trim() === '---') {
      inFrontmatter = true;
      newLines.push(line);
      continue;
    }
    if (inFrontmatter) {
      if (line.trim() === '---') inFrontmatter = false;
      newLines.push(line);
      continue;
    }

    if (/^```|^~~~/.test(line)) {
      inCodeBlock = !inCodeBlock;
      newLines.push(line);
      continue;
    }
    if (inCodeBlock) {
      newLines.push(line);
      continue;
    }

    const headingMatch = line.match(/^(#{2,4})\s+(.*)$/);
    if (headingMatch) {
      const hashes = headingMatch[1];
      const headingText = headingMatch[2];
      // First sentence-case, then apply the remaining prose word-swaps
      // (in order to / utilize) within the heading text, skipping inline code.
      let newText = sentenceCaseHeading(headingText);
      newText = transformProseLine(newText);
      if (newText !== headingText) headingChanges++;
      newLines.push(`${hashes} ${newText}`);
      continue;
    }

    const newLine = transformProseLine(line);
    if (newLine !== line) proseChanges++;
    newLines.push(newLine);
  }

  const newContent = newLines.join('\n');
  const changed = newContent !== original;
  if (changed && !check) {
    writeFileSync(path, newContent, 'utf8');
  }
  return { headingChanges, proseChanges, changed };
}

function collectMarkdown(target, out) {
  const st = statSync(target);
  if (st.isDirectory()) {
    for (const entry of readdirSync(target).sort()) {
      collectMarkdown(join(target, entry), out);
    }
  } else if (extname(target) === '.md') {
    out.push(target);
  }
}

const rawArgs = process.argv.slice(2);
// `--check` reports what the sweep WOULD change and exits non-zero if anything
// is unstyled, without writing. Used by `npm run check` and the pre-commit hook.
const check = rawArgs.includes('--check');
const args = rawArgs.filter((a) => a !== '--check');
if (args.length === 0) {
  console.error('Usage: node scripts/ms-learn-style-sweep.mjs [--check] <file-or-dir> [more...]');
  process.exit(2);
}

const targets = [];
for (const arg of args) {
  collectMarkdown(arg, targets);
}

let totalH = 0;
let totalP = 0;
let changedFiles = 0;
for (const f of targets) {
  const { headingChanges, proseChanges, changed } = processFile(f, { check });
  if (headingChanges || proseChanges) {
    console.log(`${f}: ${headingChanges} heading changes, ${proseChanges} prose-line changes`);
  }
  if (changed) changedFiles++;
  totalH += headingChanges;
  totalP += proseChanges;
}
const verb = check ? 'would change' : 'changed';
console.log(`\nTotal: ${totalH} heading changes, ${totalP} prose-line changes (${changedFiles} file(s) ${verb}) across ${targets.length} files`);
if (check && changedFiles > 0) {
  console.error(`\n[style:check] ${changedFiles} file(s) need the Microsoft style sweep. Run \`npm run style\` to apply, then re-stage and commit.`);
  process.exit(1);
}

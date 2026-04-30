"""Apply mechanical Microsoft Writing Style Guide fixes across docs/.

Handles the high-volume mechanical sweeps:
  - `--` → em dash (outside code blocks and inline code)
  - `in order to` → `to` (outside code)
  - `utilize` → `use` (outside code)
  - H2/H3/H4 headings: Title Case → sentence case, preserving acronyms and proper nouns

Skips H1 (page titles) per MS Learn convention. Code blocks (```...```) and inline code (`...`)
are left untouched. Words listed in PRESERVE_CASE keep their existing capitalization in headings.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

# Words that MUST keep their existing capitalization in headings.
# Acronyms and brand/product names. Match is case-sensitive against the
# original token in the heading (so "API" matches "API" but lowercased
# "api" wouldn't match — that's fine because we wouldn't see lowercase
# acronyms in source headings).
PRESERVE_CASE = {
    # Microsoft brands and products
    "Microsoft", "Power", "Pages", "Apps", "Automate", "Platform", "BI",
    "Dataverse", "Azure", "Entra", "Liquid", "Maker", "Office", "Teams",
    "Outlook", "SharePoint", "OneDrive", "Excel", "Word", "Copilot",
    "Bing", "GitHub", "GitLab", "Visual", "Studio", "Code",
    # Technology / framework names
    "React", "Vue", "Angular", "Astro", "Vite", "Node.js", "TypeScript",
    "JavaScript", "Python", "PowerShell", "Bash",
    "Claude", "OpenAI",
    # Acronyms (kept capitalized as words, the script also has a generic
    # all-caps detector below)
    "API", "APIs", "AI", "SPA", "SPAs", "ALM", "CRUD", "CSRF", "OData",
    "OData,", "CI", "HTML", "CSS", "JSON", "YAML", "XML", "HTTP", "HTTPS",
    "SDK", "REST", "UI", "UX", "IDE", "CLI", "PAC", "PR", "PRs", "PO",
    "ID", "IDs", "URL", "URLs", "ERP", "SSO", "SaaS", "OS", "MS", "PDF",
    "VS",  # historic; allow if it appears
    "GUID", "DOM", "JSX", "TSX", "CDN", "CSV",
    # Lab itself is part of a label like "Lab 01" — keep capitalized
    "Lab",
    # Common starts of phrases that must stay capitalized when not first word
    # because they're proper nouns
    "Step", "Part",  # used in cross-refs like "Lab 02, Step 4.4"
    # MS feature / product names that show up in headings
    "Mermaid",
}

# Lines that should be left alone in heading conversion. Defensive — used if
# we want to keep certain headings exactly as authored.
HEADING_OPT_OUT = set()  # not currently used; reserved


def is_acronym(word: str) -> bool:
    """A token of all-caps letters (with possible trailing digits/punct)
    is treated as an acronym and kept as-is."""
    core = re.sub(r"[^A-Za-z]", "", word)
    return len(core) >= 2 and core.isupper()


def sentence_case_heading(text: str) -> str:
    """Convert a heading line's text portion to sentence case, preserving
    acronyms, proper nouns, and any inline code spans (`...`)."""

    # Protect inline code spans
    placeholders: list[str] = []

    def stash(match: re.Match[str]) -> str:
        placeholders.append(match.group(0))
        return f"\x00{len(placeholders) - 1}\x00"

    protected = re.sub(r"`[^`]*`", stash, text)

    # Split on whitespace but preserve runs of whitespace
    tokens = re.split(r"(\s+)", protected)

    out: list[str] = []
    seen_word = False
    for tok in tokens:
        if not tok or tok.isspace():
            out.append(tok)
            continue

        # Check word membership: strip leading/trailing punctuation, check core
        leading = re.match(r"^[^\w]*", tok).group(0)
        trailing = re.search(r"[^\w]*$", tok).group(0)
        core = tok[len(leading):len(tok) - len(trailing) if trailing else len(tok)]

        if not core:
            out.append(tok)
            continue

        # First word of the heading: keep capitalization as-is
        if not seen_word:
            seen_word = True
            out.append(tok)
            continue

        # Acronym — keep
        if is_acronym(core):
            out.append(tok)
            continue

        # In preserve list — keep as-is (case-sensitive match on the token core)
        if core in PRESERVE_CASE:
            out.append(tok)
            continue

        # Lowercase ONLY if currently starts with a single capital then lowercase
        # (Title Case form). Mixed-case identifiers (like "OData", "GitHub") would
        # already be caught by PRESERVE_CASE above; if not, leave untouched.
        if re.fullmatch(r"[A-Z][a-z]+", core):
            new_core = core.lower()
            out.append(leading + new_core + trailing)
            continue

        # Otherwise leave it (handles compound mixed-case, hyphenated, etc.)
        out.append(tok)

    result = "".join(out)
    # Restore inline code
    def restore(match: re.Match[str]) -> str:
        idx = int(match.group(1))
        return placeholders[idx]
    result = re.sub(r"\x00(\d+)\x00", restore, result)

    return result


def transform_line_outside_code(line: str) -> str:
    """Apply non-heading prose transforms to a line known to be outside a
    fenced code block. Inline code (``...``) is preserved."""
    # Protect inline code
    placeholders: list[str] = []

    def stash(match: re.Match[str]) -> str:
        placeholders.append(match.group(0))
        return f"\x00{len(placeholders) - 1}\x00"

    protected = re.sub(r"`[^`]*`", stash, line)

    # `--` to em dash
    # Match `--` only when it's a prose dash, not a CLI flag prefix.
    # CLI flags look like `--flag-name` (no space before `--`, alphanum after).
    # We've already protected inline code, so most CLI references are gone.
    # The remaining `--` in prose typically appears as "word -- word" or
    # "word--word" or "word -- " at end-of-clause. Replace any `--` not
    # immediately followed by an alphanumeric flag-style char and not part
    # of a `---` horizontal rule.
    # First, leave triple-dash horizontal rules alone (entire line "---").
    if protected.strip() == "---" or protected.strip() == "----":
        result = protected
    else:
        # Replace `--` with `—` only when it's clearly prose:
        # - Surrounded by whitespace on both sides: "word -- word"
        # - At end of clause: "word --"
        # - Beginning of clause: "-- word"
        # - Joining words with no spaces: "word--word"
        # Avoid: `--flag` (CLI flag, no space before, alpha after)
        # The protected step removed inline code, so `--flag` only remains
        # if the doc literally uses `--flag` outside code (rare; we accept).
        result = re.sub(r"(?<=\S) -- (?=\S)", " — ", protected)
        result = re.sub(r"(?<=\S) --(?=\s|$)", " —", result)
        result = re.sub(r"(?<=^|\s)-- (?=\S)", "— ", result)
        result = re.sub(r"(?<=\w)--(?=\w)", "—", result)

    # "in order to" → "to" (case-insensitive)
    result = re.sub(r"\bin order to\b", "to", result, flags=re.IGNORECASE)

    # "utilize" → "use" (case-insensitive, preserve case)
    def utilize_repl(match: re.Match[str]) -> str:
        word = match.group(0)
        if word == "Utilize":
            return "Use"
        if word == "UTILIZE":
            return "USE"
        return "use"
    result = re.sub(r"\butilize[ds]?\b", utilize_repl, result, flags=re.IGNORECASE)

    # Restore inline code
    def restore(match: re.Match[str]) -> str:
        idx = int(match.group(1))
        return placeholders[idx]
    result = re.sub(r"\x00(\d+)\x00", restore, result)

    return result


def process_file(path: Path) -> tuple[int, int]:
    """Process a single markdown file. Returns (heading_changes, prose_changes)."""
    original = path.read_text(encoding="utf-8")
    lines = original.split("\n")

    in_code_block = False
    in_frontmatter = False
    new_lines: list[str] = []
    heading_changes = 0
    prose_changes = 0

    for i, line in enumerate(lines):
        # YAML frontmatter at the top
        if i == 0 and line.strip() == "---":
            in_frontmatter = True
            new_lines.append(line)
            continue
        if in_frontmatter:
            if line.strip() == "---":
                in_frontmatter = False
            new_lines.append(line)
            continue

        # Track fenced code blocks (``` ... ``` or ~~~ ... ~~~)
        if re.match(r"^```|^~~~", line):
            in_code_block = not in_code_block
            new_lines.append(line)
            continue

        if in_code_block:
            new_lines.append(line)
            continue

        # Heading: ##, ###, #### (skip H1 — keep page titles as authored)
        heading_match = re.match(r"^(#{2,4})\s+(.*)$", line)
        if heading_match:
            hashes = heading_match.group(1)
            heading_text = heading_match.group(2)
            new_text = sentence_case_heading(heading_text)
            if new_text != heading_text:
                heading_changes += 1
            new_lines.append(f"{hashes} {new_text}")
            continue

        # Normal prose line
        new_line = transform_line_outside_code(line)
        if new_line != line:
            prose_changes += 1
        new_lines.append(new_line)

    new_content = "\n".join(new_lines)
    if new_content != original:
        path.write_text(new_content, encoding="utf-8")
    return heading_changes, prose_changes


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("Usage: ms-learn-style-sweep.py <file-or-dir> [more...]", file=sys.stderr)
        return 2

    targets: list[Path] = []
    for arg in argv[1:]:
        p = Path(arg)
        if p.is_dir():
            targets.extend(sorted(p.rglob("*.md")))
        elif p.is_file():
            targets.append(p)
        else:
            print(f"Skipping {p} — not a file or directory", file=sys.stderr)

    total_h = 0
    total_p = 0
    for f in targets:
        h, p = process_file(f)
        if h or p:
            print(f"{f}: {h} heading changes, {p} prose-line changes")
        total_h += h
        total_p += p
    print(f"\nTotal: {total_h} heading changes, {total_p} prose-line changes across {len(targets)} files")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

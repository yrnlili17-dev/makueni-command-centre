#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${1:-$HOME/Projects/makueni-command-centre}"
FRONTEND="$PROJECT_ROOT/artifacts/commandcentre"
SRC="$FRONTEND/src"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$PROJECT_ROOT/.responsive-backup-$STAMP"

echo "== Responsive retrofit =="
echo "Project: $PROJECT_ROOT"

if [[ ! -d "$SRC" ]]; then
  echo "[FAILED] Frontend source not found: $SRC" >&2
  exit 1
fi

mkdir -p "$BACKUP"

CSS_FILE=""
for candidate in \
  "$SRC/index.css" \
  "$SRC/main.css" \
  "$SRC/app.css" \
  "$SRC/styles.css"
do
  if [[ -f "$candidate" ]]; then
    CSS_FILE="$candidate"
    break
  fi
done

if [[ -z "$CSS_FILE" ]]; then
  CSS_FILE="$(find "$SRC" -maxdepth 3 -type f -name '*.css' | head -1 || true)"
fi

if [[ -z "$CSS_FILE" ]]; then
  echo "[FAILED] Could not locate the main frontend CSS file." >&2
  exit 1
fi

OVERRIDES="$SRC/responsive-command-centre.css"

cp "$CSS_FILE" "$BACKUP/$(basename "$CSS_FILE")"
[[ -f "$OVERRIDES" ]] && cp "$OVERRIDES" "$BACKUP/responsive-command-centre.css"

cat > "$OVERRIDES" <<'CSS'
/*
 * Cross-device safety layer for the Makueni Command Centre.
 * Covers phones, tablets, laptops, desktops and command-centre megascreens.
 */

/* Prevent page-level horizontal overflow caused by wide command widgets. */
html,
body,
#root {
  width: 100%;
  min-width: 0;
  overflow-x: hidden;
}

main,
section,
article,
header,
footer,
nav,
div {
  min-width: 0;
}

/* Media, charts and embedded content must remain inside their containers. */
img,
svg,
canvas,
video,
iframe {
  max-width: 100%;
}

/* Wide operational tables remain usable on touch devices. */
.overflow-x-auto,
.overflow-auto {
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

table {
  border-collapse: collapse;
}

/* Touch-friendly controls on phones and tablets. */
@media (max-width: 1023px) {
  button,
  a[role="button"],
  input,
  select,
  textarea {
    min-height: 40px;
  }

  input,
  select,
  textarea {
    max-width: 100%;
  }

  .sticky {
    max-width: 100vw;
  }
}

/* Phone layout: collapse dense fixed grids to one column. */
@media (max-width: 639px) {
  .grid-cols-8,
  .grid-cols-7,
  .grid-cols-6,
  .grid-cols-5,
  .grid-cols-4,
  .grid-cols-3,
  .grid-cols-2 {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .gap-1,
  .gap-2,
  .gap-3,
  .gap-4,
  .gap-5,
  .gap-6 {
    row-gap: 0.75rem;
  }

  .p-5,
  .p-6,
  .p-8 {
    padding: 1rem !important;
  }

  .px-4,
  .px-5,
  .px-6,
  .px-8 {
    padding-left: 0.875rem !important;
    padding-right: 0.875rem !important;
  }

  .text-6xl {
    font-size: 2.75rem !important;
    line-height: 1 !important;
  }

  .text-5xl {
    font-size: 2.25rem !important;
    line-height: 1.05 !important;
  }

  .text-4xl {
    font-size: 1.875rem !important;
  }

  /* Preserve tables while allowing horizontal scrolling. */
  table {
    min-width: 720px;
  }
}

/* Tablets: dense KPI rows become two-column layouts. */
@media (min-width: 640px) and (max-width: 1023px) {
  .grid-cols-8,
  .grid-cols-7,
  .grid-cols-6,
  .grid-cols-5,
  .grid-cols-4 {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .grid-cols-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

/* Standard laptop range: prevent oversized fixed KPI rows. */
@media (min-width: 1024px) and (max-width: 1439px) {
  .grid-cols-8,
  .grid-cols-7,
  .grid-cols-6 {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  }
}

/* Large desktops and command-centre displays. */
@media (min-width: 1920px) {
  body {
    font-size: 17px;
  }

  main {
    width: 100%;
    max-width: none !important;
  }

  .max-w-7xl,
  .max-w-screen-xl,
  .max-w-screen-2xl {
    max-width: none !important;
  }

  .text-\[7px\] {
    font-size: 10px !important;
  }

  .text-\[8px\] {
    font-size: 11px !important;
  }

  .text-\[9px\] {
    font-size: 12px !important;
  }

  .text-\[10px\] {
    font-size: 13px !important;
  }

  .text-xs {
    font-size: 0.875rem !important;
  }
}

/* Very large wallboards / megascreens. */
@media (min-width: 2560px) {
  body {
    font-size: 19px;
  }

  .p-3 {
    padding: 1rem !important;
  }

  .p-4 {
    padding: 1.25rem !important;
  }

  .gap-2 {
    gap: 0.75rem !important;
  }

  .gap-3 {
    gap: 1rem !important;
  }

  .gap-4 {
    gap: 1.25rem !important;
  }
}
CSS

IMPORT_LINE='@import "./responsive-command-centre.css";'

if ! grep -Fq "$IMPORT_LINE" "$CSS_FILE"; then
  printf '\n%s\n' "$IMPORT_LINE" >> "$CSS_FILE"
fi

# Add responsive overflow wrappers around plain tables only where a wrapper
# does not already appear immediately before the table.
python3 - "$SRC" "$BACKUP" <<'PY'
from pathlib import Path
import re
import shutil
import sys

src = Path(sys.argv[1])
backup = Path(sys.argv[2])

targets = [
    src / "pages/strategist.tsx",
    src / "pages/executive-command.tsx",
    src / "pages/war-room.tsx",
    src / "pages/election-war-room.tsx",
    src / "pages/turnout.tsx",
]

targets += list((src / "components/strategist").glob("*.tsx"))
targets += list((src / "components/analytics").glob("*.tsx"))
targets += list((src / "components/war-room").glob("*.tsx"))
targets += list((src / "components/election").glob("*.tsx"))
targets += list((src / "components/gotv").glob("*.tsx"))

replacements = {
    "grid grid-cols-8 gap-": "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-",
    "grid grid-cols-7 gap-": "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-",
    "grid grid-cols-6 gap-": "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-",
    "grid grid-cols-5 gap-": "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-",
    "grid grid-cols-4 gap-": "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-",
    "grid grid-cols-3 gap-": "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-",
}

changed = []

for path in sorted(set(targets)):
    if not path.is_file():
        continue

    original = path.read_text()
    text = original

    for old, new in replacements.items():
        # Do not duplicate responsive classes in files already patched.
        if old in text and new not in text:
            text = text.replace(old, new)

    # Improve common rigid headers.
    text = text.replace(
        'className="flex items-center justify-between"',
        'className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"',
    )

    if text != original:
        destination = backup / path.relative_to(src)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, destination)
        path.write_text(text)
        changed.append(str(path))

print(f"[OK] Responsive class updates: {len(changed)} file(s)")
for item in changed:
    print(f"  {item}")
PY

echo
echo "== Responsive audit =="

python3 - "$SRC" <<'PY'
from pathlib import Path
import re
import sys

src = Path(sys.argv[1])
patterns = {
    "fixed width": re.compile(r"\bw-\[(?:[5-9]\d\d|\d{4,})px\]"),
    "fixed min-width": re.compile(r"\bmin-w-\[(?:[8-9]\d\d|\d{4,})px\]"),
    "dense fixed grid": re.compile(r"\bgrid-cols-[5-9]\b"),
}

findings = 0
for path in src.rglob("*.tsx"):
    text = path.read_text(errors="ignore")
    for label, pattern in patterns.items():
        for match in pattern.finditer(text):
            line = text.count("\n", 0, match.start()) + 1
            print(f"[AUDIT] {label}: {path}:{line}: {match.group(0)}")
            findings += 1

print(f"[AUDIT] Total findings: {findings}")
PY

echo
echo "== Build verification =="

cd "$PROJECT_ROOT"

PORT=5173 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build

echo
echo "[OK] Responsive retrofit completed."
echo "Backup: $BACKUP"
echo
echo "Test at:"
echo "  Phone:       375 x 812"
echo "  Tablet:      768 x 1024"
echo "  Laptop:      1366 x 768"
echo "  Desktop:     1920 x 1080"
echo "  Megascreen:  2560 x 1440"

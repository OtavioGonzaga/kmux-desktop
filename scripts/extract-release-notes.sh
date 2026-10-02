#!/usr/bin/env bash
set -euo pipefail

version="${1:?usage: extract-release-notes.sh VERSION [CHANGELOG.md]}"
changelog="${2:-CHANGELOG.md}"
grep -Fq "## [$version]" "$changelog" || {
  printf 'extract-release-notes: CHANGELOG.md has no %s section\n' "$version" >&2
  exit 1
}
awk -v heading="## [$version]" 'index($0, heading) == 1 { active=1; next } active && /^## \[/ { exit } active { print }' "$changelog"

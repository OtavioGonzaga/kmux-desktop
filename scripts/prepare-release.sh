#!/usr/bin/env bash
set -euo pipefail

root="$(pwd)"
date="$(date -u +%F)"
if [[ ${1:-} == "--root" ]]; then root="$2"; shift 2; fi
if [[ ${1:-} == "--date" ]]; then date="$2"; shift 2; fi
version="${1:?usage: prepare-release.sh [--root PATH] [--date YYYY-MM-DD] VERSION}"

validate_version() {
  [[ "$1" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-([0-9A-Za-z-]+\.)*[0-9A-Za-z-]+)?$ ]] || return 1
  if [[ "$1" == *-* ]]; then
    local identifier
    IFS=. read -r -a identifiers <<< "${1#*-}"
    for identifier in "${identifiers[@]}"; do [[ ! "$identifier" =~ ^0[0-9]+$ ]] || return 1; done
  fi
}
validate_version "$version" || {
  printf '%s\n' "prepare-release: version must be SemVer without a v prefix or build metadata" >&2
  exit 1
}

package_json="$root/package.json"
cargo_toml="$root/src-tauri/Cargo.toml"
cargo_lock="$root/src-tauri/Cargo.lock"
tauri_config="$root/src-tauri/tauri.conf.json"
changelog="$root/CHANGELOG.md"
for file in "$package_json" "$cargo_toml" "$cargo_lock" "$tauri_config" "$changelog"; do
  test -f "$file" || { printf 'prepare-release: missing %s\n' "$file" >&2; exit 1; }
done
if [[ -f "$root/bun.lock" ]] && grep -Eq '"workspaces"|"version"' "$root/bun.lock"; then
  bun_lock="$root/bun.lock"
else
  bun_lock=""
fi

current="$(python3 - "$package_json" "$cargo_toml" "$tauri_config" <<'PY'
import json, pathlib, re, sys
package = json.load(open(sys.argv[1]))["version"]
toml = pathlib.Path(sys.argv[2]).read_text()
match = re.search(r"(?ms)^\[package\]\n.*?^version\s*=\s*\"([^\"]+)\"", toml)
tauri = json.load(open(sys.argv[3]))["version"]
if not match or len({package, match.group(1), tauri}) != 1:
    raise SystemExit("versions in package.json, Cargo.toml, and tauri.conf.json must agree")
print(package)
PY
)"

semver_less() {
  python3 - "$1" "$2" <<'PY'
import sys
def key(value):
    core, *pre = value.split('-', 1)
    ids = [] if not pre else pre[0].split('.')
    return tuple(map(int, core.split('.'))), ids
def less(left, right):
    left_core, left_pre = key(left); right_core, right_pre = key(right)
    if left_core != right_core: return left_core < right_core
    if not left_pre or not right_pre: return bool(left_pre) and not bool(right_pre)
    for a, b in zip(left_pre, right_pre):
        if a == b: continue
        if a.isdigit() and b.isdigit(): return int(a) < int(b)
        if a.isdigit() != b.isdigit(): return a.isdigit()
        return a < b
    return len(left_pre) < len(right_pre)
sys.exit(0 if less(sys.argv[1], sys.argv[2]) else 1)
PY
}
if semver_less "$version" "$current"; then
  printf 'prepare-release: release version is lower than current version %s\n' "$current" >&2
  exit 1
fi
if git -C "$root" rev-parse -q --verify "refs/tags/v$version" >/dev/null; then
  printf 'prepare-release: tag v%s already exists; use release recovery instead\n' "$version" >&2
  exit 1
fi
grep -Fqx '## [Unreleased]' "$changelog" || { printf '%s\n' 'prepare-release: CHANGELOG.md has no [Unreleased] section' >&2; exit 1; }
grep -Fq "## [$version]" "$changelog" && { printf 'prepare-release: CHANGELOG.md already contains %s\n' "$version" >&2; exit 1; }
body="$(awk '/^## \[Unreleased\]$/ { active=1; next } active && /^## \[/ { exit } active { print }' "$changelog")"
grep -Eq '^- +[^[:space:]]' <<< "$body" || { printf '%s\n' 'prepare-release: CHANGELOG.md [Unreleased] has no changes' >&2; exit 1; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
python3 - "$package_json" "$cargo_toml" "$cargo_lock" "$tauri_config" "$changelog" "$tmp" "$version" "$date" "$bun_lock" <<'PY'
import json, pathlib, re, sys
package_json, cargo_toml, cargo_lock, tauri_config, changelog, tmp = map(pathlib.Path, sys.argv[1:7])
version, date = sys.argv[7:9]
bun_lock = pathlib.Path(sys.argv[9]) if sys.argv[9] else None
def replace_package_version(text, name):
    pattern = rf'(?ms)(^\[\[package\]\]\n(?:(?!^\[\[package\]\]).)*?^name = "{re.escape(name)}"\n)(.*?^version = ")[^"]+(".*?)(?=^\[\[package\]\]|\Z)'
    updated, count = re.subn(pattern, rf'\g<1>\g<2>{version}\g<3>', text)
    if count != 1: raise SystemExit(f"could not update {name} version in Cargo.lock")
    return updated
package = json.loads(package_json.read_text()); package['version'] = version
(tmp / 'package.json').write_text(json.dumps(package, indent=2) + '\n')
toml = cargo_toml.read_text()
toml, count = re.subn(r'(?ms)(^\[package\]\n.*?^version\s*=\s*")[^"]+(".*?$)', rf'\g<1>{version}\2', toml, count=1)
if count != 1: raise SystemExit('could not update [package].version in Cargo.toml')
(tmp / 'Cargo.toml').write_text(toml)
(tmp / 'Cargo.lock').write_text(replace_package_version(cargo_lock.read_text(), 'kmux-desktop'))
tauri = json.loads(tauri_config.read_text()); tauri['version'] = version
(tmp / 'tauri.conf.json').write_text(json.dumps(tauri, indent=2) + '\n')
text = changelog.read_text(); marker = '## [Unreleased]\n'
(tmp / 'CHANGELOG.md').write_text(text.replace(marker, f'{marker}\n## [{version}] - {date}\n', 1))
if bun_lock:
    lock_text = bun_lock.read_text()
    updated, count = re.subn(
        r'(?s)("workspaces"\s*:\s*\{\s*""\s*:\s*\{.*?"version"\s*:\s*")[^"]+(".*?\}\s*\}\s*,\s*"packages")',
        rf'\g<1>{version}\g<2>',
        lock_text,
        count=1,
    )
    if count:
        (tmp / 'bun.lock').write_text(updated)
PY
mv "$tmp/package.json" "$package_json"
mv "$tmp/Cargo.toml" "$cargo_toml"
mv "$tmp/Cargo.lock" "$cargo_lock"
mv "$tmp/tauri.conf.json" "$tauri_config"
mv "$tmp/CHANGELOG.md" "$changelog"
if [[ -f "$tmp/bun.lock" ]]; then mv "$tmp/bun.lock" "$root/bun.lock"; fi

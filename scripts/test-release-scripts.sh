#!/usr/bin/env bash
set -euo pipefail

root="$(mktemp -d)"
trap 'rm -rf "$root"' EXIT
mkdir -p "$root/src-tauri"
cat > "$root/package.json" <<'EOF'
{"name":"kmux-desktop","version":"0.1.0"}
EOF
cat > "$root/src-tauri/Cargo.toml" <<'EOF'
[package]
name = "kmux-desktop"
version = "0.1.0"
EOF
cat > "$root/src-tauri/Cargo.lock" <<'EOF'
version = 4

[[package]]
name = "kmux-desktop"
version = "0.1.0"
EOF
cat > "$root/src-tauri/tauri.conf.json" <<'EOF'
{"version":"0.1.0"}
EOF
cat > "$root/bun.lock" <<'EOF'
{
  "workspaces": {
    "": {
      "name": "kmux-desktop",
      "version": "0.1.0"
    }
  },
  "packages": {}
}
EOF
cat > "$root/CHANGELOG.md" <<'EOF'
# Changelog

## [Unreleased]

### Added

- Change
EOF
git -C "$root" init --quiet
git -C "$root" config user.email test@example.invalid
git -C "$root" config user.name Test
git -C "$root" add .
git -C "$root" commit --quiet -m initial

bash scripts/prepare-release.sh --root "$root" --date 2026-10-02 0.2.0
for file in package.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json; do grep -Fq '0.2.0' "$root/$file"; done
grep -Fq '"version": "0.2.0"' "$root/bun.lock"
grep -Fq '## [0.2.0] - 2026-10-02' "$root/CHANGELOG.md"
changed="$(git -C "$root" diff --name-only)"
test "$(wc -l <<< "$changed")" = 6
for file in CHANGELOG.md bun.lock package.json src-tauri/Cargo.lock src-tauri/Cargo.toml src-tauri/tauri.conf.json; do grep -Fxq "$file" <<< "$changed"; done
test "$(bash scripts/extract-release-notes.sh 0.2.0 "$root/CHANGELOG.md")" = $'\n### Added\n\n- Change'
if bash scripts/extract-release-notes.sh 0.3.0 "$root/CHANGELOG.md"; then exit 1; fi

test "$(bash scripts/release-state.sh --root "$root" --main-ref HEAD 0.3.0 | grep '^recovery_action=')" = 'recovery_action=prepare'
git -C "$root" add .
git -C "$root" commit --quiet -m 'chore(release): v0.2.0'
release_sha="$(git -C "$root" rev-parse HEAD)"
state="$(bash scripts/release-state.sh --root "$root" --main-ref HEAD --github-release-state absent 0.2.0)"
grep -Fxq "release_commit_sha=$release_sha" <<< "$state"
grep -Fxq 'prepared=true' <<< "$state"
grep -Fxq 'tag_state=missing' <<< "$state"
grep -Fxq 'recovery_action=build-and-publish' <<< "$state"
git -C "$root" tag --annotate v0.2.0 --message 'Release v0.2.0'
test "$(bash scripts/release-state.sh --root "$root" --main-ref HEAD --github-release-state absent 0.2.0 | grep '^recovery_action=')" = 'recovery_action=create-release'
test "$(bash scripts/release-state.sh --root "$root" --main-ref HEAD --github-release-state draft 0.2.0 | grep '^recovery_action=')" = 'recovery_action=publish-draft'
test "$(bash scripts/release-state.sh --root "$root" --main-ref HEAD --github-release-state published 0.2.0 | grep '^recovery_action=')" = 'recovery_action=verify-public-release'

if bash scripts/prepare-release.sh --root "$root" 0.1.0; then exit 1; fi
if bash scripts/prepare-release.sh --root "$root" v0.3.0; then exit 1; fi
if bash scripts/prepare-release.sh --root "$root" 1.0.0-alpha.01; then exit 1; fi
if bash scripts/prepare-release.sh --root "$root" 0.2.0; then exit 1; fi

git -C "$root" tag v0.3.0
if bash scripts/prepare-release.sh --root "$root" 0.3.0; then exit 1; fi
sed -i 's/0.2.0/1.0.0-beta.2/g' "$root/package.json" "$root/src-tauri/Cargo.toml" "$root/src-tauri/Cargo.lock" "$root/src-tauri/tauri.conf.json"
cat > "$root/CHANGELOG.md" <<'EOF'
## [Unreleased]

### Added

- Prerelease change
EOF
bash scripts/prepare-release.sh --root "$root" 1.0.0-beta.10
grep -Fq '1.0.0-beta.10' "$root/package.json"

cat > "$root/CHANGELOG.md" <<'EOF'
## [Unreleased]
EOF
if bash scripts/prepare-release.sh --root "$root" 1.0.0; then exit 1; fi

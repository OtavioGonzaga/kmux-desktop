#!/usr/bin/env bash
set -euo pipefail

root="$(pwd)"
main_ref="origin/main"
github_release_state="unknown"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --root) root="$2"; shift 2 ;;
    --main-ref) main_ref="$2"; shift 2 ;;
    --github-release-state) github_release_state="$2"; shift 2 ;;
    *) break ;;
  esac
done
version="${1:?usage: release-state.sh [--root PATH] [--main-ref REF] [--github-release-state STATE] VERSION}"
case "$github_release_state" in absent|draft|published|unknown) ;; *) exit 2 ;; esac
[[ "$version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-([0-9A-Za-z-]+\.)*[0-9A-Za-z-]+)?$ ]] || {
  printf '%s\n' 'release-state: version must be SemVer without a v prefix or build metadata' >&2; exit 1;
}
if [[ "$version" == *-* ]]; then
  IFS=. read -r -a prerelease_ids <<< "${version#*-}"
  for identifier in "${prerelease_ids[@]}"; do
    [[ ! "$identifier" =~ ^0[0-9]+$ ]] || { printf '%s\n' 'release-state: numeric prerelease identifiers cannot have leading zeroes' >&2; exit 1; }
  done
fi

has_release_files() {
  local commit="$1" expected="$2" package cargo lock tauri
  package="$(git -C "$root" show "$commit:package.json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["version"])')"
  cargo="$(git -C "$root" show "$commit:src-tauri/Cargo.toml" | python3 -c 'import re,sys; text=sys.stdin.read(); match=re.search(r"(?ms)^\[package\]\n.*?^version\s*=\s*\"([^\"]+)\"", text); print(match.group(1) if match else "")')"
  lock="$(git -C "$root" show "$commit:src-tauri/Cargo.lock" | python3 -c 'import re,sys; text=sys.stdin.read(); match=re.search(r"(?ms)^\[\[package\]\]\n(?:(?!^\[\[package\]\]).)*?^name = \"kmux-desktop\"\n.*?^version = \"([^\"]+)\"", text); print(match.group(1) if match else "")')"
  tauri="$(git -C "$root" show "$commit:src-tauri/tauri.conf.json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["version"])')"
  [[ "$package" == "$expected" && "$cargo" == "$expected" && "$lock" == "$expected" && "$tauri" == "$expected" ]]
}

release_commit=""
while IFS= read -r candidate; do
  [[ "$(git -C "$root" log -1 --format=%s "$candidate")" == "chore(release): v$version" ]] || continue
  has_release_files "$candidate" "$version" || continue
  git -C "$root" show "$candidate:CHANGELOG.md" | grep -Fq "## [$version]" || continue
  git -C "$root" merge-base --is-ancestor "$candidate" "$main_ref" || continue
  release_commit="$candidate"; break
done < <(git -C "$root" rev-list "$main_ref")

tag_state="missing"
if git -C "$root" rev-parse -q --verify "refs/tags/v$version" >/dev/null; then
  [[ "$(git -C "$root" cat-file -t "refs/tags/v$version")" == tag ]] || { printf '%s\n' 'release-state: release tag is not annotated' >&2; exit 1; }
  [[ -n "$release_commit" && "$(git -C "$root" rev-parse "v$version^{}")" == "$release_commit" ]] || { printf '%s\n' 'release-state: release tag does not point to the matching release commit' >&2; exit 1; }
  tag_state="correct"
fi
if [[ -z "$release_commit" ]]; then recovery_action="prepare"
elif [[ "$github_release_state" == published ]]; then recovery_action="verify-public-release"
elif [[ "$github_release_state" == draft ]]; then recovery_action="publish-draft"
elif [[ "$tag_state" == missing ]]; then recovery_action="build-and-publish"
else recovery_action="create-release"; fi
printf 'release_commit_sha=%s\nprepared=%s\ntag_state=%s\ngithub_release_state=%s\nrecovery_action=%s\n' "$release_commit" "$([[ -n "$release_commit" ]] && printf true || printf false)" "$tag_state" "$github_release_state" "$recovery_action"

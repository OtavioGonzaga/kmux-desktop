# Releasing

Releases are SemVer versions created from `main` by the manual `Create Release`
GitHub Actions workflow. Do not modify published release artifacts manually.

## Before Starting

1. Ensure all release changes are merged into `main`.
2. Record notable changes under `[Unreleased]` in `CHANGELOG.md`.
3. Run the frontend, Rust, and release-script checks from CI.

## Workflow

In GitHub Actions, run `Create Release` from the current `main` branch and enter
`VERSION` without a `v` prefix or build metadata. The workflow runs CI, creates
`chore(release): vVERSION`, synchronizes every application manifest, builds and
validates Linux x86_64 `.deb`, `.AppImage`, and `.rpm` bundles, produces
checksums, creates an annotated tag, and publishes the GitHub Release.

Prerelease versions are allowed and are marked as prereleases on GitHub.

## Recovery And Immutability

Rerun the workflow with the same version after an interrupted run. It detects a
prepared release commit, annotated tag, and draft or published GitHub Release,
then resumes the safe remaining step. Published tags, assets, and releases are
immutable: publish a corrective SemVer release instead.

# Pull Request

## Description

<!-- Clearly describe the change and the problem it solves. -->

## Type

- [ ] Bug fix
- [ ] Feature
- [ ] Refactor
- [ ] Tests
- [ ] Documentation
- [ ] Chore
- [ ] Security

## Related Links

- Issue:
- Other context:

## Checklist

- [ ] Targets `main`
- [ ] Does not change application versions outside release preparation
- [ ] Updates `CHANGELOG.md` under `[Unreleased]`, or no entry is needed
- [ ] `bun run format:check`, `bun run lint`, `bun run check`, `bun run test`, and `bun run build` pass
- [ ] `cargo fmt --check --manifest-path src-tauri/Cargo.toml` passes
- [ ] `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` passes
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml --locked` passes
- [ ] Does not expose sensitive data
- [ ] Does not add unnecessary dependencies

## Evidence

<!-- Include relevant command output, test results, or other verification. -->

## Additional Notes

<!-- Include rollout, compatibility, or follow-up information when applicable. -->

# kmux Desktop

A Linux desktop application for viewing the public-identity catalog from
[`kmux`](https://github.com/OtavioGonzaga/kmux). This first stage provides the
Tauri 2 + Svelte 5 foundation and a read-only catalog view.

## Requirements

- Bun 1.4.2 (JavaScript runtime and package manager)
- Stable Rust and Cargo
- Tauri Linux build dependencies. On Debian/Ubuntu:

  ```sh
  sudo apt install build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev libwebkit2gtk-4.1-dev libxdo-dev pkg-config libdbus-1-dev
  ```

## Development

```sh
bun install
bun run tauri dev
```

The desktop reads the configuration discovered by the kmux library: `KMUX_CONFIG`
first, when available in the process environment; otherwise, the default XDG path.
It does not create a configuration file automatically. If no file is found, the
interface explains how to create or select one with the `kmux` CLI.

## Checks

```sh
bun run check
bun run test
bun run build
cargo fmt --check --manifest-path src-tauri/Cargo.toml
```

## License and releases

This project is licensed under the MIT License; see [`LICENSE`](LICENSE).
Notable changes are tracked in [`CHANGELOG.md`](CHANGELOG.md) using Keep a
Changelog. Application versions follow Semantic Versioning and are kept in sync
across the JavaScript package, Rust crate, and Tauri bundle configuration.

The Rust crate uses `ssh-kmux` `0.4.0` from crates.io, pinned to an exact version
in the manifest and recorded in `src-tauri/Cargo.lock`. The frontend receives
catalog DTOs only. Private keys and raw key blobs are never sent to the frontend.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add a React + Vite (SWC) frontend for the Tauri 2 desktop application.
- Add localized interface translations for pt-BR, en-US, es, and de, with
  system-language detection and an English fallback.
- Add system, light, and dark appearance preferences and a settings panel.
- Add Oxlint and Oxfmt checks, formatting scripts, and Zed editor integration.
- Add the kmux logo to project documentation and use its icon in the desktop app.
- Add a light kmux logo variant for dark-mode UI surfaces.
- Simplify the desktop header and sidebar by removing unused status and profile controls.
- Align identity agents consistently on the right side of catalog cards.
- Remove unused catalog disclaimer and help control from the interface.
- Add a read-only view of the kmux identity catalog, including search and
  identity details.
- Add the MIT license and release/versioning guidance.

### Changed

- Remove unused legacy static assets from the previous frontend scaffold.

- Load `ssh-kmux` version `0.4.0` from crates.io rather than from Git.
- Document Bun setup, development commands, and project checks.

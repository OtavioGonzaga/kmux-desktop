# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add a React + Vite frontend for the Tauri 2 desktop application.
- Add localized interface translations for pt-BR, en-US, es, and de, with
  system-language detection and an English fallback.
- Add system, light, and dark appearance preferences and a settings panel.
- Add Oxlint and Oxfmt checks, formatting scripts, and Zed editor integration.
- Add the kmux logo to project documentation and use its icon in the desktop app.
- Add a light kmux logo variant for dark-mode UI surfaces.
- Simplify the desktop header and sidebar by removing unused status and profile controls.
- Align identity agents consistently on the right side of catalog cards.
- Remove unused catalog disclaimer and help control from the interface.
- Add a searchable view of the kmux identity catalog, including identity
  details.
- Add SSH agent inspection and administration, plus identity registration,
  metadata editing with revision conflicts, and removal.
- Add bulk registration for the public identities an agent advertises but that
  are not yet in the catalog.
- Add the MIT license and release/versioning guidance.

### Changed

- Remove unused legacy static assets from the previous frontend scaffold.
- Pin `ssh-kmux` to the current kmux Git revision to use its transactional
  management and versioned configuration APIs.
- Use neutral dark-theme styles for standard buttons and align identity-detail
  actions with the other detail content.

- Document Bun setup, development commands, and project checks.

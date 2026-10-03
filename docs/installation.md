# Installation

kmux Desktop is currently supported on Linux x86_64. Download release assets
from the [latest GitHub Release](https://github.com/OtavioGonzaga/kmux-desktop/releases/latest).

## Debian Or Ubuntu

Download `kmux-desktop_<version>_amd64.deb` and install it with APT so runtime
dependencies are resolved automatically:

```bash
sudo apt install ./kmux-desktop_<version>_amd64.deb
```

Upgrade by installing a newer package. Remove it with:

```bash
sudo apt remove kmux-desktop
```

## Fedora Or RPM-Based Distributions

Download `kmux-desktop-<version>-1.x86_64.rpm` and install it with DNF:

```bash
sudo dnf install ./kmux-desktop-<version>-1.x86_64.rpm
```

Install a newer package to upgrade. Remove it with `sudo dnf remove kmux-desktop`.

## AppImage

Download `kmux-desktop_<version>_x86_64.AppImage`, mark it executable, and run
it directly:

```bash
chmod +x kmux-desktop_<version>_x86_64.AppImage
./kmux-desktop_<version>_x86_64.AppImage
```

The AppImage is not installed system-wide. Replace the file to update it or
delete it to remove it.

## Verify Downloads

Download the bundle and `SHA256SUMS` from the same release, then run:

```bash
sha256sum -c SHA256SUMS --ignore-missing
```

## Build From Source

Install the [requirements in the README](../README.md#requirements), then:

```bash
git clone https://github.com/OtavioGonzaga/kmux-desktop.git
cd kmux-desktop
bun install --frozen-lockfile
bun run tauri build
```

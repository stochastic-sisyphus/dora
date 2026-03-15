# GitHub Actions Workflows

## Release Workflow

The release workflow builds Dora for all platforms and creates a GitHub release.

### Triggers

1. **Automatic**: Push a tag (e.g., `git tag v0.5.1 && git push origin v0.5.1`)
2. **Manual**: Go to Actions > Release > Run workflow, enter version number

### Platforms Built

- **macOS Intel** (x86_64-apple-darwin) - DMG and APP
- **macOS Apple Silicon** (aarch64-apple-darwin) - DMG and APP
- **Windows** (x86_64-pc-windows-msvc) - MSI and NSIS installer
- **Linux** (x86_64-unknown-linux-gnu) - DEB and AppImage

### Required Secrets

Set these in GitHub repository settings > Secrets and variables > Actions:

| Secret | Description |
|--------|-------------|
| `TAURI_PRIVATE_KEY` | Tauri signing key (base64 encoded) |
| `TAURI_KEY_PASSWORD` | Password for the signing key |

### Generate Tauri Signing Key

```bash
# Generate a new key
pnpm tauri signer generate

# This creates:
# - src-tauri/sign.key (private key - KEEP SECRET)
# - src-tauri/sign.key.pub (public key - commit to repo)

# Encode private key for GitHub secret
base64 -i src-tauri/sign.key | pbcopy

# Add to GitHub secrets as TAURI_PRIVATE_KEY
# Add password as TAURI_KEY_PASSWORD
```

### Manual Release Steps

1. Update version in:
   - `package.json`
   - `src-tauri/tauri.conf.json`

2. Commit and push:
   ```bash
   git add .
   git commit -m "release: v0.5.1

Co-authored-by: Qwen-Coder <qwen-coder@alibabacloud.com>"
   git tag v0.5.1
   git push origin main v0.5.1
   ```

3. Or use workflow dispatch:
   - Go to Actions tab
   - Select "Release" workflow
   - Click "Run workflow"
   - Enter version number (e.g., `0.5.1`)
   - Click "Run workflow"

### Artifacts

After build completes, artifacts are available:
- In GitHub Actions run (download individually)
- In GitHub Release page (organized by platform)

### Build Times

Approximate build times per platform:
- macOS Intel: ~15 minutes
- macOS ARM: ~15 minutes
- Windows: ~10 minutes
- Linux: ~12 minutes

Total workflow time: ~20 minutes (parallel builds)

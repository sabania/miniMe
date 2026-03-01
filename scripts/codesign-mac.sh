#!/usr/bin/env bash
# Sign a macOS Electron .app bundle with consistent ad-hoc identity.
# Signs from inside out: frameworks → helpers → app bundle.
# Usage: ./scripts/codesign-mac.sh dist/mac-arm64/miniMe.app

set -euo pipefail

APP="${1:?Usage: $0 <path/to/App.app>}"
ENTITLEMENTS="$(dirname "$0")/../build/entitlements.mac.plist"
IDENTITY="${SIGN_IDENTITY:--}"

if [ ! -d "$APP" ]; then
  echo "Error: $APP not found" >&2
  exit 1
fi

echo "[codesign] Signing $APP with identity '$IDENTITY'"

# 1. Sign all individual binaries and dylibs inside Frameworks
find "$APP/Contents/Frameworks" \( -type f -perm +111 -o -name "*.dylib" \) | while read -r f; do
  codesign --force --sign "$IDENTITY" --timestamp=none "$f" 2>/dev/null || true
done

# 2. Sign framework bundles
find "$APP/Contents/Frameworks" -name "*.framework" -type d | while read -r f; do
  codesign --force --sign "$IDENTITY" --timestamp=none "$f" 2>/dev/null || true
done

# 3. Sign helper apps
find "$APP/Contents/Frameworks" -name "*.app" -type d | while read -r f; do
  codesign --force --sign "$IDENTITY" --timestamp=none --entitlements "$ENTITLEMENTS" "$f" 2>/dev/null || true
done

# 4. Sign the main app bundle
codesign --force --sign "$IDENTITY" --timestamp=none --entitlements "$ENTITLEMENTS" "$APP"

# 5. Verify
codesign --verify --deep --strict "$APP"
echo "[codesign] Done — signature verified"

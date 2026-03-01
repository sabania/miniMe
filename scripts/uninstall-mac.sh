#!/usr/bin/env bash
# Uninstall miniMe from macOS.
# Safely removes the app, data, and caches without touching symlinked project targets.

set -euo pipefail

APP_SUPPORT="$HOME/Library/Application Support/minime"
APP="/Applications/miniMe.app"

echo "miniMe macOS Uninstaller"
echo "========================"

# 1. Remove project symlinks (safe: only removes the link, not the target)
PROJECTS_DIR="$APP_SUPPORT/workspace/projects"
if [ -d "$PROJECTS_DIR" ]; then
  echo "Removing project symlinks..."
  find "$PROJECTS_DIR" -maxdepth 1 -type l -exec rm -v {} \;
fi

# 2. Remove login item
if [ -d "$APP" ]; then
  echo "Removing login item..."
  osascript -e "tell application \"System Events\" to delete login item \"miniMe\"" 2>/dev/null || true
fi

# 3. Remove app data
echo "Removing app data..."
rm -rf "$APP_SUPPORT"

# 4. Remove caches and preferences
rm -rf "$HOME/Library/Caches/minime"
rm -rf "$HOME/Library/Caches/miniMe"
rm -f "$HOME/Library/Preferences/com.minime.app.plist"
rm -rf "$HOME/Library/Saved Application State/com.minime.app.savedState"

# 5. Remove app
if [ -d "$APP" ]; then
  echo "Removing $APP..."
  rm -rf "$APP"
fi

echo ""
echo "miniMe has been uninstalled."
echo "Your project files were NOT touched — only the symlinks were removed."

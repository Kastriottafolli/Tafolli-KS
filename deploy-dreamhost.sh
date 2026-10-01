#!/usr/bin/env bash
# Upload the site to DreamHost over SSH.
#
#   ./deploy-dreamhost.sh
#
# Fill in the three values below once, then run this after every change.
# --delete removes files on the server that are no longer in the repo, so the
# live site always matches this directory exactly.
set -euo pipefail

DH_USER="CHANGE_ME"                  # DreamHost shell user
DH_HOST="CHANGE_ME.dreamhost.com"    # e.g. iad1-shared-a1-01.dreamhost.com
DH_PATH="~/www.tafolliglass.net"     # web directory created by the panel

SRC="$(cd "$(dirname "$0")" && pwd)/"

if [[ "$DH_USER" == "CHANGE_ME" ]]; then
  echo "Set DH_USER, DH_HOST and DH_PATH at the top of this script first." >&2
  exit 1
fi

echo "Uploading -> $DH_USER@$DH_HOST:$DH_PATH"
rsync -avz --delete \
      --exclude ".git/" \
      --exclude ".gitignore" \
      --exclude ".nojekyll" \
      --exclude "README.md" \
      --exclude "deploy-dreamhost.sh" \
      --exclude ".DS_Store" \
      "$SRC" "$DH_USER@$DH_HOST:$DH_PATH/"

echo "Done — https://www.tafolliglass.net/"

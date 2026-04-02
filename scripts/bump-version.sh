#!/usr/bin/env bash
# Версионирование пакета (аналогично подходу krit-ui: npm version … --no-git-tag-version).
# Использование:
#   ./scripts/bump-version.sh [patch|minor|major] [--git]
#   npm run version:bump -- minor
#   npm run version:bump -- patch --git
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LEVEL="patch"
DO_GIT=false

for arg in "$@"; do
  case "$arg" in
    patch | minor | major) LEVEL="$arg" ;;
    --git) DO_GIT=true ;;
    -h | --help)
      echo "Usage: $0 [patch|minor|major] [--git]"
      echo "  --git  после bump: git add package.json, commit и аннотированный тег vVERSION"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: $0 [patch|minor|major] [--git]" >&2
      exit 1
      ;;
  esac
done

npm version "$LEVEL" --no-git-tag-version

VERSION="$(node -p "require('./package.json').version")"
echo "krit-permissions version: $VERSION"

if [[ "$DO_GIT" == true ]]; then
  git add package.json
  git commit -m "chore: release v${VERSION}"
  git tag -a "v${VERSION}" -m "v${VERSION}"
  echo "Созданы commit и тег v${VERSION}. Отправка: git push origin main && git push origin v${VERSION}"
fi

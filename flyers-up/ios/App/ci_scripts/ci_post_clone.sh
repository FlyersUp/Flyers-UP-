#!/bin/sh
set -e

export HOMEBREW_NO_AUTO_UPDATE=1

if ! command -v npm >/dev/null 2>&1; then
  brew install node
fi

cd "$CI_PRIMARY_REPOSITORY_PATH/flyers-up"

npm ci
npm run build
npx cap sync ios

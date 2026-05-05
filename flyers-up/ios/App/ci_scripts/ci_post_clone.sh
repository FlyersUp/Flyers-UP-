#!/bin/sh
set -e

cd "$CI_PRIMARY_REPOSITORY_PATH/flyers-up"

npm ci
npm run build
npx cap sync ios

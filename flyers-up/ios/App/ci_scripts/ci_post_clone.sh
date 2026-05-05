#!/bin/sh
set -e

cd "$CI_WORKSPACE/flyers-up"

npm ci
npm run build
npx cap sync ios

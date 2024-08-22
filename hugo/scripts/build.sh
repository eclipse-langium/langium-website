#!/bin/bash
cd $(dirname "$0")/..
npm run build:static && npx cross-env NODE_ENV=${1} hugo --config config.toml -b ${2} -d ../public --gc --minify
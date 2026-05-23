#!/bin/bash
# Publish @sixtdreamnight/companion-engine to npm
# Usage: ./publish.sh <version>
# Requires: NPM_TOKEN env var or npm login

set -e

VERSION=${1:?"Usage: ./publish.sh <version> (e.g., 0.2.0)"}

# Update version
npm version "$VERSION" --no-git-tag-version

# Build check
npx tsc --noEmit

# Test
npx vitest run

echo ""
echo "Ready to publish v$VERSION to npm."
echo "Run: npm publish --access public"
echo "Or use GitHub tag: git tag v$VERSION && git push origin v$VERSION"

#!/bin/bash
# Configure git credentials from GITHUB_TOKEN if available
if [ -n "$GITHUB_TOKEN" ]; then
    git config --global credential.helper store
    echo "https://x-access-token:${GITHUB_TOKEN}@github.com" > ~/.git-credentials
    chmod 600 ~/.git-credentials

    # Authenticate gh CLI for PR creation/management
    echo "$GITHUB_TOKEN" | gh auth login --with-token 2>/dev/null
fi

# Override git identity from env vars if provided
[ -n "$GIT_AUTHOR_NAME" ] && git config --global user.name "$GIT_AUTHOR_NAME"
[ -n "$GIT_AUTHOR_EMAIL" ] && git config --global user.email "$GIT_AUTHOR_EMAIL"

exec claude --dangerously-skip-permissions "$@"

FROM node:22-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI globally
RUN npm install -g @anthropic/claude-code

# Create workspace directories
RUN mkdir -p /workspace /vault

WORKDIR /workspace

# Credentials will be mounted at runtime from host ~/.claude
# Entrypoint runs claude in non-interactive mode
ENTRYPOINT ["claude", "--dangerously-skip-permissions"]

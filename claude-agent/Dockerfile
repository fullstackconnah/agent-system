FROM node:22-slim

RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -m -s /bin/bash agent

# Install Claude Code as non-root user
USER agent
RUN curl -fsSL https://claude.ai/install.sh | bash
ENV PATH="/home/agent/.local/bin:$PATH"

# Create workspace directories
RUN mkdir -p /home/agent/workspace /home/agent/vault

WORKDIR /home/agent/workspace

ENTRYPOINT ["claude", "--dangerously-skip-permissions"]

FROM node:22-slim

RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Remove existing node user (UID 1000) and create agent user with UID 1000
# to match host file ownership (connah user)
RUN userdel -r node 2>/dev/null; \
    useradd -m -s /bin/bash -u 1000 agent

# Install Claude Code as non-root user
USER agent
RUN curl -fsSL https://claude.ai/install.sh | bash
ENV PATH="/home/agent/.local/bin:$PATH"

# Create workspace directories
RUN mkdir -p /home/agent/workspace /home/agent/vault

WORKDIR /home/agent/workspace

ENTRYPOINT ["claude", "--dangerously-skip-permissions"]

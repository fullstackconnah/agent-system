FROM node:22-slim

RUN apt-get update && apt-get install -y \
    git \
    curl \
    gpg \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
       | gpg --dearmor -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
       > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Remove existing node user (UID 1000) and create agent user with UID 1000
# to match host file ownership (connah user)
RUN userdel -r node 2>/dev/null; \
    useradd -m -s /bin/bash -u 1000 agent

# Install Claude Code as non-root user
USER agent
RUN curl -fsSL https://claude.ai/install.sh | bash
ENV PATH="/home/agent/.local/bin:$PATH"

# Git identity for commits made by the agent
RUN git config --global user.name "nexus-agent" && \
    git config --global user.email "agent@nexus.local" && \
    git config --global --add safe.directory '*'

# Create workspace directories
RUN mkdir -p /home/agent/workspace /home/agent/vault

WORKDIR /home/agent/workspace

# Entrypoint script: configure git credentials from GITHUB_TOKEN at runtime, then exec claude
COPY --chown=agent:agent entrypoint.sh /home/agent/entrypoint.sh
RUN chmod +x /home/agent/entrypoint.sh

ENTRYPOINT ["/home/agent/entrypoint.sh"]

#!/bin/bash
# bootstrap-server.sh
# Run once on your Ubuntu server as user 'connah'
# Usage: bash bootstrap-server.sh

set -e

echo ""
echo "=== Agent System Server Bootstrap ==="
echo ""

# --- 1. Create directories ---
echo "[ 1/5 ] Creating directories..."
mkdir -p /home/connah/obsidian-vault/AgentSystem/{tasks/{pending,in-progress,done,failed},memory,context,logs}
mkdir -p /home/connah/projects
mkdir -p /home/connah/agent-system

echo "       Vault structure created at /home/connah/obsidian-vault"
echo "       Projects directory at /home/connah/projects"

# --- 2. Install Node.js if not present ---
echo ""
echo "[ 2/5 ] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "       Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "       Node.js $(node --version) already installed"
fi

# --- 3. Install Claude Code CLI ---
echo ""
echo "[ 3/5 ] Installing Claude Code CLI..."
if ! command -v claude &> /dev/null; then
    npm install -g @anthropic/claude-code
    echo "       Claude Code installed: $(claude --version)"
else
    echo "       Claude Code already installed: $(claude --version)"
fi

# --- 4. Install Gemini CLI ---
echo ""
echo "[ 4/5 ] Installing Gemini CLI..."
if ! command -v gemini &> /dev/null; then
    npm install -g @google/gemini-cli
    echo "       Gemini CLI installed"
else
    echo "       Gemini CLI already installed"
fi

# --- 5. Build Docker image for Claude agents ---
echo ""
echo "[ 5/5 ] Building Claude agent Docker image..."
cd /home/connah/agent-system
docker build -t claude-agent:latest -f claude-agent/Dockerfile ./claude-agent
echo "       Image built: claude-agent:latest"

# --- Done ---
echo ""
echo "=== Bootstrap complete ==="
echo ""
echo "Next steps:"
echo "  1. Run sync-credentials.ps1 on your Windows desktop"
echo "  2. Verify credentials arrived:"
echo "       ls ~/.claude && ls ~/.gemini"
echo "  3. Start the orchestrator:"
echo "       cd /home/connah/agent-system && docker compose up -d"
echo "  4. Check it's running:"
echo "       curl http://localhost:3000/health"
echo ""

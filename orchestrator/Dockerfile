FROM node:22-slim AS client-build

WORKDIR /build
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npm run build

FROM node:22-slim

RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Gemini CLI globally
RUN npm install -g @google/gemini-cli

# Trust all git directories (orchestrator commits to mounted project repos)
RUN git config --global --add safe.directory '*'

WORKDIR /app

COPY package.json .
RUN npm install

COPY src/ ./src/

# Copy built React app into the public directory served by Express
COPY --from=client-build /build/dist ./src/public

EXPOSE 3000

CMD ["node", "src/index.js"]

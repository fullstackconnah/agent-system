FROM node:22-slim

RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Gemini CLI globally
RUN npm install -g @google/gemini-cli

WORKDIR /app

COPY package.json .
RUN npm install

COPY src/ ./src/

EXPOSE 3000

CMD ["node", "src/index.js"]

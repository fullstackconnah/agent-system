# Stage 0: Build React UI
FROM node:22-slim AS ui-builder
WORKDIR /ui
COPY orchestrator/client/package*.json ./
RUN npm ci
COPY orchestrator/client/ .
RUN npm run build

# Stage 1: Build .NET API
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY nexus-api/NexusApi/NexusApi.csproj NexusApi/
RUN dotnet restore NexusApi/NexusApi.csproj
COPY nexus-api/ .
WORKDIR /src/NexusApi
RUN dotnet publish -c Release -o /app/publish --no-restore

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .
COPY --from=ui-builder /ui/dist ./wwwroot

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "NexusApi.dll"]

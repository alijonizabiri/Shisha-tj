# ── Build stage ──────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
WORKDIR /src

# Restore deps first (layer cache — only invalidated when .csproj files change)
COPY src/Shisha.Domain/Shisha.Domain.csproj             src/Shisha.Domain/
COPY src/Shisha.Application/Shisha.Application.csproj   src/Shisha.Application/
COPY src/Shisha.Infrastructure/Shisha.Infrastructure.csproj src/Shisha.Infrastructure/
COPY src/Shisha.Api/Shisha.Api.csproj                   src/Shisha.Api/
RUN dotnet restore src/Shisha.Api/Shisha.Api.csproj --runtime linux-musl-x64

COPY src/ src/
RUN dotnet publish src/Shisha.Api/Shisha.Api.csproj \
    -c Release \
    -r linux-musl-x64 \
    --self-contained false \
    --no-restore \
    -o /app/publish

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=build --chown=appuser:appgroup /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Shisha.Api.dll"]

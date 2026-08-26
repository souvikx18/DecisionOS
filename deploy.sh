#!/usr/bin/env bash
# ============================================================
# DecisionOS — Automated Production Deployment Script
# ============================================================
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
# ============================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}      🚀 DecisionOS Production Deployment Script      ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. Check Docker & Docker Compose installation
echo -e "\n${YELLOW}[1/5] Checking environment requirements...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first: https://docs.docker.com/get-docker/${NC}"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose plugin is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker & Docker Compose detected.${NC}"

# 2. Check Environment Configuration
echo -e "\n${YELLOW}[2/5] Verifying environment variables...${NC}"
if [ ! -f .env ]; then
    if [ -f .env.docker.example ]; then
        echo -e "${YELLOW}⚠️  No .env file found. Copying .env.docker.example to .env...${NC}"
        cp .env.docker.example .env
        echo -e "${GREEN}✓ Created .env file. Please review your secrets if needed.${NC}"
    else
        echo -e "${RED}❌ Missing .env and .env.docker.example files.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env configuration file found.${NC}"
fi

# 3. Pull latest base images and build containers
echo -e "\n${YELLOW}[3/5] Building production Docker images...${NC}"
docker compose build --pull

# 4. Start all services in detached mode
echo -e "\n${YELLOW}[4/5] Starting DecisionOS service stack...${NC}"
docker compose up -d

# 5. Verify service health
echo -e "\n${YELLOW}[5/5] Waiting for services to become healthy...${NC}"
sleep 8

echo -e "\n${BLUE}── Service Status ──${NC}"
docker compose ps

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}  ✨ DecisionOS has been deployed successfully!       ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo -e "  🌐 Frontend App:     http://localhost"
echo -e "  ⚙️ Backend API:      http://localhost:5000/api/v1"
echo -e "  🩺 Health Check:     http://localhost/health"
echo -e "  📜 View Logs:        docker compose logs -f"
echo -e "  🛑 Stop Stack:       docker compose down"
echo -e "${GREEN}======================================================${NC}"

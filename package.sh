#!/bin/bash

# SportsAI Package Script

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SportsAI Package Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ZIP_FILE="/home/Memo1981/SportsAI/zips/sports-ai_${TIMESTAMP}.tar.gz"

echo -e "${GREEN}Creating SportsAI package...${NC}"

tar -czf "$ZIP_FILE" \
    --exclude='.git' \
    --exclude='__pycache__' \
    --exclude='node_modules' \
    --exclude='.DS_Store' \
    --exclude='dist' \
    --exclude='build' \
    Sports_Ai

FILE_SIZE=$(du -h "$ZIP_FILE" | cut -f1)

echo -e "${GREEN}✓ Package created: $ZIP_FILE${NC}"
echo "Size: $FILE_SIZE"
echo ""
echo "To extract:"
echo "  tar -xzf $ZIP_FILE"
echo ""

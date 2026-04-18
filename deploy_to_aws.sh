#!/bin/bash

###############################################################################
# AWS Deployment Script for 3dprints-shop (Appy's Studio)
# Builds locally, deploys standalone Next.js app to EC2
# Domain: appysstudio.com  |  Port: 3001
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
AWS_HOST="3.238.88.157"
AWS_USER="ubuntu"
SSH_KEY="/media/ddarji/storage/git/free_uploader/socialAI.pem"
REMOTE_DIR="/opt/3dprints-shop"
SERVICE_NAME="3dprints-shop"
DOMAIN="appysstudio.com"
PORT=3001

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Appy's Studio - Deploy to AWS EC2${NC}"
echo -e "${CYAN}  Domain: ${DOMAIN}  |  Port: ${PORT}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ============================================================================
# STEP 1: Validate prerequisites
# ============================================================================
echo -e "${YELLOW}Step 1: Validating prerequisites...${NC}"

if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}SSH key not found: $SSH_KEY${NC}"
    exit 1
fi
chmod 400 "$SSH_KEY"
echo -e "${GREEN}  SSH key found${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}  Node.js $(node --version)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}  npm $(npm --version)${NC}"
echo ""

# ============================================================================
# STEP 2: Build locally
# ============================================================================
echo -e "${YELLOW}Step 2: Building Next.js app locally...${NC}"

# Clean previous build
rm -rf .next/

# Use nvm if available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20 2>/dev/null || true

# Build with production base URL
NEXT_PUBLIC_BASE_URL=https://${DOMAIN} npm run build

# Verify standalone build
if [ ! -d ".next/standalone" ]; then
    echo -e "${RED}Build failed - .next/standalone/ not found${NC}"
    echo "Make sure next.config.ts has output: 'standalone'"
    exit 1
fi

if [ ! -f ".next/standalone/server.js" ]; then
    echo -e "${RED}Build incomplete - server.js not found${NC}"
    exit 1
fi

BUILD_ID=$(cat .next/BUILD_ID)
echo -e "${GREEN}  Build complete (ID: $BUILD_ID)${NC}"
echo ""

# ============================================================================
# STEP 3: Test SSH connection
# ============================================================================
echo -e "${YELLOW}Step 3: Testing SSH connection...${NC}"

if ssh -i "$SSH_KEY" -o ConnectTimeout=15 -o StrictHostKeyChecking=no "$AWS_USER@$AWS_HOST" "echo 'ok'" > /dev/null 2>&1; then
    echo -e "${GREEN}  SSH connection successful${NC}"
else
    echo -e "${RED}SSH connection failed to $AWS_HOST${NC}"
    exit 1
fi
echo ""

# ============================================================================
# STEP 4: Prepare server directory
# ============================================================================
echo -e "${YELLOW}Step 4: Preparing server directory...${NC}"

ssh -i "$SSH_KEY" "$AWS_USER@$AWS_HOST" << ENDSSH
    sudo mkdir -p ${REMOTE_DIR}/data
    sudo chown -R ${AWS_USER}:${AWS_USER} ${REMOTE_DIR}
ENDSSH

echo -e "${GREEN}  Server directory ready${NC}"
echo ""

# ============================================================================
# STEP 5: Rsync build artifacts to server
# ============================================================================
echo -e "${YELLOW}Step 5: Uploading build artifacts...${NC}"

# Rsync standalone build (contains server.js + bundled node_modules)
echo "  Syncing .next/standalone/..."
rsync -az --delete \
    --exclude='data/' \
    --exclude='.env' \
    --exclude='public/uploads/' \
    -e "ssh -i $SSH_KEY" \
    .next/standalone/ "$AWS_USER@$AWS_HOST:$REMOTE_DIR/" || {
    RC=$?
    if [ $RC -eq 23 ]; then
        echo -e "${YELLOW}  Rsync partial transfer (code 23) - continuing${NC}"
    else
        exit $RC
    fi
}

# Rsync static assets (standalone build doesn't include these)
echo "  Syncing .next/static/..."
rsync -az \
    -e "ssh -i $SSH_KEY" \
    .next/static/ "$AWS_USER@$AWS_HOST:$REMOTE_DIR/.next/static/"

# Rsync public directory
echo "  Syncing public/..."
rsync -az \
    -e "ssh -i $SSH_KEY" \
    public/ "$AWS_USER@$AWS_HOST:$REMOTE_DIR/public/"

echo -e "${GREEN}  Upload complete${NC}"
echo ""

# ============================================================================
# STEP 6: Create systemd service
# ============================================================================
echo -e "${YELLOW}Step 6: Configuring systemd service...${NC}"

ssh -i "$SSH_KEY" "$AWS_USER@$AWS_HOST" << 'ENDSSH'
sudo tee /etc/systemd/system/3dprints-shop.service > /dev/null <<'SERVICE_EOF'
[Unit]
Description=Appy's Studio - 3D Prints Shop (Next.js)
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/opt/3dprints-shop
EnvironmentFile=/opt/3dprints-shop/.env
Environment="NODE_ENV=production"
Environment="PORT=3001"
Environment="HOSTNAME=0.0.0.0"
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE_EOF

sudo systemctl daemon-reload
sudo systemctl enable 3dprints-shop
ENDSSH

echo -e "${GREEN}  Service configured${NC}"
echo ""

# ============================================================================
# STEP 7: Create nginx config
# ============================================================================
echo -e "${YELLOW}Step 7: Configuring nginx...${NC}"

ssh -i "$SSH_KEY" "$AWS_USER@$AWS_HOST" << 'ENDSSH'
# Only create if it doesn't already exist (certbot may have modified it)
if [ ! -f /etc/nginx/sites-available/appysstudio.com ]; then
    sudo tee /etc/nginx/sites-available/appysstudio.com > /dev/null <<'NGINX_EOF'
server {
    listen 80;
    server_name appysstudio.com www.appysstudio.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_EOF

    sudo ln -sf /etc/nginx/sites-available/appysstudio.com /etc/nginx/sites-enabled/
    echo "Nginx config created"
else
    echo "Nginx config already exists (preserving certbot changes)"
fi

sudo nginx -t && sudo systemctl reload nginx
ENDSSH

echo -e "${GREEN}  Nginx configured${NC}"
echo ""

# ============================================================================
# STEP 8: SSL certificate (certbot)
# ============================================================================
echo -e "${YELLOW}Step 8: Checking SSL certificate...${NC}"

ssh -i "$SSH_KEY" "$AWS_USER@$AWS_HOST" << 'ENDSSH'
# Check if cert already exists
if sudo certbot certificates 2>/dev/null | grep -q "appysstudio.com"; then
    echo "SSL certificate already exists"
else
    echo "Requesting SSL certificate..."
    sudo certbot --nginx -d appysstudio.com -d www.appysstudio.com --non-interactive --agree-tos --email dhruvil.darji@gmail.com || {
        echo "WARNING: Certbot failed. Make sure DNS A records point to this server."
        echo "You can run certbot manually later:"
        echo "  sudo certbot --nginx -d appysstudio.com -d www.appysstudio.com"
    }
fi
ENDSSH

echo -e "${GREEN}  SSL check complete${NC}"
echo ""

# ============================================================================
# STEP 9: Start/restart service
# ============================================================================
echo -e "${YELLOW}Step 9: Starting service...${NC}"

ssh -i "$SSH_KEY" "$AWS_USER@$AWS_HOST" << 'ENDSSH'
sudo systemctl restart 3dprints-shop
sleep 3
echo "Service status:"
sudo systemctl is-active 3dprints-shop
ENDSSH

echo -e "${GREEN}  Service started${NC}"
echo ""

# ============================================================================
# STEP 10: Verify deployment
# ============================================================================
echo -e "${YELLOW}Step 10: Verifying deployment...${NC}"

VERIFY_FAILED=0

# Check 3dprints-shop service
if ssh -i "$SSH_KEY" "$AWS_USER@$AWS_HOST" "sudo systemctl is-active --quiet 3dprints-shop"; then
    echo -e "${GREEN}  3dprints-shop service: active${NC}"
else
    echo -e "${RED}  3dprints-shop service: FAILED${NC}"
    ssh -i "$SSH_KEY" "$AWS_USER@$AWS_HOST" "sudo journalctl -u 3dprints-shop -n 15 --no-pager"
    VERIFY_FAILED=1
fi

# Check port 3001
PORT_CHECK=$(ssh -i "$SSH_KEY" "$AWS_USER@$AWS_HOST" "sudo ss -tlnp | grep ':3001' || echo 'NOT_LISTENING'")
if [[ "$PORT_CHECK" != *"NOT_LISTENING"* ]]; then
    echo -e "${GREEN}  Port 3001: listening${NC}"
else
    echo -e "${RED}  Port 3001: NOT listening${NC}"
    VERIFY_FAILED=1
fi

# Verify freetools is still running
if ssh -i "$SSH_KEY" "$AWS_USER@$AWS_HOST" "sudo systemctl is-active --quiet free-uploader 2>/dev/null"; then
    echo -e "${GREEN}  freetools backend: still running${NC}"
else
    echo -e "${YELLOW}  freetools backend: not checked (may not be running)${NC}"
fi

FREETOOLS_PORT=$(ssh -i "$SSH_KEY" "$AWS_USER@$AWS_HOST" "sudo ss -tlnp | grep ':3000' || echo 'NOT_LISTENING'")
if [[ "$FREETOOLS_PORT" != *"NOT_LISTENING"* ]]; then
    echo -e "${GREEN}  freetools frontend (port 3000): still running${NC}"
else
    echo -e "${YELLOW}  freetools frontend (port 3000): not detected${NC}"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $VERIFY_FAILED -eq 0 ]; then
    echo -e "${GREEN}  Deployment Successful!${NC}"
else
    echo -e "${YELLOW}  Deployment completed with warnings${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "URLs:"
echo "   https://appysstudio.com"
echo "   https://freetools.us (should be unaffected)"
echo ""
echo "Server commands:"
echo "   Status:   ssh -i $SSH_KEY $AWS_USER@$AWS_HOST 'sudo systemctl status 3dprints-shop'"
echo "   Logs:     ssh -i $SSH_KEY $AWS_USER@$AWS_HOST 'sudo journalctl -u 3dprints-shop -f'"
echo "   Restart:  ssh -i $SSH_KEY $AWS_USER@$AWS_HOST 'sudo systemctl restart 3dprints-shop'"
echo ""
echo "Post-deploy checklist:"
echo "   1. Create /opt/3dprints-shop/.env on server (if first deploy)"
echo "   2. Set DNS A records for appysstudio.com -> $AWS_HOST"
echo "   3. Add Square webhook: https://appysstudio.com/api/webhook"
echo "   4. Update OAuth callback URLs to https://appysstudio.com/api/auth/callback/{provider}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

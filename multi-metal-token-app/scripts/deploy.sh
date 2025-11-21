#!/bin/bash

# Multi-Metal Token App - Deployment Script
# Comprehensive deployment script for India's First Multi-Metal Token App

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="multi-metal-token-app"
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
DOCKER_IMAGE_NAME="multimetal-token-app"
PORT=3001

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed."
        exit 1
    fi
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        log_success "Docker is available"
    else
        log_warning "Docker not found. Skipping Docker deployment."
        DOCKER_AVAILABLE=false
    fi
    
    log_success "Dependencies check completed"
}

setup_environment() {
    log_info "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        log_info "Creating .env file..."
        cat > "$BACKEND_DIR/.env" << EOF
# Multi-Metal Token App Environment Configuration
NODE_ENV=development
PORT=$PORT

# Database Configuration
DATABASE_URL=mongodb://localhost:27017/multimetal
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# API Keys (Replace with actual values)
MCX_API_KEY=your-mcx-api-key-here
LPPM_API_KEY=your-lppm-api-key-here
PAYMENT_GATEWAY_KEY=your-payment-key-here

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMS_API_KEY=your-sms-api-key-here

# Vault Integration
VAULT_API_ENDPOINT=https://api.vaultpartner.com
VAULT_API_KEY=your-vault-api-key-here
EOF
        log_success "Environment file created"
    else
        log_info "Environment file already exists"
    fi
}

install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install backend dependencies
    log_info "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    npm ci --silent
    log_success "Backend dependencies installed"
    
    # Install frontend dependencies (if package.json exists)
    if [ -f "$FRONTEND_DIR/package.json" ]; then
        log_info "Installing frontend dependencies..."
        cd "../$FRONTEND_DIR"
        npm ci --silent
        log_success "Frontend dependencies installed"
    fi
    
    cd ..
}

setup_database() {
    log_info "Setting up database..."
    
    # Check if MongoDB is running
    if pgrep mongod > /dev/null; then
        log_success "MongoDB is running"
    else
        log_warning "MongoDB is not running. Please start MongoDB manually."
        log_info "You can start MongoDB with: sudo systemctl start mongod"
    fi
    
    # Check if Redis is running
    if pgrep redis-server > /dev/null; then
        log_success "Redis is running"
    else
        log_warning "Redis is not running. Please start Redis manually."
        log_info "You can start Redis with: sudo systemctl start redis"
    fi
    
    # Run database setup script if it exists
    if [ -f "scripts/setup-database.js" ]; then
        log_info "Running database setup..."
        node scripts/setup-database.js
        log_success "Database setup completed"
    fi
}

build_frontend() {
    log_info "Building frontend..."
    
    if [ -f "$FRONTEND_DIR/package.json" ]; then
        cd "$FRONTEND_DIR"
        
        # Check if build script exists
        if npm run | grep -q "build"; then
            npm run build
            log_success "Frontend build completed"
        else
            log_info "No build script found, frontend is static"
        fi
        
        cd ..
    else
        log_info "No frontend package.json found, skipping build"
    fi
}

run_tests() {
    log_info "Running tests..."
    
    # Run backend tests
    if [ -f "$BACKEND_DIR/package.json" ] && npm run | grep -q "test"; then
        cd "$BACKEND_DIR"
        npm test
        cd ..
        log_success "Backend tests completed"
    else
        log_info "No backend tests found"
    fi
    
    # Run frontend tests
    if [ -f "$FRONTEND_DIR/package.json" ] && npm run | grep -q "test"; then
        cd "$FRONTEND_DIR"
        npm test
        cd ..
        log_success "Frontend tests completed"
    else
        log_info "No frontend tests found"
    fi
}

create_docker_files() {
    log_info "Creating Docker configuration..."
    
    # Create Dockerfile
    cat > Dockerfile << EOF
# Multi-Metal Token App Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --only=production
RUN cd backend && npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:$PORT/api/health || exit 1

# Start application
CMD ["node", "backend/server.js"]
EOF

    # Create docker-compose.yml
    cat > docker-compose.yml << EOF
version: '3.8'

services:
  app:
    build: .
    ports:
      - "$PORT:$PORT"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mongodb://mongo:27017/multimetal
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis
    restart: unless-stopped
    
  mongo:
    image: mongo:5
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mongo_data:

networks:
  default:
    driver: bridge
EOF

    log_success "Docker configuration created"
}

start_application() {
    log_info "Starting Multi-Metal Token App..."
    
    # Check if PM2 is available for production deployment
    if command -v pm2 &> /dev/null; then
        log_info "Starting with PM2 for production..."
        cd "$BACKEND_DIR"
        pm2 start server.js --name "$PROJECT_NAME" --env production
        pm2 save
        log_success "Application started with PM2"
    else
        log_info "Starting with npm..."
        cd "$BACKEND_DIR"
        npm start &
        BACKEND_PID=$!
        log_success "Backend server started (PID: $BACKEND_PID)"
        
        # Save PID for cleanup
        echo $BACKEND_PID > .app.pid
    fi
    
    # Wait for server to start
    sleep 5
    
    # Health check
    if curl -f http://localhost:$PORT/api/health &> /dev/null; then
        log_success "Application is running successfully!"
        log_info "Backend API: http://localhost:$PORT"
        log_info "Frontend: http://localhost:$PORT (if served by backend)"
    else
        log_error "Application failed to start"
        exit 1
    fi
}

stop_application() {
    log_info "Stopping Multi-Metal Token App..."
    
    # Stop PM2 process
    if command -v pm2 &> /dev/null && pm2 list | grep -q "$PROJECT_NAME"; then
        pm2 stop "$PROJECT_NAME"
        log_success "PM2 process stopped"
    fi
    
    # Kill npm process if running
    if [ -f ".app.pid" ]; then
        PID=$(cat .app.pid)
        if kill -0 $PID 2>/dev/null; then
            kill $PID
            log_success "Application process stopped (PID: $PID)"
        fi
        rm .app.pid
    fi
    
    # Kill any remaining node processes
    pkill -f "node.*server.js" || true
}

deploy_docker() {
    log_info "Deploying with Docker..."
    
    if [ "$DOCKER_AVAILABLE" = false ]; then
        log_error "Docker is not available"
        exit 1
    fi
    
    # Build and start with Docker Compose
    docker-compose build
    docker-compose up -d
    
    log_success "Docker deployment completed"
    log_info "Application is running at http://localhost:$PORT"
}

show_status() {
    log_info "Multi-Metal Token App Status:"
    echo ""
    
    # Check backend service
    if curl -f http://localhost:$PORT/api/health &> /dev/null; then
        log_success "✅ Backend API: Running"
    else
        log_error "❌ Backend API: Not responding"
    fi
    
    # Check database connections
    if pgrep mongod > /dev/null; then
        log_success "✅ MongoDB: Running"
    else
        log_warning "⚠️  MongoDB: Not running"
    fi
    
    if pgrep redis-server > /dev/null; then
        log_success "✅ Redis: Running"
    else
        log_warning "⚠️  Redis: Not running"
    fi
    
    # Show deployment info
    echo ""
    log_info "Deployment Information:"
    echo "  • Project Name: $PROJECT_NAME"
    echo "  • Port: $PORT"
    echo "  • Environment: ${NODE_ENV:-development}"
    echo "  • Backend Directory: $BACKEND_DIR"
    echo "  • Frontend Directory: $FRONTEND_DIR"
    echo ""
    
    if [ "$DOCKER_AVAILABLE" != false ]; then
        log_info "Docker deployment available"
    fi
}

show_help() {
    echo "Multi-Metal Token App Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  install     Install dependencies and setup environment"
    echo "  test        Run test suites"
    echo "  build       Build frontend application"
    echo "  start       Start the application"
    echo "  stop        Stop the application"
    echo "  restart     Restart the application"
    echo "  status      Show application status"
    echo "  docker      Deploy using Docker"
    echo "  cleanup     Clean up and remove all files"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 install    # Full installation and setup"
    echo "  $0 start      # Start the application"
    echo "  $0 docker     # Deploy with Docker"
    echo ""
}

cleanup() {
    log_warning "This will remove all project files and dependencies"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        stop_application
        
        # Remove node_modules
        rm -rf node_modules
        rm -rf "$BACKEND_DIR/node_modules"
        rm -rf "$FRONTEND_DIR/node_modules"
        
        # Remove build artifacts
        rm -rf dist
        rm -rf build
        
        # Remove Docker files
        rm -f Dockerfile docker-compose.yml
        
        # Remove environment files
        rm -f "$BACKEND_DIR/.env"
        
        log_success "Cleanup completed"
    else
        log_info "Cleanup cancelled"
    fi
}

# Main script logic
case "${1:-help}" in
    install)
        check_dependencies
        setup_environment
        install_dependencies
        setup_database
        build_frontend
        log_success "Installation completed successfully!"
        ;;
    test)
        check_dependencies
        run_tests
        ;;
    build)
        check_dependencies
        build_frontend
        ;;
    start)
        check_dependencies
        start_application
        show_status
        ;;
    stop)
        stop_application
        log_success "Application stopped"
        ;;
    restart)
        stop_application
        sleep 2
        start_application
        show_status
        ;;
    status)
        show_status
        ;;
    docker)
        check_dependencies
        create_docker_files
        deploy_docker
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
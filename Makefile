# OAuth Frontend Makefile
.PHONY: help build up down restart logs clean dev shell prune env-check env-validate deploy

# Default target
help: ## Show this help message
	@echo "Available commands:"
	@echo "=== Docker Commands ==="
	@grep -E '^(build|up|down|restart|logs|clean|status|shell|stats|rebuild|quick-dev|dev|health):.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
	@echo ""
	@echo "=== Environment Commands ==="
	@grep -E '^(env-|deploy):.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
	@echo ""
	@echo "=== Development Commands ==="
	@grep -E '^(install|build-local|serve-local|lint|test):.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
	@echo ""
	@echo "=== Advanced Commands ==="
	@grep -E '^(backup-logs|images|containers|prune):.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

# Build the Docker image
build: ## Build the Docker image
	@echo "Building OAuth Frontend Docker image..."
	docker compose build --no-cache

# Start the application
up: ## Start the application in detached mode
	@echo "Starting OAuth Frontend..."
	docker compose up -d

# Start the application with logs
up-logs: ## Start the application and show logs
	@echo "Starting OAuth Frontend with logs..."
	docker compose up

# Stop the application
down: ## Stop the application
	@echo "Stopping OAuth Frontend..."
	docker compose down

# Restart the application
restart: ## Restart the application
	@echo "Restarting OAuth Frontend..."
	docker compose restart

# View logs
logs: ## Show application logs
	docker compose logs -f

# View logs for specific service
logs-frontend: ## Show frontend logs
	docker compose logs -f oauth-frontend

# Clean up containers and images
clean: ## Remove containers, networks, and images
	@echo "Cleaning up Docker resources..."
	docker compose down --rmi all --volumes --remove-orphans

# Clean up containers only
clean-containers: ## Remove containers only
	@echo "Removing containers..."
	docker compose down --remove-orphans

# Development mode (build and run)
dev: ## Build and start in development mode
	@echo "Starting development environment..."
	make build
	make up
	@echo "OAuth Frontend is running at http://localhost:4200"

# Access container shell
shell: ## Access the container shell
	docker compose exec oauth-frontend sh

# View container status
status: ## Show container status
	docker compose ps

# View resource usage
stats: ## Show container resource usage
	docker stats oauth-frontend

# Rebuild and restart
rebuild: ## Rebuild and restart the application
	@echo "Rebuilding and restarting OAuth Frontend..."
	make down
	make build
	make up

# Full cleanup (containers, images, volumes, networks)
prune: ## Full Docker system cleanup
	@echo "Performing full Docker cleanup..."
	docker system prune -f
	docker volume prune -f
	docker network prune -f

# Quick development cycle
quick-dev: ## Quick development cycle: clean, build, up
	@echo "Quick development cycle..."
	make clean-containers
	make build
	make up

# Show Docker images
images: ## List Docker images
	docker images | grep oauth

# Show Docker containers
containers: ## List Docker containers
	docker ps -a | grep oauth

# Backup logs
backup-logs: ## Backup application logs
	@echo "Backing up logs..."
	mkdir -p backups/logs
	docker compose logs > backups/logs/oauth-frontend-$(shell date +%Y%m%d-%H%M%S).log

# Health check
health: ## Check application health
	@echo "Checking application health..."
	@echo "Waiting for nginx to be ready..."
	@sleep 3
	@for i in 1 2 3; do \
		echo "Health check attempt $$i/3..."; \
		if curl -f --max-time 10 http://localhost:4200 > /dev/null 2>&1; then \
			echo "✅ Frontend is healthy"; \
			exit 0; \
		fi; \
		if [ $$i -lt 3 ]; then sleep 2; fi; \
	done; \
	echo "❌ Frontend is not responding after 3 attempts"; \
	exit 1

# Install dependencies (for local development)
install: ## Install npm dependencies locally
	@echo "Installing dependencies..."
	npm install

# Build application locally
build-local: ## Build application locally
	@echo "Building application locally..."
	npm run build

# Serve locally (for development)
serve-local: ## Serve application locally
	@echo "Serving application locally..."
	npm start

# Lint code
lint: ## Run linting
	@echo "Running linter..."
	npm run lint

# Run tests
test: ## Run tests
	@echo "Running tests..."
	npm run test

# Environment management
env-check: ## Check if .env file exists and show current configuration
	@echo "Environment configuration:"
	@if [ -f .env ]; then \
		echo "✅ .env file found"; \
		echo "Current BASE_URL: $$(grep '^BASE_URL=' .env | cut -d'=' -f2)"; \
	else \
		echo "❌ .env file not found"; \
	fi

env-validate: ## Validate that required environment variables are set
	@echo "Validating environment variables..."
	@if [ ! -f .env ]; then \
		echo "❌ .env file not found. Create it with your BASE_URL configuration"; \
		exit 1; \
	fi
	@if ! grep -q "^BASE_URL=" .env; then \
		echo "❌ BASE_URL not found in .env file"; \
		exit 1; \
	fi
	@echo "✅ Environment variables are valid"

# Production deployment with environment validation
deploy: ## Deploy to production with environment validation
	@echo "Deploying to production..."
	make env-validate
	make build
	make up
	make health

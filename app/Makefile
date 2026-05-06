.PHONY: dev stop db-up db-down seed

# Start PostgreSQL, then run Next.js + Electron together.
# Stops PostgreSQL automatically when the dev server exits.
dev: db-up
	@trap '$(MAKE) db-down' EXIT; \
	cd /Users/robbychen/Dev/polychamber/app && npm run dev

# Start PostgreSQL in the background
db-up:
	@echo "Starting PostgreSQL..."
	@docker compose up -d
	@echo "PostgreSQL ready."

# Stop and remove PostgreSQL container
db-down:
	@echo "Stopping PostgreSQL..."
	@docker compose down
	@echo "PostgreSQL stopped."

# Seed the database (idempotent)
seed:
	@npm run db:seed

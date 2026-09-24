package storage

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/url"
	"strings"
	"time"

	_ "github.com/lib/pq" // Register postgres SQL driver

	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/migrations"
)

var (
	ErrDatabaseURLRequiredInProduction    = errors.New("DATABASE_URL is required in production mode: refusing to run ephemeral in-memory storage")
	ErrDatabaseURLRequired                = errors.New("DATABASE_URL is required when STORAGE_MODE=postgres")
	ErrMemoryStorageForbiddenInProduction = errors.New("unsafe configuration: STORAGE_MODE=memory is strictly forbidden in production mode or when live execution is enabled")
	ErrUnsupportedStorageMode             = errors.New("unsupported STORAGE_MODE: only 'memory' and 'postgres' are valid")
	ErrDatabaseConnectionFailed           = errors.New("failed to establish database connection to PostgreSQL")
)

// SanitizeDatabaseURL redacts credentials from a database URL so it can be safely logged.
func SanitizeDatabaseURL(rawURL string) string {
	if rawURL == "" {
		return ""
	}
	u, err := url.Parse(rawURL)
	if err != nil {
		return "[redacted-database-url]"
	}
	if u.User != nil {
		if _, hasPass := u.User.Password(); hasPass {
			u.User = url.UserPassword(u.User.Username(), "***")
		}
	}
	return u.String()
}

// InitializeRepository creates the appropriate repository based on explicit configuration.
//
// Rules:
// 1. Explicit STORAGE_MODE selection: "memory" or "postgres".
// 2. Production or Live Execution: STORAGE_MODE=memory is STRICTLY FORBIDDEN. Fails closed.
// 3. DATABASE_URL present: Defaults to postgres storage mode if unspecified.
// 4. On connection failure or migration failure: Fails fast without silent fallback to memory.
func InitializeRepository(ctx context.Context, cfg *config.Config) (Repository, *sql.DB, error) {
	isProduction := strings.EqualFold(cfg.Environment, "production") || cfg.EnableLiveExecution
	mode := strings.ToLower(strings.TrimSpace(cfg.StorageMode))
	dbURL := strings.TrimSpace(cfg.DatabaseURL)

	// If mode is unspecified, resolve according to environment and DATABASE_URL
	if mode == "" {
		if dbURL != "" {
			mode = "postgres"
		} else if isProduction {
			mode = "postgres"
		} else {
			mode = "memory"
		}
	}

	switch mode {
	case "memory":
		if isProduction {
			log.Printf("[AgentPay Storage] FATAL: STORAGE_MODE=memory is strictly prohibited in production mode.")
			return nil, nil, ErrMemoryStorageForbiddenInProduction
		}

		log.Printf("[AgentPay Storage] backend=memory")
		log.Printf("[AgentPay Storage] WARNING: ephemeral development storage. State will not survive restarts.")
		return NewMemoryRepository(), nil, nil

	case "postgres":
		if dbURL == "" {
			if isProduction {
				log.Printf("[AgentPay Storage] FATAL: DATABASE_URL is required in production mode.")
				return nil, nil, ErrDatabaseURLRequiredInProduction
			}
			log.Printf("[AgentPay Storage] FATAL: DATABASE_URL is required when STORAGE_MODE=postgres.")
			return nil, nil, ErrDatabaseURLRequired
		}

		sanitizedURL := SanitizeDatabaseURL(dbURL)
		log.Printf("[AgentPay Storage] backend=postgres")
		log.Printf("[AgentPay Storage] connecting to %s...", sanitizedURL)

		db, err := sql.Open("postgres", dbURL)
		if err != nil {
			return nil, nil, fmt.Errorf("%w: %v", ErrDatabaseConnectionFailed, err)
		}

		// Configure connection pool parameters
		maxOpen := cfg.DBMaxOpenConns
		if maxOpen <= 0 {
			maxOpen = 25
		}
		maxIdle := cfg.DBMaxIdleConns
		if maxIdle <= 0 {
			maxIdle = 5
		}
		maxLifetime := cfg.DBConnMaxLifetime
		if maxLifetime <= 0 {
			maxLifetime = 15 * time.Minute
		}
		maxIdleTime := cfg.DBConnMaxIdleTime
		if maxIdleTime <= 0 {
			maxIdleTime = 5 * time.Minute
		}

		db.SetMaxOpenConns(maxOpen)
		db.SetMaxIdleConns(maxIdle)
		db.SetConnMaxLifetime(maxLifetime)
		db.SetConnMaxIdleTime(maxIdleTime)

		// Verify database connectivity
		pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()

		if err := db.PingContext(pingCtx); err != nil {
			db.Close()
			log.Printf("[AgentPay Storage] FATAL: PostgreSQL connection check failed: %v", err)
			return nil, nil, fmt.Errorf("%w: %v", ErrDatabaseConnectionFailed, err)
		}

		log.Printf("[AgentPay Storage] database connection established")

		// Apply database schema migrations if auto-migrate is enabled
		if cfg.AutoMigrate {
			log.Printf("[AgentPay Storage] applying pending database migrations...")
			if err := migrations.ApplyAll(ctx, db); err != nil {
				db.Close()
				log.Printf("[AgentPay Storage] FATAL: database migration failed: %v", err)
				return nil, nil, fmt.Errorf("failed to apply database migrations: %w", err)
			}
			log.Printf("[AgentPay Storage] database schema migrations verified")
		}

		return NewPostgresRepository(db), db, nil

	default:
		return nil, nil, fmt.Errorf("%w: %q", ErrUnsupportedStorageMode, mode)
	}
}

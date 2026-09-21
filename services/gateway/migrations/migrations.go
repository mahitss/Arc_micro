package migrations

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"sort"
	"strings"
)

//go:embed *.up.sql
var UpMigrations embed.FS

// MigrationEntry represents an individual migration script.
type MigrationEntry struct {
	Name string
	SQL  string
}

// GetMigrationEntries returns all embedded .up.sql files sorted in ascending order.
func GetMigrationEntries() ([]MigrationEntry, error) {
	entries, err := fs.ReadDir(UpMigrations, ".")
	if err != nil {
		return nil, fmt.Errorf("failed to read embedded migrations directory: %w", err)
	}

	var names []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".up.sql") {
			names = append(names, entry.Name())
		}
	}
	sort.Strings(names)

	var result []MigrationEntry
	for _, name := range names {
		content, err := UpMigrations.ReadFile(name)
		if err != nil {
			return nil, fmt.Errorf("failed to read migration file %s: %w", name, err)
		}
		result = append(result, MigrationEntry{
			Name: name,
			SQL:  string(content),
		})
	}
	return result, nil
}

// ApplyAll applies all pending migrations in deterministic ascending order.
// Uses schema_migrations table to ensure migrations are applied idempotently.
func ApplyAll(ctx context.Context, db *sql.DB) error {
	// 1. Ensure schema_migrations table exists
	initTableQuery := `CREATE TABLE IF NOT EXISTS schema_migrations (
		version VARCHAR(128) PRIMARY KEY,
		applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
	);`
	if _, err := db.ExecContext(ctx, initTableQuery); err != nil {
		return fmt.Errorf("failed to initialize schema_migrations tracking table: %w", err)
	}

	// 2. Fetch all embedded migrations
	migrations, err := GetMigrationEntries()
	if err != nil {
		return err
	}

	// 3. Apply each migration in a dedicated transaction if not already applied
	for _, m := range migrations {
		var existing string
		checkQuery := `SELECT version FROM schema_migrations WHERE version = $1`
		err := db.QueryRowContext(ctx, checkQuery, m.Name).Scan(&existing)
		if err == nil {
			// Migration already applied
			continue
		}
		if err != sql.ErrNoRows {
			return fmt.Errorf("failed to check migration status for %s: %w", m.Name, err)
		}

		// Apply migration in a transaction
		if err := applySingleMigration(ctx, db, m); err != nil {
			return fmt.Errorf("failed to apply migration %s: %w", m.Name, err)
		}
	}

	return nil
}

func applySingleMigration(ctx context.Context, db *sql.DB, m MigrationEntry) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Execute migration script
	if _, err := tx.ExecContext(ctx, m.SQL); err != nil {
		return fmt.Errorf("executing SQL failed: %w", err)
	}

	// Record migration version in schema_migrations
	recordQuery := `INSERT INTO schema_migrations (version, applied_at) VALUES ($1, NOW())`
	if _, err := tx.ExecContext(ctx, recordQuery, m.Name); err != nil {
		return fmt.Errorf("recording migration version failed: %w", err)
	}

	return tx.Commit()
}

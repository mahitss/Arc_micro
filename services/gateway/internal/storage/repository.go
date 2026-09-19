package storage

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

var (
	ErrNotFound      = errors.New("record not found")
	ErrAlreadyExists = errors.New("record already exists")
)

// Agent represents an autonomous agent entity.
type Agent struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

// Repository defines storage operations for agents, services, intents, and executions.
type Repository interface {
	SaveAgent(ctx context.Context, a *Agent) error
	GetAgent(ctx context.Context, id string) (*Agent, error)
	ListAgents(ctx context.Context) ([]*Agent, error)

	SaveService(ctx context.Context, s *registry.Service) error
	GetService(ctx context.Context, id string) (*registry.Service, error)
	ListServices(ctx context.Context) ([]*registry.Service, error)

	SaveIntent(ctx context.Context, pi *intent.PaymentIntent) error
	GetIntent(ctx context.Context, id string) (*intent.PaymentIntent, error)
	ListIntents(ctx context.Context) ([]*intent.PaymentIntent, error)
	UpdateIntentStatus(ctx context.Context, id string, status intent.IntentStatus, updatedAt time.Time) error

	SaveExecution(ctx context.Context, ex *intent.PaymentExecutionRecord) error
	GetExecution(ctx context.Context, intentID string) (*intent.PaymentExecutionRecord, error)
	ListExecutions(ctx context.Context) ([]*intent.PaymentExecutionRecord, error)
}

// MemoryRepository provides a thread-safe in-memory implementation of Repository.
type MemoryRepository struct {
	mu         sync.RWMutex
	agents     map[string]*Agent
	services   map[string]*registry.Service
	intents    map[string]*intent.PaymentIntent
	executions map[string]*intent.PaymentExecutionRecord
}

// NewMemoryRepository creates a new in-memory repository instance.
func NewMemoryRepository() *MemoryRepository {
	repo := &MemoryRepository{
		agents:     make(map[string]*Agent),
		services:   make(map[string]*registry.Service),
		intents:    make(map[string]*intent.PaymentIntent),
		executions: make(map[string]*intent.PaymentExecutionRecord),
	}

	// Seed default research-agent
	repo.agents["research-agent"] = &Agent{
		ID:        "research-agent",
		Name:      "Arc Research Agent",
		Status:    "ACTIVE",
		CreatedAt: time.Now(),
	}

	return repo
}

func (m *MemoryRepository) SaveAgent(ctx context.Context, a *Agent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	copyA := *a
	m.agents[a.ID] = &copyA
	return nil
}

func (m *MemoryRepository) GetAgent(ctx context.Context, id string) (*Agent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	a, ok := m.agents[id]
	if !ok {
		return nil, ErrNotFound
	}
	copyA := *a
	return &copyA, nil
}

func (m *MemoryRepository) ListAgents(ctx context.Context) ([]*Agent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make([]*Agent, 0, len(m.agents))
	for _, a := range m.agents {
		copyA := *a
		res = append(res, &copyA)
	}
	return res, nil
}

func (m *MemoryRepository) SaveService(ctx context.Context, s *registry.Service) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	copyS := *s
	m.services[s.ID] = &copyS
	return nil
}

func (m *MemoryRepository) GetService(ctx context.Context, id string) (*registry.Service, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	s, ok := m.services[id]
	if !ok {
		return nil, ErrNotFound
	}
	copyS := *s
	return &copyS, nil
}

func (m *MemoryRepository) ListServices(ctx context.Context) ([]*registry.Service, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make([]*registry.Service, 0, len(m.services))
	for _, s := range m.services {
		copyS := *s
		res = append(res, &copyS)
	}
	return res, nil
}

func (m *MemoryRepository) SaveIntent(ctx context.Context, pi *intent.PaymentIntent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, exists := m.intents[pi.IntentID]; exists {
		return ErrAlreadyExists
	}
	copyPI := *pi
	m.intents[pi.IntentID] = &copyPI
	return nil
}

func (m *MemoryRepository) GetIntent(ctx context.Context, id string) (*intent.PaymentIntent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	pi, ok := m.intents[id]
	if !ok {
		return nil, ErrNotFound
	}
	copyPI := *pi
	return &copyPI, nil
}

func (m *MemoryRepository) ListIntents(ctx context.Context) ([]*intent.PaymentIntent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make([]*intent.PaymentIntent, 0, len(m.intents))
	for _, pi := range m.intents {
		copyPI := *pi
		res = append(res, &copyPI)
	}
	return res, nil
}

func (m *MemoryRepository) UpdateIntentStatus(ctx context.Context, id string, status intent.IntentStatus, updatedAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	pi, ok := m.intents[id]
	if !ok {
		return ErrNotFound
	}
	pi.Status = status
	pi.UpdatedAt = updatedAt
	return nil
}

func (m *MemoryRepository) SaveExecution(ctx context.Context, ex *intent.PaymentExecutionRecord) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	copyEx := *ex
	m.executions[ex.IntentID] = &copyEx
	return nil
}

func (m *MemoryRepository) GetExecution(ctx context.Context, intentID string) (*intent.PaymentExecutionRecord, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	ex, ok := m.executions[intentID]
	if !ok {
		return nil, ErrNotFound
	}
	copyEx := *ex
	return &copyEx, nil
}

func (m *MemoryRepository) ListExecutions(ctx context.Context) ([]*intent.PaymentExecutionRecord, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make([]*intent.PaymentExecutionRecord, 0, len(m.executions))
	for _, ex := range m.executions {
		copyEx := *ex
		res = append(res, &copyEx)
	}
	return res, nil
}

// PostgresRepository implements Repository using a PostgreSQL connection pool.
type PostgresRepository struct {
	db *sql.DB
}

// NewPostgresRepository creates a new PostgresRepository.
func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (p *PostgresRepository) SaveAgent(ctx context.Context, a *Agent) error {
	query := `INSERT INTO agents (id, name, status, created_at) VALUES ($1, $2, $3, $4)
	          ON CONFLICT (id) DO UPDATE SET name = $2, status = $3`
	_, err := p.db.ExecContext(ctx, query, a.ID, a.Name, a.Status, a.CreatedAt)
	return err
}

func (p *PostgresRepository) GetAgent(ctx context.Context, id string) (*Agent, error) {
	query := `SELECT id, name, status, created_at FROM agents WHERE id = $1`
	row := p.db.QueryRowContext(ctx, query, id)
	var a Agent
	if err := row.Scan(&a.ID, &a.Name, &a.Status, &a.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &a, nil
}

func (p *PostgresRepository) SaveService(ctx context.Context, s *registry.Service) error {
	query := `INSERT INTO services (id, name, recipient, asset, enabled, max_price, fixed_price, created_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
	          ON CONFLICT (id) DO UPDATE SET name = $2, recipient = $3, asset = $4, enabled = $5, max_price = $6, fixed_price = $7`
	_, err := p.db.ExecContext(ctx, query, s.ID, s.Name, s.Recipient, s.Asset, s.Enabled, s.MaxPrice, s.FixedPrice)
	return err
}

func (p *PostgresRepository) GetService(ctx context.Context, id string) (*registry.Service, error) {
	query := `SELECT id, name, recipient, asset, enabled, max_price, COALESCE(fixed_price, '') FROM services WHERE id = $1`
	row := p.db.QueryRowContext(ctx, query, id)
	var s registry.Service
	if err := row.Scan(&s.ID, &s.Name, &s.Recipient, &s.Asset, &s.Enabled, &s.MaxPrice, &s.FixedPrice); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &s, nil
}

func (p *PostgresRepository) SaveIntent(ctx context.Context, pi *intent.PaymentIntent) error {
	query := `INSERT INTO payment_intents (id, agent_id, vault_address, service_id, recipient, amount, asset, purpose, justification, status, expires_at, created_at, updated_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`
	_, err := p.db.ExecContext(ctx, query, pi.IntentID, pi.AgentID, pi.VaultAddress, pi.ServiceID, pi.Recipient, pi.Amount, pi.Asset, pi.Purpose, pi.Justification, string(pi.Status), pi.ExpiresAt, pi.CreatedAt, pi.UpdatedAt)
	return err
}

func (p *PostgresRepository) GetIntent(ctx context.Context, id string) (*intent.PaymentIntent, error) {
	query := `SELECT id, agent_id, vault_address, service_id, recipient, amount, asset, purpose, justification, status, expires_at, created_at, updated_at
	          FROM payment_intents WHERE id = $1`
	row := p.db.QueryRowContext(ctx, query, id)
	var pi intent.PaymentIntent
	var statusStr string
	if err := row.Scan(&pi.IntentID, &pi.AgentID, &pi.VaultAddress, &pi.ServiceID, &pi.Recipient, &pi.Amount, &pi.Asset, &pi.Purpose, &pi.Justification, &statusStr, &pi.ExpiresAt, &pi.CreatedAt, &pi.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	pi.Status = intent.IntentStatus(statusStr)
	return &pi, nil
}

func (p *PostgresRepository) UpdateIntentStatus(ctx context.Context, id string, status intent.IntentStatus, updatedAt time.Time) error {
	query := `UPDATE payment_intents SET status = $1, updated_at = $2 WHERE id = $3`
	res, err := p.db.ExecContext(ctx, query, string(status), updatedAt, id)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (p *PostgresRepository) SaveExecution(ctx context.Context, ex *intent.PaymentExecutionRecord) error {
	query := `INSERT INTO payment_executions (intent_id, transaction_hash, status, submitted_at, confirmed_at, error_code)
	          VALUES ($1, $2, $3, $4, $5, $6)
	          ON CONFLICT (intent_id) DO UPDATE SET transaction_hash = $2, status = $3, submitted_at = $4, confirmed_at = $5, error_code = $6`
	_, err := p.db.ExecContext(ctx, query, ex.IntentID, ex.TransactionHash, ex.Status, ex.SubmittedAt, ex.ConfirmedAt, ex.ErrorCode)
	return err
}

func (p *PostgresRepository) GetExecution(ctx context.Context, intentID string) (*intent.PaymentExecutionRecord, error) {
	query := `SELECT intent_id, COALESCE(transaction_hash, ''), status, submitted_at, confirmed_at, COALESCE(error_code, '')
	          FROM payment_executions WHERE intent_id = $1`
	row := p.db.QueryRowContext(ctx, query, intentID)
	var ex intent.PaymentExecutionRecord
	if err := row.Scan(&ex.IntentID, &ex.TransactionHash, &ex.Status, &ex.SubmittedAt, &ex.ConfirmedAt, &ex.ErrorCode); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &ex, nil
}

func (p *PostgresRepository) ListAgents(ctx context.Context) ([]*Agent, error) {
	query := `SELECT id, name, status, created_at FROM agents ORDER BY created_at DESC`
	rows, err := p.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []*Agent
	for rows.Next() {
		var a Agent
		if err := rows.Scan(&a.ID, &a.Name, &a.Status, &a.CreatedAt); err != nil {
			return nil, err
		}
		res = append(res, &a)
	}
	return res, rows.Err()
}

func (p *PostgresRepository) ListServices(ctx context.Context) ([]*registry.Service, error) {
	query := `SELECT id, name, recipient, asset, enabled, max_price, COALESCE(fixed_price, '') FROM services ORDER BY created_at DESC`
	rows, err := p.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []*registry.Service
	for rows.Next() {
		var s registry.Service
		if err := rows.Scan(&s.ID, &s.Name, &s.Recipient, &s.Asset, &s.Enabled, &s.MaxPrice, &s.FixedPrice); err != nil {
			return nil, err
		}
		res = append(res, &s)
	}
	return res, rows.Err()
}

func (p *PostgresRepository) ListIntents(ctx context.Context) ([]*intent.PaymentIntent, error) {
	query := `SELECT id, agent_id, vault_address, service_id, recipient, amount, asset, purpose, justification, status, expires_at, created_at, updated_at
	          FROM payment_intents ORDER BY created_at DESC`
	rows, err := p.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []*intent.PaymentIntent
	for rows.Next() {
		var pi intent.PaymentIntent
		var statusStr string
		if err := rows.Scan(&pi.IntentID, &pi.AgentID, &pi.VaultAddress, &pi.ServiceID, &pi.Recipient, &pi.Amount, &pi.Asset, &pi.Purpose, &pi.Justification, &statusStr, &pi.ExpiresAt, &pi.CreatedAt, &pi.UpdatedAt); err != nil {
			return nil, err
		}
		pi.Status = intent.IntentStatus(statusStr)
		res = append(res, &pi)
	}
	return res, rows.Err()
}

func (p *PostgresRepository) ListExecutions(ctx context.Context) ([]*intent.PaymentExecutionRecord, error) {
	query := `SELECT intent_id, COALESCE(transaction_hash, ''), status, submitted_at, confirmed_at, COALESCE(error_code, '')
	          FROM payment_executions ORDER BY submitted_at DESC NULLS LAST`
	rows, err := p.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []*intent.PaymentExecutionRecord
	for rows.Next() {
		var ex intent.PaymentExecutionRecord
		if err := rows.Scan(&ex.IntentID, &ex.TransactionHash, &ex.Status, &ex.SubmittedAt, &ex.ConfirmedAt, &ex.ErrorCode); err != nil {
			return nil, err
		}
		res = append(res, &ex)
	}
	return res, rows.Err()
}

// ApplyMigrations executes the initial schema migration statements.
func ApplyMigrations(ctx context.Context, db *sql.DB, migrationSQL string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin migration transaction: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, migrationSQL); err != nil {
		return fmt.Errorf("migration execution failed: %w", err)
	}

	return tx.Commit()
}

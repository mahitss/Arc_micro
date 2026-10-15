package trust

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"
)

const (
	GenesisPrevHash          = "0000000000000000000000000000000000000000000000000000000000000000"
	SoftwareChainThreatModel = "Tamper-evident software hash chain. Verifies historical linkage and payload integrity; does not provide distributed Byzantine consensus without external head-hash attestation."
)

var (
	ErrDuplicateEventID = errors.New("audit event ID already exists in chain")
	ErrEmptyEventID     = errors.New("audit event ID cannot be empty")
	ErrChainBroken      = errors.New("audit chain cryptographic linkage is broken")
)

// AuditEventNode represents a single block/node in the tamper-evident audit chain.
type AuditEventNode struct {
	Index         int                    `json:"index"`
	ID            string                 `json:"id"`
	CorrelationID string                 `json:"correlation_id"`
	Timestamp     time.Time              `json:"timestamp"`
	EventType     string                 `json:"event_type"` // e.g., "POLICY_EVALUATION", "AUTHORIZATION", "SETTLEMENT_SIMULATED", "REPLAY_BLOCKED"
	Outcome       string                 `json:"outcome"`    // e.g., "ALLOWED", "DENIED", "AWAITING_APPROVAL", "FAILED"
	ActorID       string                 `json:"actor_id"`
	ResourceID    string                 `json:"resource_id"`
	Payload       map[string]interface{} `json:"payload"`
	PayloadHash   string                 `json:"payload_hash"` // SHA-256 of canonicalized payload
	PrevHash      string                 `json:"prev_hash"`    // BlockHash of previous node
	BlockHash     string                 `json:"block_hash"`   // SHA-256(index, ID, CorrelationID, Timestamp, EventType, Outcome, ActorID, ResourceID, PrevHash, PayloadHash)
}

// ChainVerificationResult details the cryptographic integrity check of the audit chain.
type ChainVerificationResult struct {
	IsValid          bool      `json:"is_valid"`
	TotalNodes       int       `json:"total_nodes"`
	HeadHash         string    `json:"head_hash"`
	BrokenNodeIndex  int       `json:"broken_node_index,omitempty"`
	BrokenNodeID     string    `json:"broken_node_id,omitempty"`
	FailureReason    string    `json:"failure_reason,omitempty"`
	VerifiedAt       time.Time `json:"verified_at"`
	ThreatModelNotes string    `json:"threat_model_notes"`
}

// CanonicalizePayload produces a deterministic byte representation of a payload map.
// Keys are sorted lexicographically at every level, ensuring identical JSON regardless of map ordering.
func CanonicalizePayload(payload map[string]interface{}) ([]byte, error) {
	if payload == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(sortMapKeys(payload))
}

func sortMapKeys(val interface{}) interface{} {
	switch v := val.(type) {
	case map[string]interface{}:
		sortedKeys := make([]string, 0, len(v))
		for k := range v {
			sortedKeys = append(sortedKeys, k)
		}
		sort.Strings(sortedKeys)

		ordered := make([]mapEntry, 0, len(sortedKeys))
		for _, k := range sortedKeys {
			ordered = append(ordered, mapEntry{Key: k, Value: sortMapKeys(v[k])})
		}
		return ordered
	case []interface{}:
		for i, elem := range v {
			v[i] = sortMapKeys(elem)
		}
		return v
	default:
		return v
	}
}

type mapEntry struct {
	Key   string      `json:"k"`
	Value interface{} `json:"v"`
}

// ComputePayloadHash computes the SHA-256 digest of the canonicalized payload.
func ComputePayloadHash(payload map[string]interface{}) string {
	canonicalBytes, err := CanonicalizePayload(payload)
	if err != nil {
		canonicalBytes = []byte("{}")
	}
	hash := sha256.Sum256(canonicalBytes)
	return hex.EncodeToString(hash[:])
}

// ComputeBlockHash computes the SHA-256 block hash for an audit event node.
func ComputeBlockHash(index int, id, correlationID string, timestamp time.Time, eventType, outcome, actorID, resourceID, prevHash, payloadHash string) string {
	tsFormatted := timestamp.UTC().Format(time.RFC3339Nano)
	raw := fmt.Sprintf("%d:%s:%s:%s:%s:%s:%s:%s:%s:%s",
		index,
		id,
		correlationID,
		tsFormatted,
		eventType,
		outcome,
		actorID,
		resourceID,
		prevHash,
		payloadHash,
	)
	hash := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(hash[:])
}

// AuditChain provides an append-only, tamper-evident sequence of recorded events.
//
// THREAT MODEL & LIMITATIONS:
// 1. Detection Guarantee: Any alteration of a historical node's payload, timestamp, event type,
//    outcome, or previous hash breaks the cryptographic chain for all subsequent nodes.
// 2. Storage Boundary: This is software-enforced tamper-evidence, NOT hardware-isolated or
//    distributed immutable storage (e.g. not a public blockchain consensus layer).
// 3. Sybil & Key Compromise: If an adversary gains full database root access, they could theoretically
//    recompute forward hashes from the point of tampering. To detect this, periodic head hashes
//    must be attested to external log sinks or verifiers.
type AuditChain struct {
	mu     sync.RWMutex
	nodes  []*AuditEventNode
	seenID map[string]bool
}

// NewAuditChain creates a fresh, empty audit chain.
func NewAuditChain() *AuditChain {
	return &AuditChain{
		nodes:  make([]*AuditEventNode, 0),
		seenID: make(map[string]bool),
	}
}

// AppendEvent canonicalizes the payload, calculates hashes, links to the previous node, and appends.
func (c *AuditChain) AppendEvent(
	id string,
	correlationID string,
	eventType string,
	outcome string,
	actorID string,
	resourceID string,
	payload map[string]interface{},
) (*AuditEventNode, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if id == "" {
		return nil, ErrEmptyEventID
	}
	if c.seenID[id] {
		return nil, fmt.Errorf("%w: '%s'", ErrDuplicateEventID, id)
	}

	index := len(c.nodes)
	prevHash := GenesisPrevHash
	if index > 0 {
		prevHash = c.nodes[index-1].BlockHash
	}

	ts := time.Now().UTC()
	payloadHash := ComputePayloadHash(payload)
	blockHash := ComputeBlockHash(
		index,
		id,
		correlationID,
		ts,
		eventType,
		outcome,
		actorID,
		resourceID,
		prevHash,
		payloadHash,
	)

	node := &AuditEventNode{
		Index:         index,
		ID:            id,
		CorrelationID: correlationID,
		Timestamp:     ts,
		EventType:     eventType,
		Outcome:       outcome,
		ActorID:       actorID,
		ResourceID:    resourceID,
		Payload:       payload,
		PayloadHash:   payloadHash,
		PrevHash:      prevHash,
		BlockHash:     blockHash,
	}

	c.nodes = append(c.nodes, node)
	c.seenID[id] = true
	return node, nil
}

// VerifyChain traverses the chain and recomputes all hashes to prove integrity.
func (c *AuditChain) VerifyChain() *ChainVerificationResult {
	c.mu.RLock()
	defer c.mu.RUnlock()

	now := time.Now().UTC()
	notes := "Threat model: Tamper-evident hash chain. Verifies historical linkage; does not provide distributed Byzantine consensus without external head-hash attestation."

	if len(c.nodes) == 0 {
		return &ChainVerificationResult{
			IsValid:          true,
			TotalNodes:       0,
			HeadHash:         GenesisPrevHash,
			VerifiedAt:       now,
			ThreatModelNotes: notes,
		}
	}

	seenIDs := make(map[string]bool)

	for i, node := range c.nodes {
		if node == nil {
			return &ChainVerificationResult{
				IsValid:          false,
				BrokenNodeIndex:  i,
				FailureReason:    "Nil node encountered in chain",
				VerifiedAt:       now,
				ThreatModelNotes: notes,
			}
		}

		// Check index alignment
		if node.Index != i {
			return &ChainVerificationResult{
				IsValid:          false,
				BrokenNodeIndex:  i,
				BrokenNodeID:     node.ID,
				FailureReason:    fmt.Sprintf("Index mismatch: node recorded as %d but positioned at %d", node.Index, i),
				VerifiedAt:       now,
				ThreatModelNotes: notes,
			}
		}

		// Check duplicate ID
		if seenIDs[node.ID] {
			return &ChainVerificationResult{
				IsValid:          false,
				BrokenNodeIndex:  i,
				BrokenNodeID:     node.ID,
				FailureReason:    fmt.Sprintf("Duplicate event ID detected in chain: %s", node.ID),
				VerifiedAt:       now,
				ThreatModelNotes: notes,
			}
		}
		seenIDs[node.ID] = true

		// Check linkage
		expectedPrev := GenesisPrevHash
		if i > 0 {
			expectedPrev = c.nodes[i-1].BlockHash
		}
		if node.PrevHash != expectedPrev {
			return &ChainVerificationResult{
				IsValid:          false,
				BrokenNodeIndex:  i,
				BrokenNodeID:     node.ID,
				FailureReason:    fmt.Sprintf("Previous hash mismatch at node %d: expected %s, found %s", i, expectedPrev, node.PrevHash),
				VerifiedAt:       now,
				ThreatModelNotes: notes,
			}
		}

		// Check payload hash
		expectedPayloadHash := ComputePayloadHash(node.Payload)
		if node.PayloadHash != expectedPayloadHash {
			return &ChainVerificationResult{
				IsValid:          false,
				BrokenNodeIndex:  i,
				BrokenNodeID:     node.ID,
				FailureReason:    fmt.Sprintf("Payload tampering detected at node %d: expected hash %s, found %s", i, expectedPayloadHash, node.PayloadHash),
				VerifiedAt:       now,
				ThreatModelNotes: notes,
			}
		}

		// Check block hash
		expectedBlockHash := ComputeBlockHash(
			node.Index,
			node.ID,
			node.CorrelationID,
			node.Timestamp,
			node.EventType,
			node.Outcome,
			node.ActorID,
			node.ResourceID,
			node.PrevHash,
			node.PayloadHash,
		)
		if node.BlockHash != expectedBlockHash {
			return &ChainVerificationResult{
				IsValid:          false,
				BrokenNodeIndex:  i,
				BrokenNodeID:     node.ID,
				FailureReason:    fmt.Sprintf("Block hash recalculation mismatch at node %d: expected %s, found %s", i, expectedBlockHash, node.BlockHash),
				VerifiedAt:       now,
				ThreatModelNotes: notes,
			}
		}
	}

	headHash := c.nodes[len(c.nodes)-1].BlockHash
	return &ChainVerificationResult{
		IsValid:          true,
		TotalNodes:       len(c.nodes),
		HeadHash:         headHash,
		VerifiedAt:       now,
		ThreatModelNotes: notes,
	}
}

// GetNodes returns a shallow copy of all nodes in the chain.
func (c *AuditChain) GetNodes() []*AuditEventNode {
	c.mu.RLock()
	defer c.mu.RUnlock()

	out := make([]*AuditEventNode, len(c.nodes))
	copy(out, c.nodes)
	return out
}

// GetRecentNodes returns the most recent N nodes in chronological order.
func (c *AuditChain) GetRecentNodes(limit int) []*AuditEventNode {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if limit <= 0 || limit >= len(c.nodes) {
		return c.GetNodes()
	}

	start := len(c.nodes) - limit
	out := make([]*AuditEventNode, limit)
	copy(out, c.nodes[start:])
	return out
}

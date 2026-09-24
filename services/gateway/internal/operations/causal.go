package operations

import (
	"sync"
	"time"

	"github.com/google/uuid"
)

// CausalEngine manages causal dependency links and powers the "Why?" inspector.
type CausalEngine struct {
	mu           sync.RWMutex
	links        map[string]*CausalLink   // link_id -> link
	eventLinks   map[string]*CausalLink   // event_id -> link
	explanations map[string]*Explanation  // event_id -> Explanation
}

// NewCausalEngine creates an instance of CausalEngine.
func NewCausalEngine() *CausalEngine {
	return &CausalEngine{
		links:        make(map[string]*CausalLink),
		eventLinks:   make(map[string]*CausalLink),
		explanations: make(map[string]*Explanation),
	}
}

// RecordCausalLink logs a verifiable causal dependency between an event and its cause.
// Strictly enforces INV-136: causal traces cannot fabricate evidence.
func (ce *CausalEngine) RecordCausalLink(
	tenantID string,
	eventID string,
	causedByEventID string,
	causalType string,
	trigger string,
	evidence string,
) (*CausalLink, error) {
	if err := ValidateCausalEvidence(trigger, evidence); err != nil {
		return nil, err
	}

	ce.mu.Lock()
	defer ce.mu.Unlock()

	link := &CausalLink{
		LinkID:          "clink_" + uuid.NewString()[:8],
		TenantID:        tenantID,
		EventID:         eventID,
		CausedByEventID: causedByEventID,
		CausalType:      causalType,
		Trigger:         trigger,
		Evidence:        evidence,
		CreatedAt:       time.Now().UTC(),
	}

	ce.links[link.LinkID] = link
	ce.eventLinks[eventID] = link
	return link, nil
}

// RecordExplanation registers a structured operational explanation for an event or decision.
func (ce *CausalEngine) RecordExplanation(eventID string, expl Explanation) {
	ce.mu.Lock()
	defer ce.mu.Unlock()
	expl.FinancialAuthority = "UNCHANGED"
	ce.explanations[eventID] = &expl
}

// ExplainEvent retrieves the structured explanation for an event.
func (ce *CausalEngine) ExplainEvent(eventID string) (*Explanation, bool) {
	ce.mu.RLock()
	defer ce.mu.RUnlock()

	expl, exists := ce.explanations[eventID]
	if exists {
		return expl, true
	}

	// If explicit explanation not found, synthesize from causal link
	if link, ok := ce.eventLinks[eventID]; ok {
		synth := &Explanation{
			CurrentState:       "RECORDED",
			Trigger:            link.Trigger,
			Evidence:           link.Evidence,
			Decision:           DecisionType(link.CausalType),
			NextAction:         "Evaluated by operations supervisor",
			FinancialAuthority: "UNCHANGED",
		}
		return synth, true
	}

	return nil, false
}

// GetCausalChain walks backward from an event through its parents to find root cause.
func (ce *CausalEngine) GetCausalChain(eventID string, maxDepth int) []*CausalLink {
	ce.mu.RLock()
	defer ce.mu.RUnlock()

	var chain []*CausalLink
	curr := eventID
	depth := 0

	for curr != "" && depth < maxDepth {
		link, exists := ce.eventLinks[curr]
		if !exists {
			break
		}
		chain = append(chain, link)
		curr = link.CausedByEventID
		depth++
	}

	return chain
}

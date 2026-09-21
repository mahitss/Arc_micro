package adversarial

import (
	"time"
)

// ScenarioStatus indicates the verified result of an attack scenario.
type ScenarioStatus string

const (
	StatusPass        ScenarioStatus = "PASS"
	StatusFail        ScenarioStatus = "FAIL"
	StatusNotVerified ScenarioStatus = "NOT_VERIFIED"
)

// SecurityScenario represents the execution result of an individual adversarial attack simulation.
type SecurityScenario struct {
	ID               string                 `json:"id"`                 // e.g. "SEC-01"
	Name             string                 `json:"name"`               // e.g. "RECIPIENT_OVERRIDE"
	Category         string                 `json:"category"`           // "AUTHORIZATION", "FINANCIAL", "RESILIENCE"
	AttackVector     string                 `json:"attack_vector"`      // Description of the attack vector
	ExpectedBehavior string                 `json:"expected_behavior"`  // Expected defense / containment
	ActualBehavior   string                 `json:"actual_behavior"`    // Observed behavior
	Status           ScenarioStatus         `json:"status"`             // PASS | FAIL | NOT_VERIFIED
	Evidence         map[string]interface{} `json:"evidence,omitempty"` // Non-sensitive proof (reason code, audit event ID, etc.)
	ExecutionTimeMs  int64                  `json:"execution_time_ms"`  // Execution duration in ms
}

// InvariantResult represents the verification status of a core security invariant.
type InvariantResult struct {
	ID          int            `json:"id"`
	Description string         `json:"description"`
	Status      ScenarioStatus `json:"status"`
	Details     string         `json:"details"`
}

// SecurityLabReport holds the full consolidated results of the Adversarial Security Lab run.
type SecurityLabReport struct {
	GeneratedAt        time.Time          `json:"generated_at"`
	TotalScenarios     int                `json:"total_scenarios"`
	PassedScenarios    int                `json:"passed_scenarios"`
	FailedScenarios    int                `json:"failed_scenarios"`
	InvariantsTotal    int                `json:"invariants_total"`
	InvariantsVerified int                `json:"invariants_verified"`
	Scenarios          []SecurityScenario `json:"scenarios"`
	Invariants         []InvariantResult  `json:"invariants"`
}

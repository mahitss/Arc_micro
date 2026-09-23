package constitution

import (
	"fmt"
	"time"
)

// TestRunReport summarizes the execution of a test suite against a candidate constitution.
type TestRunReport struct {
	ConstitutionID string    `json:"constitution_id"`
	Version        uint64    `json:"version"`
	Passed         bool      `json:"passed"`
	TotalTests     int       `json:"total_tests"`
	PassedTests    int       `json:"passed_tests"`
	FailedTests    int       `json:"failed_tests"`
	Failures       []string  `json:"failures,omitempty"`
	DurationMs     int64     `json:"duration_ms"`
	ExecutedAt     time.Time `json:"executed_at"`
}

// TestRunner executes PolicyTestCases against an EconomicConstitution.
type TestRunner struct {
	evaluator Evaluator
}

// NewTestRunner creates a new TestRunner.
func NewTestRunner(evaluator Evaluator) *TestRunner {
	if evaluator == nil {
		evaluator = NewEvaluator()
	}
	return &TestRunner{evaluator: evaluator}
}

// RunTestSuite evaluates a batch of test cases against a constitution.
func (r *TestRunner) RunTestSuite(c *EconomicConstitution, cases []PolicyTestCase) TestRunReport {
	start := time.Now()
	report := TestRunReport{
		ConstitutionID: c.ConstitutionID,
		Version:        c.Version,
		Passed:         true,
		TotalTests:     len(cases),
		Failures:       make([]string, 0),
		ExecutedAt:     start,
	}

	for _, tc := range cases {
		decision := r.evaluator.Evaluate(c, tc.Context)
		if decision.Decision != tc.ExpectedDecision {
			report.Passed = false
			report.FailedTests++
			report.Failures = append(report.Failures, fmt.Sprintf("Test '%s' failed: expected decision %s, got %s (Reason: %s)", tc.Name, tc.ExpectedDecision, decision.Decision, decision.Reason))
			continue
		}

		if tc.ExpectedReasonCode != "" && decision.ReasonCode != tc.ExpectedReasonCode {
			report.Passed = false
			report.FailedTests++
			report.Failures = append(report.Failures, fmt.Sprintf("Test '%s' failed: expected reason code %s, got %s", tc.Name, tc.ExpectedReasonCode, decision.ReasonCode))
			continue
		}

		report.PassedTests++
	}

	report.DurationMs = time.Since(start).Milliseconds()
	return report
}

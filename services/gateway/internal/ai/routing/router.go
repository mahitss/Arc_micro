package routing

import (
	"os"
	"strings"
	"sync"
)

// TaskType identifies the functional category for an AI reasoning task.
type TaskType string

const (
	TaskTypePlanning     TaskType = "AI_TASK_PLANNING"
	TaskTypeNegotiation  TaskType = "AI_SERVICE_NEGOTIATION"
	TaskTypeEvaluation   TaskType = "AI_RESULT_EVALUATION"
	TaskTypeReplanning   TaskType = "AI_REPLANNING"
	TaskTypeSwarm        TaskType = "AI_SWARM_SYNTHESIS"
	TaskTypeMarketplace  TaskType = "AI_MARKETPLACE_REASONING"
	TaskTypeProtocol     TaskType = "AI_PROTOCOL_REASONING"
	TaskTypeControlTower TaskType = "AI_CONTROL_TOWER_ASSISTANT"
)

// ModelProfile defines the primary model and fallback cascade for a given task type.
type ModelProfile struct {
	TaskType       TaskType `json:"task_type"`
	PrimaryModel   string   `json:"primary_model"`
	FallbackModels []string `json:"fallback_models"`
	Description    string   `json:"description"`
}

// ModelRouter resolves appropriate model selections and fallbacks per task type.
// SECURITY INVARIANT:
// Model selection dynamically routes intelligence, but MUST NEVER alter:
// spending limits, recipient authority, policy checks, risk thresholds,
// approval requirements, treasury limits, or AgentVault rules.
type ModelRouter struct {
	mu              sync.RWMutex
	defaultModel    string
	globalFallbacks []string
	profiles        map[TaskType]ModelProfile
}

// NewModelRouter initializes the router from environment variables.
func NewModelRouter() *ModelRouter {
	defaultModel := os.Getenv("OPENROUTER_MODEL")
	if defaultModel == "" {
		defaultModel = os.Getenv("AI_MODEL")
	}
	if defaultModel == "" {
		defaultModel = "nvidia/nemotron-3-ultra-550b-a55b:free"
	}

	rawFallbacks := os.Getenv("OPENROUTER_FALLBACK_MODELS")
	if rawFallbacks == "" {
		rawFallbacks = os.Getenv("AI_FALLBACK_MODELS")
	}
	var fallbacks []string
	if rawFallbacks != "" {
		for _, m := range strings.Split(rawFallbacks, ",") {
			trimmed := strings.TrimSpace(m)
			if trimmed != "" {
				fallbacks = append(fallbacks, trimmed)
			}
		}
	}
	if len(fallbacks) == 0 {
		fallbacks = []string{
			"cohere/north-mini-code:free",
			"google/gemma-4-31b-it:free",
			"poolside/laguna-s-2.1:free",
		}
	}

	router := &ModelRouter{
		defaultModel:    defaultModel,
		globalFallbacks: fallbacks,
		profiles:        make(map[TaskType]ModelProfile),
	}

	// Load task-specific overrides from environment
	router.registerProfile(TaskTypePlanning, "AI_MODEL_PLANNER", "Decomposes high-level missions into executable stages")
	router.registerProfile(TaskTypeNegotiation, "AI_MODEL_NEGOTIATION", "Engages in multi-round service quote negotiations")
	router.registerProfile(TaskTypeEvaluation, "AI_MODEL_EVALUATOR", "Assesses quality and validity of untrusted deliverable datasets")
	router.registerProfile(TaskTypeReplanning, "AI_MODEL_REPLANNER", "Recovers and recalculates strategy upon stage failure")
	router.registerProfile(TaskTypeSwarm, "AI_MODEL_SWARM", "Synthesizes multi-agent swarm tasks and aggregation")
	router.registerProfile(TaskTypeMarketplace, "AI_MODEL_MARKETPLACE", "Matches objectives with commercial service capabilities")
	router.registerProfile(TaskTypeProtocol, "AI_MODEL_PROTOCOL", "Analyzes clearinghouse, netting, and network dynamics")
	router.registerProfile(TaskTypeControlTower, "AI_MODEL_CONTROL_TOWER", "Assists operators in Control Tower observability")

	return router
}

func (r *ModelRouter) registerProfile(task TaskType, envKey string, description string) {
	primary := os.Getenv(envKey)
	if primary == "" {
		primary = r.defaultModel
	}

	// Support comma-separated model and fallback configuration
	var primaryModel string
	var specificFallbacks []string
	if strings.Contains(primary, ",") {
		parts := strings.Split(primary, ",")
		primaryModel = strings.TrimSpace(parts[0])
		for _, p := range parts[1:] {
			if t := strings.TrimSpace(p); t != "" {
				specificFallbacks = append(specificFallbacks, t)
			}
		}
	} else {
		primaryModel = primary
	}

	if len(specificFallbacks) == 0 {
		specificFallbacks = r.globalFallbacks
	}

	r.profiles[task] = ModelProfile{
		TaskType:       task,
		PrimaryModel:   primaryModel,
		FallbackModels: specificFallbacks,
		Description:    description,
	}
}

// Resolve returns the primary model and fallback cascade for a given task.
func (r *ModelRouter) Resolve(task TaskType) (string, []string) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	profile, exists := r.profiles[task]
	if !exists {
		return r.defaultModel, r.globalFallbacks
	}
	return profile.PrimaryModel, profile.FallbackModels
}

// GetAllProfiles returns a snapshot of all active model profiles for observability and settings UI.
func (r *ModelRouter) GetAllProfiles() []ModelProfile {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var list []ModelProfile
	for _, p := range r.profiles {
		list = append(list, p)
	}
	return list
}

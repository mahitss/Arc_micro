package economy

import (
	"errors"
	"fmt"
	"math/big"
	"strings"
)

var (
	ErrCyclicTaskGraph          = errors.New("cyclic dependency detected in swarm task graph")
	ErrMaxTasksExceeded         = errors.New("swarm task count exceeds maximum ceiling")
	ErrMaxDepthExceeded         = errors.New("swarm dependency depth exceeds maximum ceiling")
	ErrTaskBudgetExceedsSwarm   = errors.New("cumulative task budgets exceed authorized swarm budget")
	ErrMissingTaskDependency    = errors.New("task references a non-existent dependency")
	ErrInvalidTaskCapability    = errors.New("task has invalid or empty capability")
	ErrDuplicateTaskID          = errors.New("duplicate task ID detected in swarm graph")
	ErrCrossSwarmReference      = errors.New("cross-swarm reference detected in task graph")
)

const (
	DefaultMaxSwarmTasks = 20
	DefaultMaxSwarmDepth = 4
)

// SwarmGraphValidator executes deterministic validation over swarm task graphs.
type SwarmGraphValidator struct {
	maxTasks int
	maxDepth int
}

// NewSwarmGraphValidator initializes a new validator.
func NewSwarmGraphValidator(maxTasks, maxDepth int) *SwarmGraphValidator {
	if maxTasks <= 0 {
		maxTasks = DefaultMaxSwarmTasks
	}
	if maxDepth <= 0 {
		maxDepth = DefaultMaxSwarmDepth
	}
	return &SwarmGraphValidator{
		maxTasks: maxTasks,
		maxDepth: maxDepth,
	}
}

// ValidationResult captures detailed output from graph validation.
type ValidationResult struct {
	Valid          bool     `json:"valid"`
	Depth          int      `json:"depth"`
	TotalTasks     int      `json:"total_tasks"`
	TotalBudget    string   `json:"total_budget"`
	TopologicalOrd []string `json:"topological_order,omitempty"`
	Errors         []string `json:"errors,omitempty"`
}

// ValidateDAG performs comprehensive deterministic verification of a swarm task graph.
func (v *SwarmGraphValidator) ValidateDAG(swarm *Swarm, tasks []*TaskNode) (*ValidationResult, error) {
	res := &ValidationResult{
		TotalTasks: len(tasks),
		Errors:     make([]string, 0),
	}

	if len(tasks) == 0 {
		res.Errors = append(res.Errors, "task graph cannot be empty")
		res.Valid = false
		return res, errors.New("empty task graph")
	}

	if len(tasks) > v.maxTasks {
		err := fmt.Errorf("%w: %d tasks requested, max allowed is %d", ErrMaxTasksExceeded, len(tasks), v.maxTasks)
		res.Errors = append(res.Errors, err.Error())
		res.Valid = false
		return res, err
	}

	// 1. Check duplicate IDs and cross-swarm references
	taskMap := make(map[string]*TaskNode)
	for _, t := range tasks {
		if strings.TrimSpace(t.TaskID) == "" {
			err := errors.New("task ID cannot be empty")
			res.Errors = append(res.Errors, err.Error())
			return res, err
		}
		if _, exists := taskMap[t.TaskID]; exists {
			err := fmt.Errorf("%w: task ID %s", ErrDuplicateTaskID, t.TaskID)
			res.Errors = append(res.Errors, err.Error())
			return res, err
		}
		if t.SwarmID != swarm.ID {
			err := fmt.Errorf("%w: task %s has swarm %s, expected %s", ErrCrossSwarmReference, t.TaskID, t.SwarmID, swarm.ID)
			res.Errors = append(res.Errors, err.Error())
			return res, err
		}
		if strings.TrimSpace(t.RequiredCapability) == "" {
			err := fmt.Errorf("%w: task %s", ErrInvalidTaskCapability, t.TaskID)
			res.Errors = append(res.Errors, err.Error())
			return res, err
		}
		taskMap[t.TaskID] = t
	}

	// 2. Validate Budget Ceiling
	swarmBudgetInt := new(big.Int)
	swarmBudgetInt.SetString(swarm.Budget, 10)
	cumulativeTaskBudget := new(big.Int)

	for _, t := range tasks {
		tBudgetInt := new(big.Int)
		if t.Budget != "" {
			tBudgetInt.SetString(t.Budget, 10)
		}
		cumulativeTaskBudget.Add(cumulativeTaskBudget, tBudgetInt)
	}

	res.TotalBudget = cumulativeTaskBudget.String()
	if cumulativeTaskBudget.Cmp(swarmBudgetInt) > 0 {
		err := fmt.Errorf("%w: cumulative task budget %s exceeds swarm budget %s", ErrTaskBudgetExceedsSwarm, cumulativeTaskBudget.String(), swarm.Budget)
		res.Errors = append(res.Errors, err.Error())
		res.Valid = false
		return res, err
	}

	// 3. Verify all dependencies exist and build adjacency & in-degree lists for Kahn's algorithm
	inDegree := make(map[string]int)
	adjList := make(map[string][]string) // dependency -> list of dependent tasks

	for _, t := range tasks {
		inDegree[t.TaskID] = 0
	}

	for _, t := range tasks {
		for _, depID := range t.Dependencies {
			if _, exists := taskMap[depID]; !exists {
				err := fmt.Errorf("%w: task %s depends on missing task %s", ErrMissingTaskDependency, t.TaskID, depID)
				res.Errors = append(res.Errors, err.Error())
				res.Valid = false
				return res, err
			}
			if depID == t.TaskID {
				err := fmt.Errorf("%w: self-referential cycle on task %s", ErrCyclicTaskGraph, t.TaskID)
				res.Errors = append(res.Errors, err.Error())
				res.Valid = false
				return res, err
			}
			adjList[depID] = append(adjList[depID], t.TaskID)
			inDegree[t.TaskID]++
		}
	}

	// 4. Kahn's algorithm for Cycle Detection and Topological Sort
	queue := make([]string, 0)
	for taskID, deg := range inDegree {
		if deg == 0 {
			queue = append(queue, taskID)
		}
	}

	topologicalOrder := make([]string, 0, len(tasks))
	depthMap := make(map[string]int)
	for _, rootID := range queue {
		depthMap[rootID] = 1
	}

	maxGraphDepth := 0
	for len(queue) > 0 {
		curr := queue[0]
		queue = queue[1:]
		topologicalOrder = append(topologicalOrder, curr)

		currDepth := depthMap[curr]
		if currDepth > maxGraphDepth {
			maxGraphDepth = currDepth
		}

		for _, neighbor := range adjList[curr] {
			inDegree[neighbor]--
			if inDegree[neighbor] == 0 {
				queue = append(queue, neighbor)
			}
			// Update neighbor depth
			if depthMap[neighbor] < currDepth+1 {
				depthMap[neighbor] = currDepth + 1
			}
		}
	}

	if len(topologicalOrder) != len(tasks) {
		err := fmt.Errorf("%w: graph contains cycles, only %d of %d tasks reachable", ErrCyclicTaskGraph, len(topologicalOrder), len(tasks))
		res.Errors = append(res.Errors, err.Error())
		res.Valid = false
		return res, err
	}

	res.TopologicalOrd = topologicalOrder
	res.Depth = maxGraphDepth

	// 5. Verify Maximum Depth Limit
	if maxGraphDepth > v.maxDepth {
		err := fmt.Errorf("%w: graph depth is %d, maximum allowed is %d", ErrMaxDepthExceeded, maxGraphDepth, v.maxDepth)
		res.Errors = append(res.Errors, err.Error())
		res.Valid = false
		return res, err
	}

	res.Valid = true
	return res, nil
}

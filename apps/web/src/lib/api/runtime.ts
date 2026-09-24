import { apiRequest } from './client';

export type WorkflowState =
  | 'CREATED'
  | 'READY'
  | 'RUNNING'
  | 'WAITING'
  | 'PAUSED'
  | 'RETRYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'ABORTED';

export type StepState =
  | 'PENDING'
  | 'CLAIMED'
  | 'RUNNING'
  | 'WAITING'
  | 'SUCCEEDED'
  | 'RETRYABLE_FAILURE'
  | 'PERMANENT_FAILURE'
  | 'CANCELLED'
  | 'EXPIRED';

export type WorkerStatus =
  | 'STARTING'
  | 'HEALTHY'
  | 'DRAINING'
  | 'STOPPED'
  | 'STALE';

export interface DurableWorkflow {
  workflow_id: string;
  tenant_id: string;
  workflow_type: string;
  aggregate_type: string;
  aggregate_id: string;
  state: WorkflowState;
  version: number;
  priority: number;
  idempotency_key: string;
  parent_workflow_id?: string;
  correlation_id?: string;
  current_step?: string;
  failure_reason?: string;
  retry_count: number;
  deadline?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface ExecutionStep {
  step_id: string;
  workflow_id: string;
  tenant_id: string;
  step_type: string;
  sequence: number;
  state: StepState;
  attempt: number;
  idempotency_key: string;
  input_hash?: string;
  output_hash?: string;
  lease_owner?: string;
  lease_expires_at?: string;
  timeout_seconds: number;
  next_retry_at?: string;
  error_code?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
}

export interface RuntimeCheckpoint {
  checkpoint_id: string;
  workflow_id: string;
  step_id?: string;
  tenant_id: string;
  state_hash: string;
  event_position: number;
  schema_version: number;
  snapshot_data: Record<string, any>;
  created_at: string;
}

export interface RuntimeWorker {
  worker_id: string;
  worker_type: string;
  hostname: string;
  status: WorkerStatus;
  capabilities?: Record<string, any>;
  version: string;
  heartbeat_at: string;
  last_seen: string;
  created_at: string;
}

export interface RuntimeIncident {
  incident_id: string;
  tenant_id: string;
  workflow_id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  state: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  detected_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  root_cause?: string;
  evidence?: Record<string, any>;
  remediation?: string;
  correlation_id?: string;
}

export interface RuntimeMetrics {
  active_workflows: number;
  waiting_workflows: number;
  retry_rate_bps: number;
  failure_rate_bps: number;
  recovery_rate_bps: number;
  average_step_duration_ms: number;
  lease_expirations_count: number;
  stale_worker_count: number;
  queue_depth: number;
  deadline_violations_count: number;
  reconciliation_queue_size: number;
  ambiguous_operations: number;
  worker_utilization_pct: number;
}

export interface QueueMetrics {
  queue_depth: number;
  active_workflows: number;
  waiting_workflows: number;
  reconciliation_queue_size: number;
  worker_utilization_pct: number;
}

// -------------------------------------------------------------
// Fallback deterministic fixtures for offline / demonstration
// -------------------------------------------------------------

export const FALLBACK_METRICS: RuntimeMetrics = {
  active_workflows: 4,
  waiting_workflows: 1,
  retry_rate_bps: 150,
  failure_rate_bps: 25,
  recovery_rate_bps: 9875,
  average_step_duration_ms: 320,
  lease_expirations_count: 2,
  stale_worker_count: 0,
  queue_depth: 3,
  deadline_violations_count: 0,
  reconciliation_queue_size: 1,
  ambiguous_operations: 0,
  worker_utilization_pct: 0.45,
};

export const FALLBACK_QUEUES: QueueMetrics = {
  queue_depth: 3,
  active_workflows: 4,
  waiting_workflows: 1,
  reconciliation_queue_size: 1,
  worker_utilization_pct: 0.45,
};

export const FALLBACK_WORKFLOWS: DurableWorkflow[] = [
  {
    workflow_id: 'wf_msn_macro_01',
    tenant_id: 'tenant_default',
    workflow_type: 'MISSION_EXECUTION',
    aggregate_type: 'MISSION',
    aggregate_id: 'msn_global_macro',
    state: 'RUNNING',
    version: 4,
    priority: 10,
    idempotency_key: 'idem_wf_macro_01',
    current_step: 'step_collect_quotes',
    retry_count: 1,
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    workflow_id: 'wf_swarm_infra_02',
    tenant_id: 'tenant_default',
    workflow_type: 'SWARM_ORCHESTRATION',
    aggregate_type: 'SWARM',
    aggregate_id: 'swm_infra_scan',
    state: 'WAITING',
    version: 7,
    priority: 8,
    idempotency_key: 'idem_wf_infra_02',
    current_step: 'step_barrier_validation',
    retry_count: 0,
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    workflow_id: 'wf_clearing_settle_03',
    tenant_id: 'tenant_default',
    workflow_type: 'CLEARING_SETTLEMENT',
    aggregate_type: 'OBLIGATION',
    aggregate_id: 'ob_live_01',
    state: 'COMPLETED',
    version: 12,
    priority: 15,
    idempotency_key: 'idem_wf_settle_03',
    current_step: 'step_finalize_ledger',
    retry_count: 0,
    completed_at: new Date(Date.now() - 10 * 60000).toISOString(),
    created_at: new Date(Date.now() - 40 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 60000).toISOString(),
  },
];

export const FALLBACK_STEPS: ExecutionStep[] = [
  {
    step_id: 'step_01_discover',
    workflow_id: 'wf_msn_macro_01',
    tenant_id: 'tenant_default',
    step_type: 'SERVICE_DISCOVERY',
    sequence: 1,
    state: 'SUCCEEDED',
    attempt: 1,
    idempotency_key: 'idem_step_01_discover',
    timeout_seconds: 30,
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 60000).toISOString(),
  },
  {
    step_id: 'step_collect_quotes',
    workflow_id: 'wf_msn_macro_01',
    tenant_id: 'tenant_default',
    step_type: 'QUOTE_COLLECTION',
    sequence: 2,
    state: 'RUNNING',
    attempt: 2,
    idempotency_key: 'idem_step_collect_quotes',
    lease_owner: 'worker_node_alpha',
    lease_expires_at: new Date(Date.now() + 45000).toISOString(),
    timeout_seconds: 60,
    created_at: new Date(Date.now() - 14 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60000).toISOString(),
  },
  {
    step_id: 'step_barrier_validation',
    workflow_id: 'wf_msn_macro_01',
    tenant_id: 'tenant_default',
    step_type: 'FINANCIAL_BARRIER_EVALUATION',
    sequence: 3,
    state: 'PENDING',
    attempt: 0,
    idempotency_key: 'idem_step_barrier_validation',
    timeout_seconds: 15,
    created_at: new Date(Date.now() - 14 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 60000).toISOString(),
  },
];

export const FALLBACK_CHECKPOINTS: RuntimeCheckpoint[] = [
  {
    checkpoint_id: 'cp_01_init',
    workflow_id: 'wf_msn_macro_01',
    step_id: 'step_01_discover',
    tenant_id: 'tenant_default',
    state_hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
    event_position: 1,
    schema_version: 1,
    snapshot_data: { status: 'DISCOVERED', provider_count: 3 },
    created_at: new Date(Date.now() - 14 * 60000).toISOString(),
  },
];

export const FALLBACK_WORKERS: RuntimeWorker[] = [
  {
    worker_id: 'worker_node_alpha',
    worker_type: 'STANDARD_EXECUTOR',
    hostname: 'worker-eu-west-1.agentpay.network',
    status: 'HEALTHY',
    version: '1.0.0-durable-runtime',
    heartbeat_at: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    worker_id: 'worker_node_beta',
    worker_type: 'FINANCIAL_RECONCILER',
    hostname: 'worker-us-east-1.agentpay.network',
    status: 'HEALTHY',
    version: '1.0.0-durable-runtime',
    heartbeat_at: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const FALLBACK_INCIDENTS: RuntimeIncident[] = [
  {
    incident_id: 'inc_rt_01',
    tenant_id: 'tenant_default',
    workflow_id: 'wf_msn_macro_01',
    severity: 'MEDIUM',
    category: 'LEASE_FAILURE',
    state: 'RESOLVED',
    detected_at: new Date(Date.now() - 10 * 60000).toISOString(),
    resolved_at: new Date(Date.now() - 8 * 60000).toISOString(),
    root_cause: 'Worker process node heartbeat timed out during network partition',
    remediation: 'Fencing token incremented; step reclaimed by worker_node_alpha and safely resumed from checkpoint',
    correlation_id: 'corr_lease_01',
  },
  {
    incident_id: 'inc_rt_02',
    tenant_id: 'tenant_default',
    workflow_id: 'wf_clearing_settle_03',
    severity: 'HIGH',
    category: 'PAYMENT_AMBIGUITY',
    state: 'OPEN',
    detected_at: new Date(Date.now() - 5 * 60000).toISOString(),
    root_cause: 'Network dropped during Arc submission confirmation',
    remediation: 'Classified as AMBIGUOUS; routed to reconciliation queue for deterministic on-chain query (INV-106)',
    correlation_id: 'corr_ambiguous_02',
  },
];

// -------------------------------------------------------------
// API Client Methods
// -------------------------------------------------------------

export async function fetchRuntimeMetrics(): Promise<RuntimeMetrics> {
  try {
    return await apiRequest<RuntimeMetrics>('/v1/runtime/metrics', { method: 'GET' });
  } catch {
    return FALLBACK_METRICS;
  }
}

export async function fetchRuntimeQueues(): Promise<QueueMetrics> {
  try {
    return await apiRequest<QueueMetrics>('/v1/runtime/queues', { method: 'GET' });
  } catch {
    return FALLBACK_QUEUES;
  }
}

export async function fetchRuntimeWorkflows(state?: string, limit?: number): Promise<{ workflows: DurableWorkflow[]; count: number }> {
  const query = new URLSearchParams();
  if (state && state !== 'ALL') query.set('state', state);
  if (limit) query.set('limit', String(limit));
  const qs = query.toString() ? `?${query.toString()}` : '';

  try {
    return await apiRequest<{ workflows: DurableWorkflow[]; count: number }>(`/v1/runtime/workflows${qs}`, { method: 'GET' });
  } catch {
    let filtered = FALLBACK_WORKFLOWS;
    if (state && state !== 'ALL') {
      filtered = FALLBACK_WORKFLOWS.filter((w) => w.state === state);
    }
    return { workflows: filtered, count: filtered.length };
  }
}

export async function fetchRuntimeWorkflow(id: string): Promise<DurableWorkflow> {
  try {
    return await apiRequest<DurableWorkflow>(`/v1/runtime/workflows/${encodeURIComponent(id)}`, { method: 'GET' });
  } catch {
    const found = FALLBACK_WORKFLOWS.find((w) => w.workflow_id === id);
    return found || FALLBACK_WORKFLOWS[0];
  }
}

export async function fetchWorkflowSteps(id: string): Promise<{ workflow_id: string; steps: ExecutionStep[]; count: number }> {
  try {
    return await apiRequest<{ workflow_id: string; steps: ExecutionStep[]; count: number }>(`/v1/runtime/workflows/${encodeURIComponent(id)}/steps`, { method: 'GET' });
  } catch {
    return { workflow_id: id, steps: FALLBACK_STEPS, count: FALLBACK_STEPS.length };
  }
}

export async function fetchWorkflowCheckpoints(id: string): Promise<{ workflow_id: string; checkpoints: RuntimeCheckpoint[]; count: number }> {
  try {
    return await apiRequest<{ workflow_id: string; checkpoints: RuntimeCheckpoint[]; count: number }>(`/v1/runtime/workflows/${encodeURIComponent(id)}/checkpoints`, { method: 'GET' });
  } catch {
    return { workflow_id: id, checkpoints: FALLBACK_CHECKPOINTS, count: FALLBACK_CHECKPOINTS.length };
  }
}

export async function fetchRuntimeWorkers(): Promise<{ workers: RuntimeWorker[]; count: number }> {
  try {
    return await apiRequest<{ workers: RuntimeWorker[]; count: number }>('/v1/runtime/workers', { method: 'GET' });
  } catch {
    return { workers: FALLBACK_WORKERS, count: FALLBACK_WORKERS.length };
  }
}

export async function fetchRecoveryQueue(): Promise<{ recovery_steps: ExecutionStep[]; count: number }> {
  try {
    return await apiRequest<{ recovery_steps: ExecutionStep[]; count: number }>('/v1/runtime/recovery', { method: 'GET' });
  } catch {
    const recoverySteps = FALLBACK_STEPS.filter((s) => s.state === 'RETRYABLE_FAILURE' || s.attempt > 1);
    return { recovery_steps: recoverySteps, count: recoverySteps.length };
  }
}

export async function fetchRuntimeIncidents(state?: string): Promise<{ incidents: RuntimeIncident[]; count: number }> {
  const query = new URLSearchParams();
  if (state && state !== 'ALL') query.set('state', state);
  const qs = query.toString() ? `?${query.toString()}` : '';

  try {
    return await apiRequest<{ incidents: RuntimeIncident[]; count: number }>(`/v1/runtime/incidents${qs}`, { method: 'GET' });
  } catch {
    let filtered = FALLBACK_INCIDENTS;
    if (state && state !== 'ALL') {
      filtered = FALLBACK_INCIDENTS.filter((i) => i.state === state);
    }
    return { incidents: filtered, count: filtered.length };
  }
}

export async function pauseWorkflow(workflowId: string, reason?: string): Promise<DurableWorkflow> {
  return await apiRequest<DurableWorkflow>(`/v1/runtime/workflows/${encodeURIComponent(workflowId)}/pause`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason || 'Operator paused workflow' }),
  });
}

export async function resumeWorkflow(workflowId: string): Promise<DurableWorkflow> {
  return await apiRequest<DurableWorkflow>(`/v1/runtime/workflows/${encodeURIComponent(workflowId)}/resume`, {
    method: 'POST',
  });
}

export async function cancelWorkflow(workflowId: string, reason?: string): Promise<DurableWorkflow> {
  return await apiRequest<DurableWorkflow>(`/v1/runtime/workflows/${encodeURIComponent(workflowId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason || 'Operator cancelled workflow' }),
  });
}

export async function retryWorkflowStep(workflowId: string, stepId: string): Promise<ExecutionStep> {
  return await apiRequest<ExecutionStep>(`/v1/runtime/workflows/${encodeURIComponent(workflowId)}/retry`, {
    method: 'POST',
    body: JSON.stringify({ step_id: stepId }),
  });
}

export async function reconcileIncident(incidentId: string): Promise<{ incident_id: string; status: string; message: string }> {
  return await apiRequest<{ incident_id: string; status: string; message: string }>(`/v1/runtime/incidents/${encodeURIComponent(incidentId)}/reconcile`, {
    method: 'POST',
  });
}

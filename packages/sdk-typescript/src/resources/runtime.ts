import type { AgentPay } from '../client.js';
import type {
  CreateWorkflowParams,
  DurableWorkflow,
  ExecutionStep,
  RequestOptions,
  RuntimeCheckpoint,
  RuntimeIncident,
  RuntimeMetrics,
  RuntimeWorker,
} from '../types.js';

/**
 * RuntimeResource provides programmatic control and observability
 * over the AgentPay Autonomous Operations & Durable Runtime.
 *
 * CORE INVARIANT:
 * Autonomy may continue through failures; financial authority must never expand during recovery.
 * Strictly adheres to INV-101 through INV-120.
 */
export class RuntimeResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * Instantiate a new durable workflow.
   */
  async createWorkflow(
    params: CreateWorkflowParams,
    options?: RequestOptions
  ): Promise<DurableWorkflow> {
    return this.client.request<DurableWorkflow>(
      '/v1/runtime/workflows',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      options
    );
  }

  /**
   * Retrieve a durable workflow by its ID.
   */
  async getWorkflow(
    workflowId: string,
    options?: RequestOptions
  ): Promise<DurableWorkflow> {
    return this.client.request<DurableWorkflow>(
      `/v1/runtime/workflows/${workflowId}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * List workflows with optional state and tenant filtering.
   */
  async listWorkflows(
    params?: { state?: string; limit?: number },
    options?: RequestOptions
  ): Promise<{ workflows: DurableWorkflow[]; count: number }> {
    const query = new URLSearchParams();
    if (params?.state) query.set('state', params.state);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';

    return this.client.request<{ workflows: DurableWorkflow[]; count: number }>(
      `/v1/runtime/workflows${qs}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Pause an active workflow.
   */
  async pauseWorkflow(
    workflowId: string,
    reason?: string,
    options?: RequestOptions
  ): Promise<DurableWorkflow> {
    return this.client.request<DurableWorkflow>(
      `/v1/runtime/workflows/${workflowId}/pause`,
      {
        method: 'POST',
        body: JSON.stringify({ reason: reason || 'Operator paused workflow' }),
      },
      options
    );
  }

  /**
   * Resume a paused workflow after re-validating preconditions.
   */
  async resumeWorkflow(
    workflowId: string,
    options?: RequestOptions
  ): Promise<DurableWorkflow> {
    return this.client.request<DurableWorkflow>(
      `/v1/runtime/workflows/${workflowId}/resume`,
      { method: 'POST' },
      options
    );
  }

  /**
   * Cancel an in-flight workflow safely.
   */
  async cancelWorkflow(
    workflowId: string,
    reason?: string,
    options?: RequestOptions
  ): Promise<DurableWorkflow> {
    return this.client.request<DurableWorkflow>(
      `/v1/runtime/workflows/${workflowId}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify({ reason: reason || 'Operator cancelled workflow' }),
      },
      options
    );
  }

  /**
   * Retry a retryable execution step within a workflow.
   */
  async retryStep(
    workflowId: string,
    stepId: string,
    options?: RequestOptions
  ): Promise<ExecutionStep> {
    return this.client.request<ExecutionStep>(
      `/v1/runtime/workflows/${workflowId}/retry`,
      {
        method: 'POST',
        body: JSON.stringify({ step_id: stepId }),
      },
      options
    );
  }

  /**
   * List all execution steps for a workflow.
   */
  async listSteps(
    workflowId: string,
    options?: RequestOptions
  ): Promise<{ workflow_id: string; steps: ExecutionStep[]; count: number }> {
    return this.client.request<{ workflow_id: string; steps: ExecutionStep[]; count: number }>(
      `/v1/runtime/workflows/${workflowId}/steps`,
      { method: 'GET' },
      options
    );
  }

  /**
   * List checkpoints captured for a workflow.
   */
  async listCheckpoints(
    workflowId: string,
    options?: RequestOptions
  ): Promise<{ workflow_id: string; checkpoints: RuntimeCheckpoint[]; count: number }> {
    return this.client.request<{ workflow_id: string; checkpoints: RuntimeCheckpoint[]; count: number }>(
      `/v1/runtime/workflows/${workflowId}/checkpoints`,
      { method: 'GET' },
      options
    );
  }

  /**
   * List active and registered runtime workers.
   */
  async listWorkers(
    options?: RequestOptions
  ): Promise<{ workers: RuntimeWorker[]; count: number }> {
    return this.client.request<{ workers: RuntimeWorker[]; count: number }>(
      '/v1/runtime/workers',
      { method: 'GET' },
      options
    );
  }

  /**
   * Inspect current work queue metrics.
   */
  async getQueues(
    options?: RequestOptions
  ): Promise<{
    queue_depth: number;
    active_workflows: number;
    waiting_workflows: number;
    reconciliation_queue_size: number;
    worker_utilization_pct: number;
  }> {
    return this.client.request(
      '/v1/runtime/queues',
      { method: 'GET' },
      options
    );
  }

  /**
   * List steps currently awaiting automated recovery.
   */
  async getRecoveryQueue(
    options?: RequestOptions
  ): Promise<{ recovery_steps: ExecutionStep[]; count: number }> {
    return this.client.request<{ recovery_steps: ExecutionStep[]; count: number }>(
      '/v1/runtime/recovery',
      { method: 'GET' },
      options
    );
  }

  /**
   * List operational incidents detected by the runtime.
   */
  async listIncidents(
    params?: { state?: string },
    options?: RequestOptions
  ): Promise<{ incidents: RuntimeIncident[]; count: number }> {
    const query = new URLSearchParams();
    if (params?.state) query.set('state', params.state);
    const qs = query.toString() ? `?${query.toString()}` : '';

    return this.client.request<{ incidents: RuntimeIncident[]; count: number }>(
      `/v1/runtime/incidents${qs}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Reconcile and remediate an operational incident.
   */
  async reconcileIncident(
    incidentId: string,
    options?: RequestOptions
  ): Promise<{ incident_id: string; status: string; message: string }> {
    return this.client.request<{ incident_id: string; status: string; message: string }>(
      `/v1/runtime/incidents/${incidentId}/reconcile`,
      { method: 'POST' },
      options
    );
  }

  /**
   * Retrieve aggregate operational metrics for the runtime.
   */
  async getMetrics(
    options?: RequestOptions
  ): Promise<RuntimeMetrics> {
    return this.client.request<RuntimeMetrics>(
      '/v1/runtime/metrics',
      { method: 'GET' },
      options
    );
  }
}

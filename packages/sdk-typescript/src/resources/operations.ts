import type { AgentPay } from '../client.js';
import type {
  OperationsSnapshot,
  OperationsHealth,
  OperationsWorker,
  OperationsQueuesData,
  OperationsIncident,
  OperationalReplay,
  OperationalGraph,
  OperationsExplanation,
  OperationsNextAction,
  SystemStateAtSnapshot,
  RequestOptions,
} from '../types.js';

/**
 * OperationsResource provides supervisory observability and orchestration
 * for the AgentPay Autonomous Operations OS.
 *
 * CORE PRINCIPLE:
 * The Operations OS may orchestrate complexity; it must never orchestrate around financial controls.
 * Strictly adheres to machine-checked invariants INV-121 through INV-140.
 */
export class OperationsResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * Retrieve the top-level aggregated read-model snapshot.
   */
  async getOperationsSnapshot(options?: RequestOptions): Promise<OperationsSnapshot> {
    return this.client.request<OperationsSnapshot>(
      '/v1/operations/snapshot',
      { method: 'GET' },
      options
    );
  }

  /**
   * Run deterministic health probes across all runtime subsystems.
   */
  async getOperationsHealth(options?: RequestOptions): Promise<OperationsHealth> {
    return this.client.request<OperationsHealth>(
      '/v1/operations/health',
      { method: 'GET' },
      options
    );
  }

  /**
   * List active workers in the supervised fleet.
   */
  async getWorkers(options?: RequestOptions): Promise<{ workers: OperationsWorker[]; total: number }> {
    return this.client.request<{ workers: OperationsWorker[]; total: number }>(
      '/v1/operations/workers',
      { method: 'GET' },
      options
    );
  }

  /**
   * Get queue depths and dead-letter statistics.
   */
  async getQueues(options?: RequestOptions): Promise<OperationsQueuesData> {
    return this.client.request<OperationsQueuesData>(
      '/v1/operations/queues',
      { method: 'GET' },
      options
    );
  }

  /**
   * List correlated operational incidents.
   */
  async getIncidents(options?: RequestOptions): Promise<{ incidents: OperationsIncident[]; total: number }> {
    return this.client.request<{ incidents: OperationsIncident[]; total: number }>(
      '/v1/operations/incidents',
      { method: 'GET' },
      options
    );
  }

  /**
   * Apply an authorized, safe automatic mitigation to an operational incident.
   */
  async mitigateIncident(
    incidentId: string,
    action: string,
    options?: RequestOptions
  ): Promise<{ incident_id: string; action: string; status: string }> {
    return this.client.request<{ incident_id: string; action: string; status: string }>(
      `/v1/operations/incidents/${incidentId}/mitigate`,
      {
        method: 'POST',
        body: JSON.stringify({ action }),
      },
      options
    );
  }

  /**
   * Retrieve the read-only execution replay for a historical workflow.
   */
  async getWorkflowReplay(
    workflowId: string,
    options?: RequestOptions
  ): Promise<OperationalReplay> {
    return this.client.request<OperationalReplay>(
      `/v1/operations/replay/${workflowId}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Get the unified operational topology graph.
   */
  async getOperationalGraph(options?: RequestOptions): Promise<OperationalGraph> {
    return this.client.request<OperationalGraph>(
      '/v1/operations/graph',
      { method: 'GET' },
      options
    );
  }

  /**
   * Explain an operational event using structured causal reasoning.
   */
  async explainEvent(
    eventId: string,
    options?: RequestOptions
  ): Promise<OperationsExplanation> {
    return this.client.request<OperationsExplanation>(
      `/v1/operations/why/${eventId}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Deterministically predict the next operational step for a workflow.
   */
  async getNextAction(
    workflowId: string,
    options?: RequestOptions
  ): Promise<OperationsNextAction> {
    return this.client.request<OperationsNextAction>(
      `/v1/operations/next/${workflowId}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Reconstruct system state at a specific historical point in time.
   */
  async getStateAt(
    timestamp: string,
    options?: RequestOptions
  ): Promise<SystemStateAtSnapshot> {
    return this.client.request<SystemStateAtSnapshot>(
      `/v1/operations/state-at/${timestamp}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Get the operational event timeline with causal links.
   */
  async getTimeline(
    limit?: number,
    options?: RequestOptions
  ): Promise<{ events: any[]; total: number }> {
    const query = limit ? `?limit=${limit}` : '';
    return this.client.request<{ events: any[]; total: number }>(
      `/v1/operations/timeline${query}`,
      { method: 'GET' },
      options
    );
  }

  /**
   * Get the system component and Arc verification topology.
   */
  async getTopology(options?: RequestOptions): Promise<any> {
    return this.client.request<any>(
      '/v1/operations/topology',
      { method: 'GET' },
      options
    );
  }
}

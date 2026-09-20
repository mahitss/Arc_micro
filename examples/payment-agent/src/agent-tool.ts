import {
  AgentPay,
  type PaymentNextAction,
  type RequestPaymentInput,
  type RequestPaymentResult,
} from '@agentpay/sdk';

/**
 * AgentTool: Formalized AI agent tool contract for requesting payment.
 *
 * Untrusted AI agents call this tool when an external paid service is needed.
 * The tool never holds private keys, signs transactions, or chooses recipients.
 * It submits the request to AgentPay, which evaluates spending policies,
 * limits, and approvals deterministically.
 */
export class AgentPaymentTool {
  constructor(
    private readonly client: AgentPay,
    private readonly agentId: string
  ) {}

  /**
   * Request payment for an approved external service.
   *
   * @param input Parameters specifying the service, amount in base units, and purpose.
   * @returns Structured decision with actionable next_action for the agent.
   */
  async requestPayment(input: RequestPaymentInput): Promise<RequestPaymentResult> {
    try {
      const intent = await this.client.paymentIntents.create(
        {
          agentId: this.agentId,
          service: input.service_id,
          amount: input.amount,
          asset: input.asset || 'USDC',
          purpose: input.purpose,
          justification: input.justification,
        },
        {
          idempotencyKey: input.idempotency_key,
        }
      );

      const status = (intent.status || '').toUpperCase();
      const decision = intent.decision?.result || 'ALLOW';
      const risk = intent.decision?.risk;
      const reason = intent.decision?.reason;

      let nextAction: PaymentNextAction = 'CONTINUE';

      if (status === 'APPROVAL_REQUIRED' || decision === 'APPROVAL_REQUIRED') {
        nextAction = 'WAIT_FOR_APPROVAL';
      } else if (status === 'DENIED' || decision === 'DENY') {
        nextAction = 'HANDLE_DENIAL';
      } else if (status === 'FAILED') {
        nextAction = 'HANDLE_FAILURE';
      } else if (status === 'AUTHORIZED' || status === 'SUBMITTED' || status === 'EXECUTING') {
        nextAction = 'WAIT_FOR_EXECUTION';
      } else if (status === 'CONFIRMED') {
        nextAction = 'CONTINUE';
      }

      return {
        payment_intent_id: intent.id,
        status: intent.status,
        decision,
        risk,
        next_action: nextAction,
        reason,
      };
    } catch (err: any) {
      if (err.code === 'POLICY_DENIED') {
        return {
          payment_intent_id: '',
          status: 'DENIED',
          decision: 'DENY',
          next_action: 'HANDLE_DENIAL',
          reason: err.message,
        };
      }
      return {
        payment_intent_id: '',
        status: 'FAILED',
        decision: 'DENY',
        next_action: 'HANDLE_FAILURE',
        reason: err.message,
      };
    }
  }
}

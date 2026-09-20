import * as http from 'node:http';
import { AgentPay } from '@agentpay/sdk';

const PORT = 4000;
const WEBHOOK_SECRET = process.env.AGENTPAY_WEBHOOK_SECRET || 'whsec_demo_secret_1234567890abcdef1234567890abcdef';
const client = new AgentPay();

// In-memory idempotency cache (use Redis or PostgreSQL in production)
const processedEvents = new Set<string>();

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
    return;
  }

  // Accumulate raw request body
  const chunks: Buffer[] = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const rawBody = Buffer.concat(chunks);
    const signatureHeader = req.headers['agentpay-signature'] as string;

    console.log('\n[Webhook Received] Incoming event payload...');

    // 1. Verify cryptographic HMAC-SHA256 signature with replay protection (300s window)
    const isValid = client.webhooks.verifySignature({
      payload: rawBody,
      signature: signatureHeader,
      secret: WEBHOOK_SECRET,
      toleranceSeconds: 300,
    });

    if (!isValid) {
      console.error('❌ [Webhook Error] Invalid signature or expired timestamp.');
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid webhook signature' }));
      return;
    }

    // 2. Parse event payload
    try {
      const event = JSON.parse(rawBody.toString('utf-8'));
      console.log(`✅ [Webhook Verified] Event ID: ${event.id}, Type: ${event.type}`);

      // 3. Check idempotency: has this event already been processed?
      if (processedEvents.has(event.id)) {
        console.log(`ℹ️ [Webhook Idempotent] Duplicate delivery of event ${event.id}; skipping.`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'already_processed' }));
        return;
      }

      // 4. Process event
      processedEvents.add(event.id);
      console.log(`[Event Data] Intent ID: ${event.payment_intent_id || event.data?.intent_id}`);
      console.log(`[Event Lineage] Correlation: ${event.correlation_id}, Causation: ${event.causation_id}`);

      // Respond promptly with HTTP 200
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'received', id: event.id }));
    } catch (err: any) {
      console.error('❌ [Webhook Error] Failed to parse JSON body:', err.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Malformed JSON payload' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`🎧 AgentPay Webhook Receiver listening at http://localhost:${PORT}/webhook`);
  console.log(`   Configured Secret: ${WEBHOOK_SECRET.slice(0, 10)}...`);
});

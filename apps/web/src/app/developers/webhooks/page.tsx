'use client';

import React, { useState, useEffect } from 'react';

interface WebhookEndpoint {
  id: string;
  organization_id: string;
  url: string;
  description: string;
  subscribed_events: string[];
  enabled: boolean;
  failure_count: number;
  last_delivery_at?: string;
  created_at: string;
}

interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  event_id: string;
  event_type: string;
  status: string;
  http_status?: number;
  request_payload: string;
  response_body?: string;
  error_message?: string;
  attempt_count: number;
  latency_ms?: number;
  delivered_at?: string;
  created_at: string;
}

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<Record<string, WebhookDelivery[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [subscribedEvents, setSubscribedEvents] = useState('payment_intent.*,test.ping');
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchEndpoints = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/proxy/v1/webhooks');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEndpoints(data.endpoints || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveries = async (id: string) => {
    try {
      const res = await fetch(`/api/proxy/v1/webhooks/${id}/deliveries`);
      if (res.ok) {
        const data = await res.json();
        setDeliveries((prev) => ({ ...prev, [id]: data.deliveries || [] }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const events = subscribedEvents.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await fetch('/api/proxy/v1/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          description,
          subscribed_events: events.length ? events : ['*'],
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setNewSecret(data.secret);
      setUrl('');
      setDescription('');
      fetchEndpoints();
    } catch (e: any) {
      setError(e.message || 'Failed to create webhook');
    } finally {
      setCreating(false);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await fetch(`/api/proxy/v1/webhooks/${id}/test`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `HTTP ${res.status}`);
      }
      setTestResult(`Test Event Dispatched! Delivery Status: ${data.status} (HTTP ${data.delivery?.http_status || 'Pending'})`);
      loadDeliveries(id);
    } catch (e: any) {
      setTestResult(`Test Failed: ${e.message}`);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-[#F2F0EA]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#F2F0EA] flex items-center gap-3">
          <span className="p-2 rounded-lg bg-[#141414] border border-[#222222] text-[#D6A83A]">
            ⚡
          </span>
          Webhook Endpoints & Real-Time Events
        </h1>
        <p className="mt-1 text-sm text-[#716F69]">
          Subscribe external services to cryptographically signed (HMAC-SHA256) domain events across the complete payment lifecycle.
        </p>
      </div>

      {/* New Secret Banner */}
      {newSecret && (
        <div className="p-4 rounded-xl border border-[#222222] bg-[#0B0B0B] space-y-2">
          <div className="flex items-center gap-2 text-[#D6A83A] font-semibold text-sm font-mono">
            <span>🔐</span>
            <span>Webhook Signing Secret Generated (Shown Only Once)</span>
          </div>
          <p className="text-xs text-[#F2F0EA] font-mono break-all bg-[#141414] p-3 rounded-lg border border-[#222222] select-all">
            {newSecret}
          </p>
          <p className="text-xs text-[#D6A83A] font-mono">
            ⚠️ Store this secret safely. It will never be displayed again. Use it to verify <code className="font-mono text-[#F2F0EA]">AgentPay-Signature</code> headers.
          </p>
        </div>
      )}

      {/* Grid: Create Endpoint + Endpoint List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Endpoint Form */}
        <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] space-y-4">
          <h2 className="text-base font-semibold text-[#F2F0EA]">Register Endpoint</h2>
          <form onSubmit={handleCreate} className="space-y-4 text-xs font-mono">
            <div>
              <label className="block text-[#716F69] mb-1">Destination URL (HTTPS only)</label>
              <input
                type="url"
                required
                placeholder="https://api.yourdomain.com/webhooks"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#F2F0EA] placeholder-[#716F69] focus:outline-none focus:border-[#D6A83A]"
              />
            </div>

            <div>
              <label className="block text-[#716F69] mb-1">Description</label>
              <input
                type="text"
                placeholder="Production Billing Service"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#F2F0EA] placeholder-[#716F69] focus:outline-none focus:border-[#D6A83A]"
              />
            </div>

            <div>
              <label className="block text-[#716F69] mb-1">Subscribed Events (comma-separated)</label>
              <input
                type="text"
                placeholder="payment_intent.*,test.ping"
                value={subscribedEvents}
                onChange={(e) => setSubscribedEvents(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#F2F0EA] placeholder-[#716F69] focus:outline-none focus:border-[#D6A83A]"
              />
              <span className="text-[10px] text-[#716F69]">Supports wildcards like <code className="text-[#B0ADA5]">payment_intent.*</code> or <code className="text-[#B0ADA5]">*</code></span>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-2.5 rounded-lg bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold text-xs font-mono transition-colors disabled:opacity-50"
            >
              {creating ? 'Registering...' : 'Register Endpoint'}
            </button>
          </form>
        </div>

        {/* Endpoints List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#F2F0EA]">Configured Endpoints ({endpoints.length})</h2>
            <button
              onClick={fetchEndpoints}
              className="text-xs text-[#D6A83A] hover:underline font-mono"
            >
              Refresh
            </button>
          </div>

          {testResult && (
            <div className="p-3 rounded-lg bg-[#141414] border border-[#222222] text-xs font-mono text-[#F2F0EA]">
              {testResult}
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-[#716F69] text-xs font-mono">Loading endpoints...</div>
          ) : endpoints.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#101010] border border-[#222222] text-[#716F69] text-xs font-mono">
              No webhook endpoints configured. Register an HTTPS endpoint on the left to receive domain events.
            </div>
          ) : (
            <div className="space-y-4">
              {endpoints.map((ep) => (
                <div key={ep.id} className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-[#F2F0EA] font-semibold">{ep.description || 'Webhook Endpoint'}</span>
                        <span className="text-[#716F69]">({ep.id})</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] ${ep.enabled ? 'bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/20' : 'bg-[#D85C5C]/10 text-[#D85C5C] border border-[#D85C5C]/20'}`}>
                          {ep.enabled ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-[#B0ADA5] mt-1 break-all">
                        {ep.url}
                      </div>
                    </div>

                    <button
                      onClick={() => handleTest(ep.id)}
                      disabled={testingId === ep.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {testingId === ep.id ? 'Sending...' : '⚡ Test Ping'}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#716F69]">
                    <span>Events:</span>
                    {ep.subscribed_events.map((ev, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-[#141414] border border-[#222222] text-[#B0ADA5]">
                        {ev}
                      </span>
                    ))}
                    <span className="ml-auto text-[#716F69]">
                      Failures: {ep.failure_count}
                    </span>
                  </div>

                  {/* Delivery History Toggle */}
                  <div className="pt-2 border-t border-[#222222] flex items-center justify-between text-xs font-mono">
                    <button
                      onClick={() => loadDeliveries(ep.id)}
                      className="text-[#D6A83A] hover:underline"
                    >
                      View Delivery History
                    </button>
                    {ep.last_delivery_at && (
                      <span className="text-[10px] text-[#716F69]">
                        Last delivery: {new Date(ep.last_delivery_at).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Deliveries Drawer */}
                  {deliveries[ep.id] && (
                    <div className="mt-3 space-y-2">
                      <div className="text-[11px] font-mono text-[#716F69]">Recent Deliveries:</div>
                      {deliveries[ep.id].length === 0 ? (
                        <div className="text-xs text-[#716F69] font-mono italic">No deliveries recorded yet.</div>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {deliveries[ep.id].map((del) => (
                            <div key={del.id} className="p-2 rounded bg-[#0B0B0B] border border-[#222222] flex items-center justify-between text-[11px] font-mono">
                              <span className="text-[#B0ADA5]">{del.event_type}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${del.status === 'DELIVERED' ? 'text-[#2FB36F] bg-[#2FB36F]/10 border border-[#2FB36F]/30' : del.status === 'RETRYING' ? 'text-[#D6A83A] bg-[#D6A83A]/10 border border-[#D6A83A]/30' : 'text-[#D85C5C] bg-[#D85C5C]/10 border border-[#D85C5C]/30'}`}>
                                {del.status} {del.http_status ? `(${del.http_status})` : ''}
                              </span>
                              <span className="text-[#716F69]">{del.latency_ms ? `${del.latency_ms}ms` : ''}</span>
                              <span className="text-[#716F69] text-[10px]">{new Date(del.created_at).toLocaleTimeString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

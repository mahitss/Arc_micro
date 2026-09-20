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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
          <span className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
            ⚡
          </span>
          Webhook Endpoints & Real-Time Events
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Subscribe external services to cryptographically signed (HMAC-SHA256) domain events across the complete payment lifecycle.
        </p>
      </div>

      {/* New Secret Banner */}
      {newSecret && (
        <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-950/40 space-y-2">
          <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm">
            <span>🔐</span>
            <span>Webhook Signing Secret Generated (Shown Only Once)</span>
          </div>
          <p className="text-xs text-slate-300 font-mono break-all bg-black/40 p-3 rounded-lg border border-teal-500/20 select-all">
            {newSecret}
          </p>
          <p className="text-xs text-amber-400">
            ⚠️ Store this secret safely. It will never be displayed again. Use it to verify <code className="font-mono text-white">AgentPay-Signature</code> headers.
          </p>
        </div>
      )}

      {/* Grid: Create Endpoint + Endpoint List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Endpoint Form */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <h2 className="text-base font-semibold text-white">Register Endpoint</h2>
          <form onSubmit={handleCreate} className="space-y-4 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1">Destination URL (HTTPS only)</label>
              <input
                type="url"
                required
                placeholder="https://api.yourdomain.com/webhooks"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Description</label>
              <input
                type="text"
                placeholder="Production Billing Service"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Subscribed Events (comma-separated)</label>
              <input
                type="text"
                placeholder="payment_intent.*,test.ping"
                value={subscribedEvents}
                onChange={(e) => setSubscribedEvents(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
              />
              <span className="text-[10px] text-slate-500">Supports wildcards like <code className="text-teal-400">payment_intent.*</code> or <code className="text-teal-400">*</code></span>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold transition-colors disabled:opacity-50"
            >
              {creating ? 'Registering...' : 'Register Endpoint'}
            </button>
          </form>
        </div>

        {/* Endpoints List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Configured Endpoints ({endpoints.length})</h2>
            <button
              onClick={fetchEndpoints}
              className="text-xs text-teal-400 hover:underline"
            >
              Refresh
            </button>
          </div>

          {testResult && (
            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 text-xs font-mono text-teal-300">
              {testResult}
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">Loading endpoints...</div>
          ) : endpoints.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs font-mono">
              No webhook endpoints configured. Register an HTTPS endpoint on the left to receive domain events.
            </div>
          ) : (
            <div className="space-y-4">
              {endpoints.map((ep) => (
                <div key={ep.id} className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-white font-semibold">{ep.description || 'Webhook Endpoint'}</span>
                        <span className="text-slate-500">({ep.id})</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] ${ep.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          {ep.enabled ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-300 mt-1 break-all">
                        {ep.url}
                      </div>
                    </div>

                    <button
                      onClick={() => handleTest(ep.id)}
                      disabled={testingId === ep.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {testingId === ep.id ? 'Sending...' : '⚡ Test Ping'}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span>Events:</span>
                    {ep.subscribed_events.map((ev, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-teal-300">
                        {ev}
                      </span>
                    ))}
                    <span className="ml-auto text-slate-500">
                      Failures: {ep.failure_count}
                    </span>
                  </div>

                  {/* Delivery History Toggle */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <button
                      onClick={() => loadDeliveries(ep.id)}
                      className="text-teal-400 hover:underline"
                    >
                      View Delivery History
                    </button>
                    {ep.last_delivery_at && (
                      <span className="text-[10px] text-slate-500">
                        Last delivery: {new Date(ep.last_delivery_at).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Deliveries Drawer */}
                  {deliveries[ep.id] && (
                    <div className="mt-3 space-y-2">
                      <div className="text-[11px] font-mono text-slate-400">Recent Deliveries:</div>
                      {deliveries[ep.id].length === 0 ? (
                        <div className="text-xs text-slate-500 font-mono italic">No deliveries recorded yet.</div>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {deliveries[ep.id].map((del) => (
                            <div key={del.id} className="p-2 rounded bg-slate-950/80 border border-slate-800 flex items-center justify-between text-[11px] font-mono">
                              <span className="text-slate-300">{del.event_type}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${del.status === 'DELIVERED' ? 'text-emerald-400 bg-emerald-500/10' : del.status === 'RETRYING' ? 'text-amber-400 bg-amber-500/10' : 'text-red-400 bg-red-500/10'}`}>
                                {del.status} {del.http_status ? `(${del.http_status})` : ''}
                              </span>
                              <span className="text-slate-500">{del.latency_ms ? `${del.latency_ms}ms` : ''}</span>
                              <span className="text-slate-600 text-[10px]">{new Date(del.created_at).toLocaleTimeString()}</span>
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

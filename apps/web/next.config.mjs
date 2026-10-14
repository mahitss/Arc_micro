const gatewayUrl = (
  process.env.GATEWAY_URL ||
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080'
).replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/clearinghouse', destination: '/economy/clearing' },
      { source: '/clearinghouse/:path*', destination: '/economy/clearing/:path*' },
      { source: '/runtime', destination: '/control/runtime' },
      { source: '/runtime/:path*', destination: '/control/runtime/:path*' },
      { source: '/operations', destination: '/control/operations' },
      { source: '/operations/:path*', destination: '/control/operations/:path*' },
      { source: '/objectives', destination: '/control/objectives' },
      { source: '/objectives/:path*', destination: '/control/objectives/:path*' },
      { source: '/protocol', destination: '/control/protocol' },
      { source: '/protocol/:path*', destination: '/control/protocol/:path*' },
      { source: '/swarm', destination: '/swarms' },
      { source: '/swarm/:path*', destination: '/swarms/:path*' },
      { source: '/replay', destination: '/control/operations/timeline' },
      { source: '/replay/:path*', destination: '/control/operations/replay/:path*' },
      { source: '/v1/:path*', destination: `${gatewayUrl}/v1/:path*` },
      { source: '/protocol/v1/:path*', destination: `${gatewayUrl}/protocol/v1/:path*` },
      { source: '/api/proxy/:path*', destination: `${gatewayUrl}/:path*` },
    ];
  },
};

export default nextConfig;

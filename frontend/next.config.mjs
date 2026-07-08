/** @type {import('next').NextConfig} */
const backendOrigin = process.env.BACKEND_REWRITE_ORIGIN || "http://127.0.0.1:8000";

const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Temporary: allow production image build while we clean leftover strict TS issues.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/mango/:path*",
        destination: `${backendOrigin}/api/mango/:path*`,
      },
      {
        source: "/api/channels/:path*",
        destination: `${backendOrigin}/api/channels/:path*`,
      },
      {
        source: "/backend/:path*",
        destination: `${backendOrigin}/:path*`,
      },
      {
        source: "/media/:path*",
        destination: `${backendOrigin}/media/:path*`,
      },
    ];
  },
};

export default nextConfig;

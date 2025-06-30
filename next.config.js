/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8080/api/:path*", // 👉 로컬 백엔드 프록시
      },
    ];
  },
}

module.exports = nextConfig;

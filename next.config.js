/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/:path*',
  //       destination: 'http://localhost:8080/api/:path*',
  //     },
  //   ];
  // },
};
  
module.exports = nextConfig;

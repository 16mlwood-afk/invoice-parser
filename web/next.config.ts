import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Build output configuration - separate from CLI build
  distDir: 'dist',

  // Environment variables for API integration
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
  },
};

export default nextConfig;

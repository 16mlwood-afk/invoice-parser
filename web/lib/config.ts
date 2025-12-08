// Application configuration
export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
    timeout: 30000, // 30 seconds
  },
  app: {
    name: 'Amazon Invoice Parser',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
  features: {
    enableFileValidation: true,
    enableBatchProcessing: true,
    enableRealTimeStatus: true,
  },
} as const;

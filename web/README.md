# Amazon Invoice Parser - Frontend

This is the Next.js frontend for the Amazon Invoice Parser application.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Build for production
npm run build
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# Development settings
NODE_ENV=development
```

## Project Structure

```
web/
├── app/                    # Next.js App Router pages
├── components/            # React components
│   ├── ui/               # Basic UI components
│   └── layout/           # Layout components
├── lib/                  # Utilities and API client
├── stores/               # Zustand state management
├── types/                # TypeScript type definitions
├── utils/                # Helper functions
└── constants/            # Application constants
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage

## Architecture

This frontend integrates with the backend API endpoints:

- `POST /api/upload` - File upload
- `POST /api/process/:jobId` - Start processing
- `GET /api/status/:jobId` - Check processing status
- `GET /api/results/:jobId` - Get processing results
- `DELETE /api/cleanup/:jobId` - Clean up temporary files

## State Management

Uses Zustand for client-side state management with the following stores:

- `useFileStore` - File upload state
- `useProcessingStore` - Processing status
- `useResultsStore` - Processing results
- `useSettingsStore` - User preferences

## Styling

- Tailwind CSS for utility-first styling
- Custom design system with primary/secondary/success/error colors
- Responsive breakpoints: mobile (320px), tablet (768px), desktop (1024px), wide (1440px)
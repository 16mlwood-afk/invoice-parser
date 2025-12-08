# High Level Architecture

## Technical Summary

The Amazon Invoice Parser architecture follows a modern Node.js-based fullstack approach optimized for CLI-first development with web interface extensibility. The backend leverages Node.js with specialized PDF parsing capabilities, while the frontend provides both command-line interfaces and future web-based batch processing tools. The system is designed as a monorepo with clear separation between core parsing logic, CLI tools, and web components.

Key architectural decisions prioritize reliability, extensibility, and developer experience. The PDF parsing engine serves as the core competency, with modular design allowing for easy addition of new invoice formats and processing capabilities. Infrastructure choices focus on cost-effective deployment suitable for both individual developers and small teams.

## Platform and Infrastructure Choice

**Platform:** Vercel + Self-hosted Node.js CLI
**Key Services:** Vercel Functions (for future web deployment), Node.js runtime, npm registry
**Deployment Host and Regions:** Global CDN via npm, regional Vercel deployment for web components

**Rationale:** This hybrid approach supports the primary CLI use case while enabling web interface expansion. Vercel provides excellent developer experience and automatic scaling for web components, while npm distribution ensures the CLI tool remains accessible globally.

## Repository Structure

**Approach:** Monorepo with npm workspaces for shared code management

**Structure:**
```
/
├── packages/
│   ├── core/              # Core PDF parsing and data extraction logic
│   ├── cli/               # Command-line interface
│   ├── web/               # Web interface components (future)
│   └── shared/            # Common types, utilities, and schemas
├── apps/
│   ├── cli-app/          # Main CLI application
│   └── web-app/           # Web application (future)
├── tools/
│   ├── scripts/          # Build and deployment scripts
│   └── test-utils/       # Testing utilities and mocks
└── docs/                 # Documentation
```

**Benefits:**
- Shared code between CLI and web interfaces
- Consistent testing and build processes
- Easier refactoring and feature development
- Simplified dependency management

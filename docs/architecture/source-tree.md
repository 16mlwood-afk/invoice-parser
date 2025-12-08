# Source Code Repository Structure

## Overall Architecture

This project follows a **monorepo structure** optimized for a Node.js CLI application with future web interface extensibility. The architecture prioritizes code reusability, clear separation of concerns, and maintainability.

## Directory Structure

```
/
├── .bmad-core/              # BMAD Method configuration and agents
│   ├── agents/             # AI agent definitions
│   ├── tasks/              # Task templates and workflows
│   ├── templates/          # Document and code generation templates
│   ├── checklists/         # Quality assurance checklists
│   ├── data/               # Knowledge base and reference data
│   └── workflows/          # Development workflow definitions
├── .ai/                    # AI-generated debug logs and analysis
├── docs/                   # Documentation (see docs structure below)
├── node_modules/           # Dependencies (npm)
├── .gitignore             # Git ignore patterns
├── .eslintrc.js           # ESLint configuration
├── package.json           # Project metadata and scripts
├── package-lock.json      # Dependency lock file
├── index.js               # Main CLI application entry point
├── test-real-pdfs.js      # PDF testing utilities
└── README.md              # Project documentation
```

## Source Code Organization

### Core Application (`index.js`)
- **Purpose**: Main entry point for the CLI application
- **Responsibilities**:
  - Command-line argument parsing
  - Application initialization
  - Error handling and logging
  - Coordination of PDF processing workflow

### Module Structure (Future)
When the application grows, it will be organized into modules:

```
packages/
├── core/                  # Core PDF processing logic
│   ├── src/
│   │   ├── parsers/       # PDF parsing implementations
│   │   ├── extractors/    # Data extraction algorithms
│   │   ├── validators/    # Data validation schemas
│   │   └── utils/         # Shared utilities
│   ├── tests/             # Unit tests
│   └── package.json
├── cli/                   # Command-line interface
│   ├── src/
│   │   ├── commands/      # CLI command implementations
│   │   ├── formatters/    # Output formatting
│   │   └── prompts/       # User interaction helpers
│   ├── tests/
│   └── package.json
├── shared/                # Shared types and utilities
│   ├── src/
│   │   ├── types/         # TypeScript type definitions
│   │   ├── schemas/       # Joi validation schemas
│   │   └── constants/     # Application constants
│   └── package.json
└── web/                   # Web interface (future)
    ├── src/
    │   ├── components/    # React components
    │   ├── pages/         # Next.js pages
    │   └── api/           # API routes
    ├── tests/
    └── package.json
```

## Documentation Structure

```
docs/
├── architecture/          # System architecture documentation
│   ├── introduction.md
│   ├── high-level-architecture.md
│   ├── development-architecture.md
│   ├── backend-architecture.md
│   ├── frontend-architecture.md
│   ├── database-architecture.md
│   ├── infrastructure-architecture.md
│   ├── integration-architecture.md
│   ├── quality-assurance-architecture.md
│   ├── risk-mitigation-architecture.md
│   ├── success-metrics-architecture.md
│   ├── implementation-roadmap.md
│   ├── conclusion.md
│   ├── index.md
│   ├── coding-standards.md
│   ├── tech-stack.md
│   └── source-tree.md
├── prd/                   # Product requirements (sharded)
│   ├── index.md
│   ├── goals-and-background-context.md
│   ├── requirements.md
│   ├── technical-assumptions.md
│   ├── user-interface-design-goals.md
│   ├── epic-1-foundation-core-infrastructure.md
│   ├── epic-2-multi-format-support.md
│   ├── epic-3-batch-processing-cli.md
│   ├── epic-4-data-validation-reporting.md
│   ├── epic-5-testing-documentation.md
│   ├── epic-list.md
│   ├── checklist-results-report.md
│   └── next-steps.md
├── stories/               # User stories
│   ├── 1.1.story.md
│   ├── 1.2.pdf-parsing-integration.story.md
│   ├── 1.3.basic-data-extraction-logic.story.md
│   ├── 1.4.json-output-format.story.md
│   └── 2.1.german-invoice-support.story.md
├── qa/                    # Quality assurance
│   ├── assessments/       # Risk profiles and test designs
│   └── gates/             # Quality gates
├── prd.md                # Main PRD file
├── architecture.md       # Main architecture file
├── front-end-spec.md     # Frontend specifications
├── project-brief.md      # Project overview
└── sprint-change-proposal-pdf-parsing-fix.md
```

## File Naming Conventions

### Source Files
- **JavaScript**: `camelCase.js` (e.g., `invoiceParser.js`)
- **Test files**: `*.test.js` or `*.spec.js`
- **Configuration**: `*.config.js`, `*.rc.js`

### Documentation Files
- **Markdown**: `kebab-case.md` (e.g., `coding-standards.md`)
- **YAML**: `kebab-case.yml` or `kebab-case.yaml`
- **Directories**: `kebab-case/` or `camelCase/`

## Import/Export Strategy

### Current Structure (Single File)
```javascript
// index.js - All functionality in one file
const fs = require('fs');
const { Command } = require('commander');
const pdf = require('pdf-parse');

// All classes and functions defined in single file
class AmazonInvoiceParser {
  // ... implementation
}
```

### Future Modular Structure
```javascript
// packages/core/src/index.js
export { AmazonInvoiceParser } from './AmazonInvoiceParser.js';
export { extractInvoiceData } from './extractors/invoiceExtractor.js';

// packages/cli/src/index.js
export { CLI } from './CLI.js';
export { commands } from './commands/index.js';
```

## Development Workflow

### Local Development
1. **Single file development**: All changes in `index.js`
2. **Testing**: Run tests with `npm test`
3. **Linting**: Code quality checks with ESLint
4. **Manual testing**: Use `test-real-pdfs.js` for PDF processing

### Future Development
1. **Modular development**: Changes across multiple packages
2. **Workspace management**: npm workspaces for dependency management
3. **Cross-package testing**: Integration tests between packages
4. **Build process**: Package-specific build scripts

## Configuration Management

### Current Configuration
- **Package metadata**: `package.json`
- **BMAD settings**: `.bmad-core/core-config.yaml`
- **IDE integration**: `opencode.jsonc`

### Future Configuration
- **Environment variables**: `.env` files for different environments
- **Package configurations**: Individual `package.json` files per package
- **Shared configuration**: Common settings in `packages/shared/`

## Testing Strategy

### Current Testing
- **Manual testing**: Direct execution of `index.js`
- **PDF testing**: `test-real-pdfs.js` utility
- **Integration testing**: End-to-end CLI testing

### Future Testing
- **Unit tests**: Jest tests for individual functions
- **Integration tests**: Package interaction testing
- **E2E tests**: Full application workflow testing
- **Performance tests**: Load and stress testing

## Deployment and Distribution

### Current Deployment
- **npm package**: CLI tool distributed via npm registry
- **GitHub repository**: Source code hosting
- **Local installation**: `npm install -g` or local usage

### Future Deployment
- **CLI tool**: npm package with binary distribution
- **Web application**: Vercel deployment for web interface
- **Docker containers**: Containerized deployment options
- **CI/CD**: Automated testing and deployment pipelines
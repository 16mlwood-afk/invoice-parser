# Coding Standards

## Code Style and Formatting

**JavaScript/Node.js Standards:**
- Use ESLint with standard configuration
- 2-space indentation for all files
- Semicolons required
- Single quotes for strings
- Trailing commas in multi-line objects/arrays
- Maximum line length: 100 characters

**File Naming:**
- camelCase for variables, functions, and files
- PascalCase for classes and constructors
- kebab-case for file names (e.g., `invoice-parser.js`)

## Code Organization

**File Structure:**
- One class/function per file where possible
- Related utilities in shared modules
- Clear separation between business logic and I/O operations
- Comprehensive error handling with descriptive messages

**Import/Export:**
- Use ES6 import/export syntax
- Group imports: standard library, third-party, local modules
- Avoid wildcard imports
- Prefer named exports over default exports

## Testing Standards

**Test Coverage:**
- Unit tests for all core business logic
- Integration tests for file I/O operations
- Error case testing for all failure paths
- Minimum 80% code coverage requirement

**Test Structure:**
- Arrange-Act-Assert pattern
- Descriptive test names
- Mock external dependencies
- Clean up test data after each test

## Documentation

**Code Comments:**
- JSDoc comments for all public APIs
- Inline comments for complex logic
- TODO comments for future improvements
- Remove commented-out code before commits

**README and Documentation:**
- Comprehensive setup instructions
- API documentation for CLI commands
- Examples for common use cases
- Troubleshooting guide for known issues

## Git Standards

**Commit Messages:**
- Clear, descriptive commit messages
- Reference issue numbers when applicable
- Separate subject from body with blank line
- Use imperative mood (e.g., "Add feature" not "Added feature")

**Branch Naming:**
- feature/feature-name for new features
- bugfix/bug-description for bug fixes
- hotfix/critical-fix for urgent fixes

## Security Standards

**Input Validation:**
- Validate all user inputs
- Sanitize file paths
- Check file types and sizes
- Prevent directory traversal attacks

**Error Handling:**
- Never expose internal errors to users
- Log errors with appropriate detail levels
- Graceful degradation for non-critical failures
- Clear error messages for user-facing issues

## Performance Standards

**Code Performance:**
- Avoid synchronous I/O in hot paths
- Use streaming for large file operations
- Implement proper async/await patterns
- Profile memory usage for large datasets

**Resource Management:**
- Close file handles properly
- Clean up temporary files
- Handle process signals gracefully
- Implement proper timeouts for operations
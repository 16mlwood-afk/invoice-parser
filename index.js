// Legacy entry point - now delegates to the new modular structure
if (require.main === module) {
  const CLI = require('./src/cli/cli');
  const cli = new CLI();
  cli.run().catch(error => {
    console.error('CLI execution failed:', error.message);
    process.exit(1);
  });
}

// Export the new modular API for backward compatibility
module.exports = require('./src/index.js');
// Legacy entry point - now delegates to the new modular structure
if (require.main === module) {
  const args = process.argv.slice(2);

  // Check if API mode is requested
  if (args.includes('--api') || args.includes('--web')) {
    // Start API server
    const APIServer = require('./src/api/server');
    const server = new APIServer();

    const port = process.env.PORT || 3001;
    server.start(port).catch(error => {
      console.error('API server failed to start:', error.message);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down API server...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Shutting down API server...');
      await server.stop();
      process.exit(0);
    });
  } else {
    // Default CLI mode
    const CLI = require('./src/cli/cli');
    const cli = new CLI();
    cli.run().catch(error => {
      console.error('CLI execution failed:', error.message);
      process.exit(1);
    });
  }
}

// Export the new modular API for backward compatibility
module.exports = require('./src/index.js');

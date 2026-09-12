const app = require('./app');
const config = require('./config/environment');
const { connectDB, disconnectDB } = require('./config/database');

const PORT = config.port;

let server;

const startServer = async () => {
  try {
    await connectDB();

    server = app.listen(PORT, () => {
      console.log(`ServiceHub server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed due to database connection error:', error.message);
    process.exit(1);
  }
};

const handleShutdown = async (signal) => {
  console.log(`${signal} received: closing HTTP server and database connection`);
  if (server) {
    server.close(async () => {
      console.log('HTTP server closed');
      await disconnectDB();
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

startServer();

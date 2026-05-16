const app = require('./src/app');
const { connectDatabase } = require('./src/config/db');
const { env } = require('./src/config/env');

async function startServer() {
  try {
    await connectDatabase();
    app.listen(env.port, () => {
      console.log(`TaskFlow backend listening on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start TaskFlow backend', error);
    process.exit(1);
  }
}

startServer();

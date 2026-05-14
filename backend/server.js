const app = require('./src/app');
const { env } = require('./src/config/env');

app.listen(env.port, () => {
  // Startup log kept intentionally small for production logs.
  console.log(`TaskFlow backend listening on port ${env.port}`);
});

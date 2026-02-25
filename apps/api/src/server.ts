import 'dotenv/config';
import { buildApp } from './app.js';

const start = async () => {
  const app = await buildApp();
  const port = parseInt(process.env.PORT || '3001', 10);

  try {
    await app.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

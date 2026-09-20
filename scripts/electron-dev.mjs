import { spawn } from 'node:child_process';
import electron from 'electron';
import { createServer } from 'vite';

async function start() {
  const server = await createServer({
    server: { port: 5173 },
  });
  await server.listen();

  const address = server.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : 5173;
  const devUrl = `http://localhost:${port}`;
  console.log(`[Vite] Dev server ready at: ${devUrl}`);

  const env = {
    ...process.env,
    VITE_DEV_SERVER_URL: devUrl,
  };
  delete env.ELECTRON_RUN_AS_NODE;

  const child = spawn(electron, ['.'], {
    env,
    stdio: 'inherit',
  });

  child.on('close', async () => {
    console.log('[Electron] Window closed. Stopping Vite dev server...');
    await server.close();
    process.exit(0);
  });
}

start().catch((err) => {
  console.error('[Electron Dev] Failed to start:', err);
  process.exit(1);
});

// Dumar Castilho - https://github.com/dumarcastilho
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT deve ser um inteiro entre 1 e 65535.');
let source;
try { source = await readFile(new URL('../dist/server/index.js', import.meta.url), 'utf8'); }
catch (error) { if (error.code === 'ENOENT') throw new Error('Build ausente. Execute npm run build ou npm run dev.'); throw error; }
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    const result = await worker.fetch(new Request(url, { method: request.method }));
    response.writeHead(result.status, Object.fromEntries(result.headers));
    response.end(Buffer.from(await result.arrayBuffer()));
  } catch {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Erro ao processar a requisição.');
  }
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `A porta ${port} já está em uso. Defina outra PORT.` : error.message); process.exitCode = 1; });
server.listen(port, host, () => console.log(`Atlas View: http://${host}:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());

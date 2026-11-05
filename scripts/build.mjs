// Dumar Castilho - https://github.com/dumarcastilho
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const assets = {};
for (const [path, file, type] of [
  ['/', 'index.html', 'text/html; charset=utf-8'],
  ['/style.css', 'style.css', 'text/css; charset=utf-8'],
  ['/app.js', 'app.js', 'text/javascript; charset=utf-8'],
]) assets[path] = { body: await readFile(new URL(`web/${file}`, root), 'utf8'), type };
const worker = await readFile(new URL('worker/index.js', root), 'utf8');
await rm(new URL('dist/', root), { recursive: true, force: true });
await mkdir(new URL('dist/server/', root), { recursive: true });
await writeFile(new URL('dist/server/index.js', root), `const ASSETS=${JSON.stringify(assets)};\n${worker}`);
console.log('Atlas View: build gerado em dist/server/index.js');

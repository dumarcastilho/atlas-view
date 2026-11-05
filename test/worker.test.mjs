// Dumar Castilho - https://github.com/dumarcastilho
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../dist/server/index.js', import.meta.url), 'utf8');
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const request = path => new Request(new URL(path, 'https://atlas.example.com'));
const valid = '/api/aerial?bbox=-47,-16,-46.9,-15.9';

test('entrega a interface, seus recursos e HEAD; rejeita rotas e métodos desconhecidos', async () => {
  for (const [path, type] of [['/', 'text/html'], ['/app.js', 'text/javascript'], ['/style.css', 'text/css']]) {
    const response = await worker.fetch(request(path));
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-type').startsWith(type));
    assert.ok((await response.text()).length > 0);
  }
  assert.equal(await (await worker.fetch(new Request('https://atlas.example.com/', { method: 'HEAD' }))).text(), '');
  assert.equal((await worker.fetch(request('/missing'))).status, 404);
  assert.equal((await worker.fetch(new Request('https://atlas.example.com/', { method: 'POST' }))).status, 405);
});

test('rejeita área, paginação e data inválidas antes de acessar a rede', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('A rede não deveria ser acessada.'); });
  for (const path of [
    '/api/aerial', '/api/aerial?bbox=bad', '/api/aerial?bbox=-80,-30,-30,0',
    '/api/aerial?bbox=-46,-16,-47,-15', '/api/aerial?bbox=-200,-16,-199,-15',
    valid + '&page=21', valid + '&page=0', valid + '&page=1.5', valid + '&acquisition_from=invalid',
  ]) assert.equal((await worker.fetch(request(path))).status, 400, path);
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});

test('consulta somente o catálogo permitido e remove contatos da resposta', async t => {
  let upstream;
  t.mock.method(globalThis, 'fetch', async url => {
    upstream = new URL(url);
    return Response.json({ meta: { found: 1, license: 'CC-BY 4.0' }, results: [{
      _id: 'synthetic-survey', title: 'Levantamento sintético', provider: 'Produtor de exemplo',
      contact: 'private@example.com', user: { name: 'Nome de exemplo', email: 'hidden@example.com' },
      acquisition_start: '2025-01-01T00:00:00Z', gsd: 0.1,
      uuid: 'https://imagery.example.com/synthetic.tif',
      properties: { tms: 'https://tiles.example.com/{z}/{x}/{y}', resolution_in_meters: 0.1 },
    }] });
  });
  const response = await worker.fetch(request(valid + '&page=2&acquisition_from=2025-01-01&url=https://untrusted.example.com'));
  assert.equal(response.status, 200);
  assert.equal(upstream.origin, 'https://api.openaerialmap.org');
  assert.equal(upstream.pathname, '/meta');
  assert.equal(upstream.searchParams.get('page'), '2');
  assert.equal(upstream.searchParams.get('limit'), '100');
  assert.equal(upstream.searchParams.get('order_by'), 'acquisition_start');
  assert.equal(upstream.searchParams.has('url'), false);
  const result = await response.json();
  assert.equal(result.results[0].title, 'Levantamento sintético');
  assert.equal(result.results[0].contact, undefined);
  assert.equal(result.results[0].user, undefined);
  assert.equal(result.results[0].properties.resolution_in_meters, 0.1);
});

test('retorna uma falha controlada quando o provedor está indisponível ou responde fora do formato', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => new Response('unavailable', { status: 503 }));
  assert.equal((await worker.fetch(request(valid))).status, 502);
  mock.mock.mockImplementation(async () => Response.json({ unexpected: true }));
  assert.equal((await worker.fetch(request(valid))).status, 502);
  mock.mock.mockImplementation(async () => { throw new Error('internal diagnostic'); });
  const response = await worker.fetch(request(valid));
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /internal diagnostic/);
});

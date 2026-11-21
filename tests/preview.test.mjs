// A shared link shows a title, a description and an image (first-minute polish).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'shell.html'), 'utf8');
const meta = (attr, key) => { const m = html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]+)"`)); return m && m[1]; };
test('description, Open Graph and Twitter tags are in the head', () => {
  assert.ok((meta('name', 'description') || '').length >= 60);
  assert.ok(meta('property', 'og:title')); assert.ok(meta('property', 'og:description'));
  assert.equal(meta('property', 'og:image'), 'https://yyoyochen.github.io/gym-sim/og.png');
  assert.equal(meta('name', 'twitter:card'), 'summary_large_image');
});
test('the preview image exists at 1200 x 630', () => {
  const f = join(ROOT, 'og.png'); assert.ok(existsSync(f));
  const b = readFileSync(f); assert.equal(b.toString('ascii', 1, 4), 'PNG'); assert.equal(b.readUInt32BE(16), 1200); assert.equal(b.readUInt32BE(20), 630);
});
// The names to keep out live in tests/names.local.json (a JSON list), which is never committed.
const NAMES = join(ROOT, 'tests', 'names.local.json');
test('no real gym names in the tags', { skip: !existsSync(NAMES) && 'no local name list' }, () => {
  const head = html.slice(0, html.indexOf('</head>')).toLowerCase();
  for (const n of JSON.parse(readFileSync(NAMES, 'utf8'))) assert.ok(!head.includes(n.toLowerCase()), 'a listed name is in the tags');
});

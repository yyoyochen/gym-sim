// Load plain src/*.js files (which share one scope when concatenated by build.py) into a fresh vm context,
// and return the named top-level bindings. Only for files that use no THREE and no DOM.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function loadSrc(files, names) {
  const code = files.map(f => readFileSync(join(ROOT, f), 'utf8')).join('\n');
  return runInNewContext(`${code}\n;({ ${names.join(', ')} })`, {});
}

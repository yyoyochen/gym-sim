// Run the in-page self-tests (index.html?selftest=...) in headless Chrome and return their results.
import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// build.py joins src/*.js in name order (no separator) into shell.html; a fresh index.html contains that text verbatim
export function buildIsFresh(src, html) { return html.includes(src); }
export function checkBuild() {
  const src = readdirSync(join(ROOT, 'src')).filter(f => f.endsWith('.js')).sort().map(f => readFileSync(join(ROOT, 'src', f), 'utf8')).join('');
  if (!buildIsFresh(src, readFileSync(join(ROOT, 'index.html'), 'utf8'))) throw new Error('index.html is stale: run build.py before the self-tests');
}

export function runSelftests(names = []) {
  checkBuild();
  const profile = mkdtempSync(join(tmpdir(), 'gymsim-chrome-'));
  const url = `file://${ROOT}/index.html?selftest=${names.join(',')}`;
  const args = ['--headless=new', `--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--virtual-time-budget=5000', '--dump-dom', url];   // self-tests run synchronously while the page loads
  return new Promise((resolve, reject) => {
    execFile(CHROME, args, { maxBuffer: 64 * 1024 * 1024, timeout: 600000 }, (err, stdout) => {
      rmSync(profile, { recursive: true, force: true });
      if (err) return reject(err);
      const tag = '<pre id="selftest">', i = stdout.lastIndexOf(tag), j = stdout.indexOf('</pre>', i);
      if (i < 0 || j < 0) return reject(new Error('no selftest output in the page; is index.html rebuilt?'));
      try { resolve(JSON.parse(stdout.slice(i + tag.length, j).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'))); }
      catch (e) { reject(e); }
    });
  });
}

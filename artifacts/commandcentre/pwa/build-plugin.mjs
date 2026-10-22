import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export function makueniPwa(basePath) {
  const base = basePath.endsWith('/') ? basePath : basePath + '/';
  return {
    name: 'makueni-offline-shell',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).filter(name => !name.endsWith('.map'));
      const urls = [...new Set([...assets, 'index.html', 'offline.html', 'manifest.webmanifest', 'icons/app-192.png', 'icons/app-512.png', 'icons/apple-touch-icon.png'])].map(name => base + name);
      const template = readFileSync(new URL('./service-worker.js', import.meta.url), 'utf8');
      const offline = readFileSync(new URL('./offline.html', import.meta.url), 'utf8').replaceAll('__BASE_PATH__', base);
      const hash = createHash('sha256').update(JSON.stringify(urls)).update(template).update(offline);
      for (const path of ['manifest.webmanifest', 'icons/app-192.png', 'icons/app-512.png', 'icons/apple-touch-icon.png']) hash.update(readFileSync(new URL('../public/' + path, import.meta.url)));
      const version = hash.digest('hex').slice(0, 16);
      this.emitFile({ type: 'asset', fileName: 'offline.html', source: offline });
      const source = template
        .replaceAll('__BUILD_VERSION__', version)
        .replace('__PRECACHE_URLS__', JSON.stringify(urls))
        .replaceAll('__BASE_PATH__', base);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

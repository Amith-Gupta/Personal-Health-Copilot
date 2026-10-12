/** In-memory cache of document previews as object URLs, so a record opens with its page already decoded
 *  and nothing is re-downloaded while the app is open (storage responses are marked no-cache). */
const cache = new Map<string, Promise<string>>();

export function cachedImage(url: string): Promise<string> {
  const key = url.replace(/\?.*$/, "");
  let p = cache.get(key);
  if (!p) {
    p = fetch(url).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return URL.createObjectURL(await r.blob());
    });
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

export function peekCachedImage(url: string): string | null {
  const key = url.replace(/\?.*$/, "");
  const p = cache.get(key);
  if (!p) return null;
  let value: string | null = null;
  p.then((v) => { value = v; }).catch(() => {});
  return value;
}

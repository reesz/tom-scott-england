// Map of data file name -> short content hash, injected at build time by Vite
// (see `define` in vite.config.ts). Empty object as a runtime fallback.
declare const __DATA_VERSIONS__: Record<string, string>

/**
 * Builds a URL for a file in `/public/data` with a content-hash cache buster.
 *
 * The `?v=` token only changes when the file's contents change, so updated data
 * is fetched immediately (new URL = cache miss) while unchanged data stays fully
 * cacheable. This avoids stale browser caches without disabling caching.
 */
export function dataUrl(file: string): string {
  const version =
    typeof __DATA_VERSIONS__ !== 'undefined' ? __DATA_VERSIONS__[file] : undefined
  return `${import.meta.env.BASE_URL}data/${file}${version ? `?v=${version}` : ''}`
}

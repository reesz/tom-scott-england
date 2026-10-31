import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Runtime-fetched data files in /public/data. We hash their contents at build
// time and expose the hashes to the app (via `define` below) so fetch URLs can
// carry a `?v=<hash>` cache buster — see src/lib/dataUrl.ts.
const DATA_FILES = ['counties.json', 'journey.json', 'england-counties.geo.json', 'british-isles.geo.json']

function dataVersions(): Record<string, string> {
  return Object.fromEntries(
    DATA_FILES.map((file) => {
      try {
        const buf = readFileSync(resolve(process.cwd(), 'public/data', file))
        return [file, createHash('sha256').update(buf).digest('hex').slice(0, 8)]
      } catch {
        return [file, 'dev']
      }
    }),
  )
}

const config = defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/tom-scott-england/',
  define: {
    __DATA_VERSIONS__: JSON.stringify(dataVersions()),
  },
  server: {
    host: true,
    watch: {
      ignored: ['**/routeTree.gen.ts'],
    },
  },
  optimizeDeps: {
    include: ['three', 'postprocessing', 'use-sync-external-store/shim/with-selector'],
  },
  plugins: [
    {
      name: 'glsl-loader',
      transform(code: string, id: string) {
        if (id.endsWith('.glsl')) {
          return {
            code: `export default ${JSON.stringify(code)};`,
            map: null,
          }
        }
      },
    },
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    TanStackRouterVite({ autoCodeSplitting: true }),
    viteReact(),
  ],
}))

export default config

import { defineConfig } from 'vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  server: {
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
})

export default config

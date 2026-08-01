import { defineConfig } from 'vite'
import base from './vite.config'

export default defineConfig(async (env) => {
  const cfg = await base(env)
  return {
    ...cfg,
    build: {
      ...cfg.build,
      cssMinify: false,
    },
  }
})

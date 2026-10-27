import {defineConfig} from 'astro/config'
import sitemap from '@astrojs/sitemap'
import vercel from '@astrojs/vercel'

export default defineConfig({
  site: 'https://ridgelinehomes.test',
  output: 'static',
  trailingSlash: 'always',
  adapter: vercel(),
  integrations: [sitemap()],
})

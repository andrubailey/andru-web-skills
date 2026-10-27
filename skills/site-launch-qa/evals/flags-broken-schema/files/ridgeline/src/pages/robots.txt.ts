import type {APIRoute} from 'astro'

// Blocks everything on preview deployments; production gets the full policy.
export const GET: APIRoute = () => {
  const production = process.env.VERCEL_ENV === 'production'
  const body = production ? `User-agent: *
Allow: /

User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: GPTBot
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: ClaudeBot
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Google-Extended
User-agent: Applebot-Extended
Allow: /

Sitemap: https://ridgelinehomes.test/sitemap-index.xml
` : `User-agent: *\nDisallow: /\n`
  return new Response(body, {headers: {'Content-Type': 'text/plain'}})
}

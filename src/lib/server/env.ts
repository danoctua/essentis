/** A server-side setting: Vercel's variables arrive on process.env, local .env values on import.meta.env. */
export const env = (name: string): string | undefined =>
  process.env[name] || (import.meta.env as Record<string, string | undefined>)[name] || undefined;

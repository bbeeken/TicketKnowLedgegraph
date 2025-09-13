import { z } from 'zod';

// Define required public env vars (adjust as feature set expands)
const schema = z.object({
  NEXT_PUBLIC_API_BASE: z.string().url().default(''),
});

let parsed: z.infer<typeof schema> | null = null;

export function getEnv() {
  if (!parsed) {
    const input: Record<string, any> = {
      NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || ''
    };
    const result = schema.safeParse(input);
    if (!result.success) {
      // Log all issues but don't crash build for missing optional base (client may fallback)
      // eslint-disable-next-line no-console
      console.warn('Environment validation issues:', result.error.flatten().fieldErrors);
      parsed = { NEXT_PUBLIC_API_BASE: '' };
    } else {
      parsed = result.data;
    }
  }
  return parsed;
}

import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

// Allow 20 requests from the same IP in a 10-second window.
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(20, '10 s'),
  analytics: true,
  prefix: '@upstash/ratelimit',
});

export const limiter = {
  check: async (request: Request) => {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const { success } = await ratelimit.limit(ip);
    return success;
  },
};

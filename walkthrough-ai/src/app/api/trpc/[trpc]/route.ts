import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { NextRequest } from 'next/server';
import { appRouter } from '@/server/routers/_app';
import { createContext } from '@/server/context';

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(`[tRPC] ${path ?? '<no-path>'}:`, error);
          }
        : undefined,
  });

export { handler as GET, handler as POST };

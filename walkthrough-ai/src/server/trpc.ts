import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;

// Requires an authenticated, synced User row.
const enforceAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId || !ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuthed);

// Requires the authenticated User to have ADMIN role.
const enforceAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.userId || !ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  if (ctx.user.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId, user: ctx.user } });
});

export const adminProcedure = t.procedure.use(enforceAdmin);

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/api/trpc(.*)']);
const isWebhookRoute = createRouteMatcher(['/api/webhooks(.*)', '/api/uploadthing(.*)']);

export default clerkMiddleware((auth, req) => {
  if (isWebhookRoute(req)) return; // webhooks authenticate via signature, not session
  if (isProtectedRoute(req)) auth.protect();
});

export const config = {
  matcher: ['/((?!_next|.*\\.[\\w]+$).*)', '/(api|trpc)(.*)'],
};

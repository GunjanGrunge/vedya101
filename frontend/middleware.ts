import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/about-us',
  '/blog(.*)',
  '/press',
  '/documentation',
  '/api-reference',
  '/help-center',
  '/features',
  '/ai-agents',
  '/learning-paths',
  '/assessments',
  '/progress-tracking',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/info',
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}

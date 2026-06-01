import { NextRequest, NextResponse } from 'next/server'

// When NEXT_PUBLIC_SKIP_AUTH=true, bypass all Clerk auth for dev/mock testing.
const SKIP_AUTH = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'

export default async function middleware(request: NextRequest) {
  if (SKIP_AUTH) {
    return NextResponse.next()
  }

  // Dynamically import Clerk so it's only resolved when actually used
  const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server')

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

  const handler = clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect()
    }
  })

  return handler(request, {} as never)
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}

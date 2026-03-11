import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function unauthorizedResponse() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="SpendSentinel"',
    },
  })
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  const username = process.env.SPEND_SENTINEL_ADMIN_USER
  const password = process.env.SPEND_SENTINEL_ADMIN_PASS

  if (!username || !password) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {
          error:
            'Missing SPEND_SENTINEL_ADMIN_USER / SPEND_SENTINEL_ADMIN_PASS. Refusing to run unauthenticated in production.',
        },
        { status: 503 },
      )
    }

    return NextResponse.next()
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Basic ')) {
    return unauthorizedResponse()
  }

  try {
    const encoded = authHeader.slice(6)
    const decoded = atob(encoded)
    const [providedUser, ...rest] = decoded.split(':')
    const providedPass = rest.join(':')

    if (providedUser !== username || providedPass !== password) {
      return unauthorizedResponse()
    }
  } catch {
    return unauthorizedResponse()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'],
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_COOKIE_NAME = 'admin_token'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 管理画面の認証チェック（ログインページ以外）
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    // Edge Runtimeでは関数内で環境変数を読み込む
    const adminPassword = process.env.ADMIN_PASSWORD || ''
    const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value

    // 未認証の場合はログインページにリダイレクト
    if (!adminPassword || adminToken !== adminPassword) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    return NextResponse.next()
  }

  // ログインページは認証なしで通す
  if (pathname.startsWith('/admin/login')) {
    return NextResponse.next()
  }

  // ベーシック認証（Edge Runtimeでは関数内で環境変数を読み込む）
  const username = process.env.BASIC_AUTH_USERNAME
  const password = process.env.BASIC_AUTH_PASSWORD

  if (!username || !password) {
    return NextResponse.next()
  }

  // Basic認証済みCookieがあればスキップ
  const basicAuthToken = request.cookies.get('basic_auth_token')?.value
  if (basicAuthToken === 'authenticated') {
    return NextResponse.next()
  }

  const authHeader = request.headers.get('authorization')

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ')

    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded)
      const [user, pass] = decoded.split(':')

      if (user === username && pass === password) {
        // 認証成功時にCookieを設定
        const response = NextResponse.next()
        response.cookies.set('basic_auth_token', 'authenticated', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        })
        return response
      }
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  })
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

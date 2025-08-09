import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  // Update session
  const response = await updateSession(request)

  // Get the pathname
  const pathname = request.nextUrl.pathname

  // Protected routes
  if (pathname.startsWith("/dashboard")) {
    // Check if user is authenticated by looking for session cookie
    const sessionCookie = request.cookies.get("sb-srjfclplxoonrzczpfyz-auth-token")

    if (!sessionCookie) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth"
      return NextResponse.redirect(url)
    }
  }

  // Auth routes - redirect to dashboard if already logged in
  if (pathname.startsWith("/auth") && !pathname.includes("/callback")) {
    const sessionCookie = request.cookies.get("sb-srjfclplxoonrzczpfyz-auth-token")

    if (sessionCookie) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

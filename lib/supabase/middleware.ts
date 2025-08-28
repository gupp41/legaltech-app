import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getUser() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log('Middleware auth check:', {
    pathname: request.nextUrl.pathname,
    user: user?.email,
    isApi: request.nextUrl.pathname.startsWith("/api"),
    isAuth: request.nextUrl.pathname.startsWith("/auth"),
    isLogin: request.nextUrl.pathname.startsWith("/login")
  })
  console.log('User data in middleware:', user)
  console.log('Cookies in request:', request.cookies.getAll().map(c => c.name))
  


  // For API routes, always allow through but ensure cookies are set
  if (request.nextUrl.pathname.startsWith("/api")) {
    console.log('API route detected, allowing through with cookies')
    return supabaseResponse
  }

  // For non-API routes, check authentication
  // TEMPORARILY: Allow all routes through and handle auth at component level
  if (
    request.nextUrl.pathname !== "/" &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/debug") &&
    !request.nextUrl.pathname.startsWith("/dashboard") // Allow dashboard
  ) {
    console.log('Middleware allowing request through for path:', request.nextUrl.pathname)
  }

  console.log('Middleware allowing request through for path:', request.nextUrl.pathname)

  console.log('Middleware allowing request through')

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}

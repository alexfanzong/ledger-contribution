import { NextResponse } from "next/server";
import {
  buildAuthErrorPath,
  isPasswordRecoveryDestination,
  passwordRecoveryCookieOptions,
  PASSWORD_RECOVERY_COOKIE
} from "@/lib/auth-page";
import { safeAuthRedirectPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeAuthRedirectPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const errorResponse = NextResponse.redirect(
        new URL(
          buildAuthErrorPath(
            "forgot",
            "This password reset link is invalid or expired. Request a new link."
          ),
          requestUrl.origin
        )
      );
      errorResponse.cookies.delete(PASSWORD_RECOVERY_COOKIE);
      return errorResponse;
    }
  }

  const response = NextResponse.redirect(new URL(next, requestUrl.origin));
  if (code && isPasswordRecoveryDestination(next)) {
    response.cookies.set(
      PASSWORD_RECOVERY_COOKIE,
      "verified",
      passwordRecoveryCookieOptions(requestUrl.protocol === "https:")
    );
  }
  return response;
}

const DEFAULT_AUTH_REDIRECT = "/dashboard";
const UNSAFE_REDIRECT_CHARACTERS = /[\\\u0000-\u001f\u007f]/;

export function safeAuthRedirectPath(destination: string | null): string {
  if (
    !destination ||
    !destination.startsWith("/") ||
    destination.startsWith("//") ||
    UNSAFE_REDIRECT_CHARACTERS.test(destination)
  ) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return destination;
}

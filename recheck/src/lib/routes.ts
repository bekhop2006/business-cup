// Paths a signed-out visitor may open. API routes answer for themselves
// (webhooks check a signature or secret instead of a session).
export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/api/")
  );
}

type CsrfVerificationResult =
  | { ok: true }
  | { ok: false; error: string };

function getConfiguredOrigins(): Set<string> {
  const origins = new Set<string>();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      origins.add(new URL(appUrl).origin);
    } catch {
      // Ignore invalid env format and fallback to other sources.
    }
  }

  const trustedOrigins = process.env.CSRF_TRUSTED_ORIGINS;
  if (trustedOrigins) {
    for (const raw of trustedOrigins.split(",")) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      try {
        origins.add(new URL(trimmed).origin);
      } catch {
        // Ignore invalid origin values.
      }
    }
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
  }

  return origins;
}

function getRequestOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const referer = request.headers.get("referer");
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function verifyCsrfOrigin(request: Request): CsrfVerificationResult {
  if (process.env.NODE_ENV === "test") {
    return { ok: true };
  }

  const requestOrigin = getRequestOrigin(request);
  if (!requestOrigin) {
    return { ok: false, error: "Missing origin header." };
  }

  const allowedOrigins = getConfiguredOrigins();
  if (!allowedOrigins.has(requestOrigin)) {
    return { ok: false, error: "CSRF origin check failed." };
  }

  return { ok: true };
}

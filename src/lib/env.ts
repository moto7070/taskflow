type ClientVarName = "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY";

function getEnv(name: ClientVarName): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseConfig() {
  const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  // Guard against accidental secret-key exposure through NEXT_PUBLIC variables.
  if (anonKey.startsWith("sb_secret_") || anonKey.toLowerCase().includes("service_role")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be a secret key. Use a Supabase publishable/anon key.",
    );
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY must never be defined.");
  }

  return {
    url: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey,
  };
}

export function getSupabaseServiceRoleConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }

  return { url, serviceRoleKey };
}

export function getCommentAttachmentsBucket() {
  return process.env.SUPABASE_COMMENT_ATTACHMENTS_BUCKET || "comment-attachments";
}

export function getCommentAttachmentMaxBytes() {
  const raw = process.env.COMMENT_ATTACHMENT_MAX_BYTES;
  if (!raw) return 10 * 1024 * 1024;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("COMMENT_ATTACHMENT_MAX_BYTES must be a positive integer.");
  }
  return parsed;
}

export function getCommentAttachmentAllowedMimeTypes() {
  const raw = process.env.COMMENT_ATTACHMENT_ALLOWED_MIME_TYPES;
  if (!raw) {
    return new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/zip",
    ]);
  }

  return new Set(
    raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export interface InviteEmailConfig {
  apiKey: string;
  from: string;
  replyTo?: string;
}

export function getInviteEmailConfig(): InviteEmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INVITE_EMAIL_FROM;
  const replyTo = process.env.INVITE_EMAIL_REPLY_TO;

  if (!apiKey || !from) {
    return null;
  }

  return {
    apiKey,
    from,
    replyTo,
  };
}

type ClientVarName = "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY";

function getEnv(name: ClientVarName): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseConfig() {
  return {
    url: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
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

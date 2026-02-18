export function toPublicErrorMessage(error: unknown, fallback: string): string {
  if (error) {
    console.error("[TaskFlow][ServerError]", error);
  }
  return fallback;
}

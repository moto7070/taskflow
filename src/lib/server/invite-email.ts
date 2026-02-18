import { getInviteEmailConfig } from "@/lib/env";

interface SendInviteMailParams {
  to: string;
  inviteUrl: string;
  teamName: string;
  role: "admin" | "user";
  invitedByEmail: string;
}

export async function sendInviteMail(params: SendInviteMailParams): Promise<{
  sent: boolean;
  reason?: string;
}> {
  const config = getInviteEmailConfig();
  if (!config) {
    return { sent: false, reason: "Email delivery is not configured." };
  }

  const subject = `TaskFlow invitation: ${params.teamName}`;
  const roleLabel = params.role === "admin" ? "admin" : "user";
  const text = [
    `You were invited to join "${params.teamName}" on TaskFlow.`,
    `Role: ${roleLabel}`,
    `Invited by: ${params.invitedByEmail}`,
    "",
    `Accept invitation: ${params.inviteUrl}`,
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <p>You were invited to join <strong>${escapeHtml(params.teamName)}</strong> on TaskFlow.</p>
      <p>Role: <strong>${roleLabel}</strong><br/>Invited by: <strong>${escapeHtml(params.invitedByEmail)}</strong></p>
      <p><a href="${params.inviteUrl}">Accept invitation</a></p>
      <p>If you cannot click the link, open this URL:<br/>${params.inviteUrl}</p>
    </div>
  `.trim();

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [params.to],
        subject,
        text,
        html,
        reply_to: config.replyTo,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "unknown error");
      return { sent: false, reason: `Resend API error (${response.status}): ${detail}` };
    }
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "Unknown network error",
    };
  }

  return { sent: true };
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

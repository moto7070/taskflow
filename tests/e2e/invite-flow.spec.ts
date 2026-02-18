import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const memberEmail = process.env.E2E_MEMBER_EMAIL;
const memberPassword = process.env.E2E_MEMBER_PASSWORD;
const supabaseUrl = process.env.E2E_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.E2E_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasInviteEnv =
  !!adminEmail &&
  !!adminPassword &&
  !!memberEmail &&
  !!memberPassword &&
  !!supabaseUrl &&
  !!supabaseServiceRoleKey;

const supabaseAdmin = hasInviteEnv
  ? createClient(supabaseUrl as string, supabaseServiceRoleKey as string, {
      auth: { persistSession: false },
    })
  : null;

async function login(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form[action*="loginAction"] button[type="submit"]').click();
  await page.waitForURL("**/app**");
}

async function createTeamAndOpenSettings(page: Page, teamName: string) {
  await page.locator('input[name="team_name"]').fill(teamName);
  await page.locator('form[action*="createTeamAction"] button[type="submit"]').click();
  await expect(page.getByText(teamName)).toBeVisible();

  const teamCard = page.locator("div.rounded-md.border.border-slate-200.p-4").filter({
    hasText: teamName,
  });
  await teamCard.getByRole("link", { name: "Team settings" }).click();
  await page.waitForURL("**/app/team/**/settings");
}

async function createInvitationAndGetToken(page: Page, email: string) {
  await page.locator('input[name="email"][type="email"]').fill(email);
  await page.locator('select[name="role"]').selectOption("user");
  await page.getByRole("button", { name: "Create invite" }).click();
  await expect(page.getByText(email)).toBeVisible();

  const inviteCard = page.locator("div.rounded-md.border.border-slate-200.p-3.text-sm").filter({
    hasText: email,
  });
  const linkText = (await inviteCard.locator("p").nth(2).textContent()) ?? "";
  const tokenMatch = linkText.match(/\/invite\/([a-z0-9-]+)/i);
  if (!tokenMatch?.[1]) {
    throw new Error(`Invitation token not found in text: ${linkText}`);
  }
  return tokenMatch[1];
}

test.describe("E2E invitation flow", () => {
  test.skip(!hasInviteEnv, "Invitation E2E env vars are missing.");

  test("accept invitation, expired invitation, and role update", async ({ browser, page }) => {
    const suffix = Date.now().toString();
    const teamName = `e2e-invite-team-${suffix}`;

    await login(page, adminEmail as string, adminPassword as string);
    await createTeamAndOpenSettings(page, teamName);

    const acceptToken = await createInvitationAndGetToken(page, memberEmail as string);

    const memberCtx = await browser.newContext({ baseURL: process.env.E2E_BASE_URL || "http://localhost:3000" });
    const memberPage = await memberCtx.newPage();
    await login(memberPage, memberEmail as string, memberPassword as string);
    await memberPage.goto(`/invite/${acceptToken}`);
    await memberPage.getByRole("button", { name: "Accept invitation" }).click();
    await memberPage.waitForURL("**/app**");
    await expect(memberPage.getByText("Invitation accepted.")).toBeVisible();
    await memberCtx.close();

    await page.reload();
    const acceptedInviteCard = page.locator("div.rounded-md.border.border-slate-200.p-3.text-sm").filter({
      hasText: memberEmail as string,
    });
    await expect(acceptedInviteCard.getByText("status: accepted")).toBeVisible();

    const {
      data: { users },
      error: listUsersError,
    } = await supabaseAdmin!.auth.admin.listUsers();
    if (listUsersError) throw new Error(listUsersError.message);
    const memberUser = users.find((user) => user.email?.toLowerCase() === (memberEmail as string).toLowerCase());
    if (!memberUser) throw new Error("Member user not found.");

    const memberCard = page.locator("div.rounded-md.border.border-slate-200.p-3").filter({
      hasText: memberUser.id,
    });
    await memberCard.locator('select[name="role"]').selectOption("admin");
    await memberCard.getByRole("button", { name: "Update role" }).click();
    await expect(memberCard.getByText("Role: admin")).toBeVisible();

    const expiredToken = await createInvitationAndGetToken(page, memberEmail as string);
    const { error: expireError } = await supabaseAdmin!
      .from("invitations")
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("token", expiredToken);
    if (expireError) throw new Error(expireError.message);

    const memberCtx2 = await browser.newContext({ baseURL: process.env.E2E_BASE_URL || "http://localhost:3000" });
    const memberPage2 = await memberCtx2.newPage();
    await login(memberPage2, memberEmail as string, memberPassword as string);
    await memberPage2.goto(`/invite/${expiredToken}`);
    await memberPage2.getByRole("button", { name: "Accept invitation" }).click();
    await memberPage2.waitForURL("**/app**");
    await expect(memberPage2.getByText("Invitation expired.")).toBeVisible();
    await memberCtx2.close();
  });
});

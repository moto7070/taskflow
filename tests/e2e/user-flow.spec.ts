import { expect, test } from "@playwright/test";

const testEmail = process.env.E2E_TEST_EMAIL;
const testPassword = process.env.E2E_TEST_PASSWORD;

test.describe("E2E user flow", () => {
  test.skip(!testEmail || !testPassword, "E2E_TEST_EMAIL and E2E_TEST_PASSWORD are required.");

  test("login -> team -> project -> task -> comment -> wiki", async ({ page }) => {
    const suffix = Date.now().toString();
    const teamName = `e2e-team-${suffix}`;
    const projectName = `e2e-project-${suffix}`;
    const taskTitle = `e2e-task-${suffix}`;
    const commentBody = `e2e-comment-${suffix}`;
    const wikiTitle = `e2e-wiki-${suffix}`;
    const wikiBody = `e2e wiki body ${suffix}`;

    await page.goto("/auth/login");
    await page.locator('input[name="email"]').fill(testEmail ?? "");
    await page.locator('input[name="password"]').fill(testPassword ?? "");
    await page.locator('form[action*="loginAction"] button[type="submit"]').click();
    await page.waitForURL("**/app**");

    await page.locator('input[name="team_name"]').fill(teamName);
    await page.locator('form[action*="createTeamAction"] button[type="submit"]').click();
    await expect(page.getByText(teamName)).toBeVisible();

    const teamCard = page.locator("div.rounded-md.border.border-slate-200.p-4").filter({
      hasText: teamName,
    });
    await teamCard.locator('input[name="project_name"]').fill(projectName);
    await teamCard.locator('form[action*="createProjectAction"] button[type="submit"]').click();
    await expect(page.getByText(projectName)).toBeVisible();

    const projectRow = page.locator("div.flex.items-center.justify-between.rounded-md.border").filter({
      hasText: projectName,
    });
    await projectRow.getByRole("link", { name: "Board" }).click();
    await page.waitForURL("**/board");

    await page.locator('input[placeholder="New task title"]').first().fill(taskTitle);
    await page.locator('button:has-text("Add")').first().click();
    await expect(page.getByText(taskTitle)).toBeVisible();

    const taskCard = page.locator("div.rounded-md.border.border-slate-200.bg-white.p-3.text-sm.shadow-sm").filter({
      hasText: taskTitle,
    });
    await taskCard.getByRole("button", { name: "Open details" }).click();

    await page.locator('textarea[placeholder="Write a comment..."]').fill(commentBody);
    await page.getByRole("button", { name: "Post comment" }).click();
    await expect(page.getByText(commentBody)).toBeVisible();

    const boardPath = new URL(page.url()).pathname;
    const projectId = boardPath.split("/")[3];
    await page.goto(`/app/project/${projectId}/wiki/new`);

    await page.locator('input[placeholder="Page title"]').fill(wikiTitle);
    await page.locator('textarea[placeholder="Page content"]').fill(wikiBody);
    await page.getByRole("button", { name: "Create page" }).click();

    await page.waitForURL("**/wiki/**");
    await expect(page.getByRole("heading", { name: wikiTitle })).toBeVisible();
    await expect(page.getByText(wikiBody)).toBeVisible();
  });
});

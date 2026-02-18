# UI Diff Checklist

## Purpose
- Compare implemented UI against the agreed design direction.
- Detect visual regressions before release.
- Use this checklist for `T171` (UI review) and `T172` (responsive fixes).

## Review Scope
- Public: `/` (LP), `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password`
- Protected: `/app`, `/app/team/[teamId]/settings`, `/app/project/[projectId]/board`, `/app/project/[projectId]/wiki`

## Common Checks (All Pages)
- Layout uses consistent max-width, spacing rhythm, and card radius.
- Typography hierarchy is clear (`h1/h2/body/caption`).
- Color usage follows current palette (`slate` base + status colors only).
- Primary / secondary / destructive buttons are visually distinct and consistent.
- Input fields have consistent height, focus ring, and error state.
- Success/error messages are visible and styled consistently.
- Empty states are present and readable.
- Loading and disabled states are not visually broken.
- Long text (IDs, email, URLs) wraps without overflow.

## Navigation and Information Architecture
- Main navigation labels are consistent with feature naming.
- Back/forward flow between dashboard, board, wiki, team settings is clear.
- Critical actions (delete/remove) are separated from neutral actions.
- Page titles match feature context and avoid ambiguity.

## Accessibility (Minimum)
- Interactive controls are keyboard reachable.
- Focus indicators are visible.
- Color contrast is acceptable for text and action buttons.
- Form labels are present and associated with inputs.
- Icon-only controls include text or accessible labels.

## Page-Specific Checks

### LP (`/`)
- Hero section clearly explains product value.
- Sign up / login CTA visibility is strong on first viewport.
- Section spacing does not collapse on small screens.

### Auth (`/auth/*`)
- Form width and spacing are consistent across auth pages.
- Validation/error messages appear close to fields.
- OAuth button style aligns with other auth actions.

### Dashboard (`/app`)
- Team cards and project list visual hierarchy is clear.
- Create team / create project forms do not crowd each other.
- Project action buttons (Board/Wiki/Delete) are aligned and readable.

### Team Settings
- Members, invitations, and audit logs sections are visually separated.
- Role update and remove controls do not appear dangerous by default.
- Audit log rows remain readable even with long metadata.

### Board
- Column widths and card spacing remain consistent.
- Drag-and-drop feedback is clear (active/over states).
- Modal content (task details/comments/subtasks) avoids overflow.

### Wiki
- List/detail/editor areas are clearly distinguishable.
- Save/delete actions are placed predictably.
- Revision-related messaging is understandable.

## Responsive Checks (Desktop / Mobile)
- No horizontal scroll at 375px width (except intentional code/text blocks).
- Forms stack cleanly on mobile.
- Action button groups wrap without overlap.
- Modal/dialog content remains usable on mobile height.
- Table/list-like rows degrade to stacked layout when needed.

## Output Format for Review
- For each page:
  - `Pass` / `Needs Fix`
  - screenshot or short note of issue
  - file path to fix target
  - priority: `P0` (blocking), `P1` (important), `P2` (polish)

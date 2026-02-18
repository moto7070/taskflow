# UI Review Report (T171)

Date: 2026-02-18  
Method: implementation-based review using `docs/design/ui-diff-checklist.md` (no visual screenshot capture in this pass)

## Summary
- Reviewed targets: LP, Auth, Dashboard, Board, Wiki, Team Settings
- Result:
  - `Pass`: 7
  - `Needs Fix`: 5
- Main focus for next task (`T172`): mobile wrapping and small-screen action layout

## Findings

1. Page: `/` (LP)  
Status: `Pass`  
Notes: CTA導線、見出し階層、余白は整っている。

2. Page: `/auth/login`  
Status: `Needs Fix` (`P2`)  
Issue: 文言が現状と不一致。Googleログイン有効化済みだが「後続対応」と表示。  
Target: `src/app/(public)/auth/login/page.tsx`

3. Page: `/auth/signup`  
Status: `Pass`  
Notes: フォーム構成、エラーメッセージ配置、CTAは一貫。

4. Page: `/app` (Dashboard header/actions)  
Status: `Needs Fix` (`P1`)  
Issue: ヘッダー行が `justify-between` 固定で、狭幅時にボタン群が詰まりやすい。  
Target: `src/app/(protected)/app/page.tsx`

5. Page: `/app` (Projects list actions)  
Status: `Needs Fix` (`P1`)  
Issue: `Board/Wiki/Delete` ボタン群が横並び固定で、モバイルで折返ししにくい。  
Target: `src/app/(protected)/app/page.tsx`

6. Page: `/app/team/[teamId]/settings`  
Status: `Pass`  
Notes: セクション分離は明確。監査ログ追加後も可読性は確保されている。

7. Page: `/app/project/[projectId]/board` (header controls)  
Status: `Needs Fix` (`P1`)  
Issue: 上部コントロール行が3ブロック固定で折返し制御が弱い。  
Target: `src/components/board-dnd.tsx`

8. Page: `/app/project/[projectId]/board` (columns area)  
Status: `Pass`  
Notes: 横スクロール設計でカード崩れは回避できている。

9. Page: `/app/project/[projectId]/wiki`  
Status: `Needs Fix` (`P2`)  
Issue: ヘッダーのタイトル+ボタン行が狭幅で詰まる可能性。  
Target: `src/app/(protected)/app/project/[projectId]/wiki/page.tsx`

10. Common (danger actions)  
Status: `Pass`  
Notes: 削除系は赤系スタイルで視認できる。

11. Common (long text handling)  
Status: `Pass`  
Notes: 招待リンク・IDなどは折返しクラスが適用されている箇所が多い。

12. Common (accessibility minimum)  
Status: `Needs Fix` (`P2`)  
Issue: 一部フォームで `label` と `input` の `htmlFor/id` 対応が未統一。  
Target: Authページ、Dashboardフォームの入力群

## T172 Candidate Fixes
- `Dashboard`: ヘッダーとプロジェクト行を `flex-wrap` ベースへ調整。
- `Board`: 上部コントロール行を `flex-wrap` と `gap-y` で崩れにくくする。
- `Wiki`: ヘッダー行をモバイルで縦積みする。
- `Auth/Dashboard`: `label` と `input` の `id/htmlFor` 対応を統一。

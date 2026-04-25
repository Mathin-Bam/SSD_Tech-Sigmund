---
pdf_options:
  format: Letter
  margin: 18mm
  printBackground: true
document_title: SSD-Tech Sigmund — Admin & Executive Tutorial
---

# SSD-Tech Sigmund — Project Tracker

## Administrator & Executive Tutorial

**Version:** aligned with application source (React + Vite + Supabase)  
**Purpose:** Describe workflows, privileges, and how admins curate a semi-automatic executive-facing project status experience.

**To regenerate the PDF:** `npx md-to-pdf docs/SSD-Tech-Sigmund-Admin-Executive-Tutorial.md`

---

## Product goals

1. **Semi-automatic client updates:** Feature rows and activity logs live in Supabase; the UI uses **Realtime** subscriptions so dashboards refresh when data changes—without manual refresh for connected users.
2. **Strong admin control:** Bulk CSV upserts, per-feature editing (progress, narrative, visibility, links), team onboarding, and GitHub-related **Settings** give delivery leads maximum ability to align the portal with the project plan.

---

## 1. Architecture (how the codebase works)

| Layer | Responsibility |
|--------|------------------|
| **React Router** | `/login` for unauthenticated flow; `/*` for dashboard behind auth. |
| **AuthContext** | Supabase session + `profiles.role` (`admin` \| `executive`). |
| **useFeatures** | Loads `features` table; realtime channel refetches on any change; optimistic updates on save; falls back to **seed** data if DB empty or errors. |
| **useTeamMembers** | Active `team_members`; realtime; invite via Edge Function `invite-member`; deactivate sets `active: false`. |
| **useUpdateLogs** | Last 10 logs per feature; realtime on inserts for that `feature_id`. |
| **useSettings** | Reads/writes `system_settings` key `github_integration` (enabled + log format template). |

**Phases** in Overview/Timeline currently come from **static seed** in code, while feature rows carry `phaseId` / `phaseName` from the database.

---

## 2. User journey (workflow)

1. **Welcome** → user picks a project card → **Login** (email/password, Supabase Auth).
2. After sign-in, **profile role** loads from `profiles`.
3. **AppShell** shows sidebar links: executives see “Client Portal”; admins see extra items (**Onboarding**, **Uploads**, **Settings**).
4. Admins maintain data (UI + CSV + optional automation); executives read Overview → Features / Timeline / Risks as needed.
5. Manual feature saves (admin) insert **`update_logs`** rows for audit-style history.

---

## 3. Executive (client) guide

### What you get

- **Executive Overview:** KPI cards (phases, completion, in progress, at risk, delayed, testing, assignees, overall completion %), **Major Deliverables** (executive summary, MVP link, SRS badge/link), **Phase Overview** with progress bars.
- **Feature Tracker:** Search + filters (phase, stage, on-track status); row click opens **read-only** detail: owner, priority, description, executive summary, dependencies, deadline alerts, MVP button when progress complete; **Activity History** from `update_logs`.
- **Timeline:** Current focus, milestone cards by phase, filters, expandable detail (tasks, summary, blockers, dependencies); sidebar stage donut and risks.
- **Team:** Members, current assignment snapshot, capacity.
- **Risks & Blockers:** Filtered risk views, severity, escalation-oriented UI.

### What is withheld from executives (by design)

- No **Onboarding / Uploads / Settings** routes.
- No **feature editor** modal.
- **Internal** fields (e.g. GitHub PR URL, internal notes) are not shown the same way as for admins; sidebar copy positions this as client-facing.

### How to use it well

1. Start weekly at **Overview**, then **Timeline** for sequencing and **Risks** when confidence slips.
2. Trust **Executive summary** text—it is the curated client narrative.
3. Use **MVP / Demo** links to validate tangible progress.

---

## 4. Administrator guide

### Admin-only areas

| Page | Function |
|------|-----------|
| **Onboarding** | Invite by email; list active members; **Remove** deactivates `team_members`. |
| **Uploads** | Parse CSV → validate required headers → **upsert** `features` on `feature_id`. |
| **Settings** | GitHub webhook automation toggle + log line template (`{sha}`, `{message}`, `{url}`). |

### Feature editor (Features page)

Click a row (admin) to open the modal. Persisted fields include:

- **Progress** 0–100  
- **Assigned developer** (dropdown from `team_members`)  
- **Executive summary** (client-facing)  
- **MVP / demo URL**, **SRS requirement ID** (id or URL)  
- **GitHub PR URL**, **Internal notes** (admin-oriented)  
- **Visible in Executive view** → `client_visibility` boolean  

Saving updates Supabase and appends **`update_logs`** (change note lists patched keys).

### CSV upload rules

- **Required columns:** `featureId`, `featureName`, `description`, `phaseId`, `phaseName`, `moduleName`, `priority`, `assignedTo`, `owner`, `team`, `stage`, `status`, `progress`, `startDate`, `plannedDeadline`, `estimatedCompletionDate`, `currentTask`, `nextTask`, `dependencies` (pipe `|` separated in CSV), `blockerNote`, `qaStatus`, `designStatus`, `developmentStatus`, `lastUpdatedBy`, `lastUpdatedAt`, `clientVisibility` (`true` / `false` string).
- **Optional:** `revisedDeadline`, `onTrackStatus`, `executiveSummary`, `mvpUrl`, `srsRequirementId`, `githubPrUrl`, `internalNotes`.
- Max file size in UI: **2 MB**.

### Invitations (important)

The Edge Function **`invite-member`** accepts only **`admin`** or **`executive`** as the invited **portal role** (stored on `profiles.role`). If the onboarding form sends a **job title** instead, validation will fail until UI and API are aligned (e.g. separate “Portal access” vs “Job title” fields).

---

## 5. Curating the executive view

- **Executive summary** is the main prose control across Overview, Features, Timeline, and Risks cards.
- **Progress + deadlines + status** drive **on-track** classification (rules in `domain/rules.ts`: blocked/delayed, days to deadline vs progress bands, stale updates).
- **`client_visibility`:** Use to mark work that should not appear in client-curated storylines (field is stored on every feature; align your process with how you expect lists to be filtered).
- **Activity logs:** Combine manual saves with optional **`github_push`** rows for semi-automatic traceability.

---

## 6. Privileges matrix

| Capability | Executive | Admin |
|------------|-----------|-------|
| Overview, Timeline, Team, Risks | Yes | Yes |
| Feature registry (read) | Yes | Yes |
| Feature editor + DB save | No | Yes |
| CSV bulk upsert | No | Yes |
| Onboarding / Settings | No | Yes |
| GitHub PR / internal notes in UI | Reduced / omitted | Yes |
| Activity history on feature | Yes | Yes |
| Sign out | Yes | Yes |

RLS policies in Supabase should enforce the same boundaries as the UI.

---

## 7. Tables reference

- **`profiles`** — `id`, `role`, `full_name`  
- **`features`** — full feature record (snake_case in DB, camelCase in app)  
- **`update_logs`** — `feature_id`, `changed_by`, `change_type`, `note`, `created_at`  
- **`team_members`** — roster + `active`  
- **`system_settings`** — JSON values (e.g. GitHub integration)

---

*End of tutorial. PDF generated from this Markdown file.*

# Morning Deck

Morning Deck is a daily client relationship review tool. Each morning you work through a deck of cards — one per active client — marking each as reviewed or flagging it for follow-up. The goal is a consistent ritual that keeps no client falling through the cracks.

## Prerequisites

- Node.js + pnpm
- A Supabase project (local or hosted)

## Environment variables

Create a `.env` file based on `.env.example`:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
```

Vite only exposes environment variables prefixed with `VITE_`.

## Supabase schema + migrations

1. Apply the SQL in `supabase/migrations/0001_init.sql` to your Supabase project.
2. (Optional) Seed demo data using `supabase/seed.sql` (replace the `user_id` placeholder with a real `auth.users` id first).

## Local development

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
pnpm preview
```

## Available commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm check` | TypeScript type checking |
| `pnpm test` | Run test suite |
| `pnpm format` | Format code with Prettier |

---

## How the daily review works

Every visit to `/morning` (Morning Deck) triggers this flow:

1. **Deck creation** — On first visit of the day, the app automatically creates a new daily run and populates it with all your `active` clients, sorted alphabetically.
2. **Card review** — You step through one card per client. Each card shows:
   - Client name, priority badge, and health score
   - Up to 5 bullet-point summaries (your pre-written quick-reference notes)
   - Open tasks (those marked `show_in_deck`) with due dates
   - Recent activity notes
   - Contacts, billing links, and document links in an expandable section
3. **Mark the outcome** — For each client choose one action:
   - **Reviewed** (✓) — relationship is in good shape, nothing urgent.
   - **Flag** (⚑) — something needs attention today. You can add a quick note before moving on.
4. **Daily focus** — A free-text field at the top of the deck lets you note your single most important client focus for the day.
5. **Completion** — When you reach the last card the deck shows a completion summary. The dashboard progress bar reflects how many clients have been reviewed or flagged vs. the total.

> **Tip:** The deck resets every calendar day (New York timezone). Running it first thing in the morning before checking email helps you stay proactive rather than reactive.

---

## Client setup for an effective deck

The quality of your morning review depends on the data you keep on each client. Here is what each field does and how to use it:

| Field | Purpose | Guidance |
|-------|---------|----------|
| **Status** | `active` / `inactive` / `prospect` | Only `active` clients appear in the morning deck. Move clients to `inactive` when the engagement pauses so they disappear from your daily ritual without being deleted. |
| **Priority** | `high` / `medium` / `low` | Shown as a badge on every card. High-priority clients display more prominently on the dashboard. |
| **Health score** | 1–10 integer | Your subjective read on relationship health. Update it when something changes. The dashboard surfaces clients with declining scores. |
| **Bullets** | Short summary lines | Write 3–5 bullets that capture the essence of the relationship — what they care about, the current status, and the next milestone. These are shown first on each card, so make them skimmable. |
| **Tasks** | Action items with due dates | Tasks with `show_in_deck` enabled appear directly on the morning card as a checklist. Use this for the 1–2 things you must not forget for that client. |
| **Notes** | Time-stamped log entries | Add a note after any significant interaction. The last 10 notes are visible on the card so you can recall context instantly. |
| **Contacts** | Names, emails, phone numbers | Stored per-client so you can dial or email directly from the card without leaving the app. |

---

## Dashboard at a glance

The home dashboard (`/`) gives you a pre-flight view before you start your deck. Here is what each metric tells you:

| Metric | What it means | When to act |
|--------|--------------|-------------|
| **Active clients** | Count of clients with `status = active` | If this number surprises you, check whether inactive or prospect clients should be promoted or archived. |
| **High priority** | Active clients flagged as `priority = high` | These deserve the most attention in today's deck. |
| **Needs attention** | Clients whose `last_touched_at` is ≥ 7 days ago | A client appearing here means you haven't logged a note or completed a task for them in over a week. Open their card and add a note to reset the clock. |
| **Overdue tasks** | Tasks past their due date | Expand the task list to see which clients have overdue items. Complete or reschedule them before starting your deck. |
| **Today's progress** | Reviewed + flagged ÷ total active clients | Aim to reach 100% each morning. A partially complete bar means you left the deck mid-session — head to `/morning` to finish. |

> **Tip:** Glance at the dashboard before opening the deck. Clear overdue tasks first, then run the deck so you start each card with a clean mental slate.

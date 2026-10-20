1. Read the Principles section of the **poteto-mode** skill.

## Phase A: Frame

- Definition of done: account lists and profiles display registration and last-edit timestamps; account lists and the executive dashboard filter by rolling date ranges; lesson and question writes enforce role plus persisted ownership, and their APIs expose last-edit timestamps.
- Scope: `api/backend.php`, `kidlearn_full.sql`, the user/content screens and API wrappers, one upgrade migration, and setup documentation. The repository has no test framework; the configured database must not be inspected or changed in this task.
- Rigor: high for authorization and schema changes, medium for date-filter UI.
- Blockers: existing accounts have `created_at` only; lessons have `updated_by`; questions have no owner or edit timestamp.
- Historical edits cannot be reconstructed for older accounts or questions; they remain unknown until a new edit. Existing questions without an owner remain editable only by admins and officers.

throughput checkpoint: schema/API and UI phases implemented; JavaScript syntax and diff checks pending; no live database verification.

## Phase B: Design the workflow

- Data model: `created_at` and trigger-maintained `updated_at` for accounts; `created_by` owner plus `updated_by` and `updated_at` for lessons and questions; date filter enum `all | 7d | 1m | 1y`.
- Date semantics: 7 days, 1 month, and 1 year are rolling periods ending at the current time, not calendar periods.
- Authorization: teachers edit only content they own; admins and officers can edit all content; executives and other roles are read-only. Existing lesson owners are copied from `updated_by`; ownerless legacy questions remain unavailable to teachers until an admin or officer edits them.
- Delivery phases: (1) add idempotent PostgreSQL migration and fresh-install schema fields; (2) enforce content ownership at API writes and expose timestamps; (3) add date filters and account/content date displays; (4) inspect diff and run available non-mutating syntax checks.
- Parallel work: skip; the active multi-agent policy disallows delegation unless requested.
- Verification harness: no live DB harness can safely run without using configured credentials or changing state; verify source syntax and diff integrity locally, and disclose the unverified DB behavior.

## Phase C: Run the loop

- [x] Phase 1: Ground account and content ownership, list/dashboard data flows, schema, and existing edit APIs.
- [x] Phase 2: Add an idempotent PostgreSQL migration for account update time and explicit content ownership/update times.
- [x] Phase 3: Enforce role plus owner at write boundaries and return timestamps through the APIs.
- [x] Phase 4: Add rolling-range filters and date displays to user lists, profile, and executive dashboard.
- [x] Phase 5: Inspect the final diff and run non-mutating syntax checks. JavaScript and diff checks pass; PHP syntax check is unavailable because PHP CLI is not installed.

## Phase D: Keep the audit trail

- [x] Append decisions and verification outcomes to `.audit/account-content.tsv`.
- [x] Independent cross-model audit of the trail. Skip: subagent dispatch is disabled by the active multi-agent policy.

## Phase E: Verify and hand back

- [x] Confirm all JavaScript parses and `git diff --check` passes; report PHP and live DB verification as inconclusive.
- [x] Inspect final change summary and identify the required migration order.

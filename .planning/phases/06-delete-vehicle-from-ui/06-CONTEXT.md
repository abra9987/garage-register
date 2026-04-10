# Phase 6: Delete Vehicle from UI - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode — user accepted all recommendations)

<domain>
## Phase Boundary

Andrey can delete erroneous or test vehicle records directly from the UI with a confirmation dialog, preventing accidental deletions. DELETE endpoint already exists at `/api/vehicles/[id]` (cascades to documents). This phase adds UI controls only.

</domain>

<decisions>
## Implementation Decisions

### Confirmation Dialog
- Install shadcn AlertDialog component — most semantic for destructive confirmations, standard shadcn pattern
- AlertDialog shows vehicle identifier (job number + make/model) so user confirms the right record
- "Delete" button in dialog uses `variant="destructive"` — consistent with existing button patterns
- Cancel dismisses dialog with no action

### Delete Button Placement
- Add delete button to VehicleTable (register page) — in actions column alongside existing "View" button
- Add delete button to ActionBar (review page) — alongside existing Save/Approve buttons
- Use Trash2 icon from lucide-react — consistent with Lucide icon usage throughout app
- Button uses `variant="ghost"` with destructive hover state — not prominent by default, clear on hover

### Behavior After Delete
- On successful delete: toast success via Sonner, remove row from table (client-side state update), redirect to register if on review page
- On error: toast error with message from API
- Loading state: Loader2 spinner in button during API call, button disabled

### Claude's Discretion
- Exact AlertDialog copy/wording
- Whether to show delete on exported vehicles (recommend: yes, with extra warning)
- Mobile VehicleCard delete button placement

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- DELETE endpoint at `src/app/api/vehicles/[id]/route.ts` lines 152-175 — cascades documents then vehicle
- ActionBar component at `src/components/review/action-bar.tsx` — existing pattern for page actions
- Button component with `variant="destructive"` already defined
- Sonner toast for success/error notifications
- Loader2 icon pattern for async button states

### Established Patterns
- Buttons with `disabled={isLoading}` and Loader2 spinner during async ops
- Toast notifications: `toast.success()` / `toast.error()` via Sonner
- `variant="outline"` or `variant="ghost"` for secondary actions
- `size="lg"` with `h-12 w-full` in ActionBar

### Integration Points
- `src/components/register/vehicle-table.tsx` — add delete to actions column
- `src/components/register/vehicle-card.tsx` — add delete to mobile card
- `src/components/review/action-bar.tsx` — add delete button
- `src/app/(app)/register/page.tsx` — needs state update after delete (remove row)

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond standard patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

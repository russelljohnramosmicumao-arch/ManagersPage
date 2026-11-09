# Kape Bar-Rio Shop & Hours — Staged Rollout

**Status:** staged on feature branches; do not merge until the database migration is reviewed and tested. No live shop schedule, cashier status or online ordering flag has been changed by these commits.

## Deploy order (critical)

1. Review `migrations/staged_shop_hours_20261109.sql` and apply it to the KBR Supabase project.
2. Check security: anonymous users can **read** the public shop hours and ask whether a hypothetical order is allowed; only authenticated managers can **write** hours or read the change history. Raw settings tables are not directly exposed.
3. Run the database smoke tests below in a **transaction that rolls back** all test edits.
4. Merge **Online Ordering** branch `feature/central-shop-hours-20261109` first, after the migration is applied; check its GitHub Pages deployment and test as a customer.
5. Merge **Manager** branch `feature/central-shop-hours-20261109` after customer checkout is verified.
6. Test manual opening, temporary closing, expiry, pickup/delivery switches, future holiday, and unchanged accepted orders with actual Android and iPhone.
7. If a regression appears: revert the customer and manager frontend commits. Leave the backward-compatible configuration table and functions in place unless a deliberate database rollback is separately reviewed.

## Current default values

- Monday–Friday: **11:00 AM–11:00 PM**.
- Saturday–Sunday: **3:00 PM–11:00 PM**.
- Advance order pickup opens **30 minutes** after the day’s posted opening time and stops **15 minutes** before closing.
- Advance delivery opens **30 minutes** after posted opening on weekdays and **60 minutes** on weekends; stops **30 minutes** before closing.
- Online ordering, delivery, pickup and advance orders enabled.
- Manual override disabled (automatic).
- Overnight trading windows are *not supported in this release*.

These settings are business opening hours; they do **not** open or close a cash shift. Actual cashier shifts remain under Open/Close Shop.

## Manager Settings

- Shop mode: automatic, temporary open or temporarily closed; manual modes expire within 7 days.
- Independent Online Ordering, Pickup, Delivery, Advance Orders switches.
- Seven individual weekday schedules; closed-day switches.
- Scheduled order timing, notices and cutoff windows.
- Special dates (closed or custom hours), including reason.
- Manager-only audit history, revision-aware save and conflict detection.

## Customer behavior

- Online menu loads published settings alongside the existing menu.
- Closed shop offers advance ordering only when enabled.
- Date/time picker uses configured hours and special dates.
- Each checkout makes a fresh server-side availability preflight.
- Supabase checkout trigger is the **authority** and rejects new submissions that violate current settings.
- Existing accepted orders and their payments are not cancelled by switching hours.
- If settings cannot load, new orders fail closed rather than using stale hours.

## Before deployment — test checklist

- [ ] DB migration applies cleanly.
- [ ] Existing weekday/weekend pickup and delivery slots match previous behavior.
- [ ] A regular day marked closed has no slots.
- [ ] A special date with custom hours uses those hours.
- [ ] Manual closed mode stops new submissions and expires on schedule.
- [ ] Force Open allows immediate orders **only** if the cashier/shop shift is really open.
- [ ] Online pause blocks both current and advance order creation in the database.
- [ ] Turning off delivery/pickup individually blocks just that service.
- [ ] Cash register shift handover/close is unaffected by editing posted hours.
- [ ] A customer’s open checkout page cannot bypass newly saved rules.
- [ ] A historical accepted order can still update status without revalidation.
- [ ] Two managers editing concurrently cannot overwrite each other’s changes.
- [ ] Staff or anonymous users cannot modify Shop & Hours settings or view its audit log.
- [ ] PWA offline cache update loads the latest client.

## Rollback note

Avoid dropping the shared settings table on rollback: it holds future audit data. Roll back the UI to the previous releases, then explicitly restore the legacy schedule trigger and menu snapshot functions if needed. The two stored function definitions should be backed up before the migration is applied.

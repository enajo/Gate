# 0001 — Calendar-provider abstraction

## Context

While investigating how to support connecting more than one calendar
provider, tracing the actual booking/availability code path surfaced a more
serious, pre-existing bug: `externalBusyRanges` — the parameter that would
carry real Google Calendar conflicts into slot availability — was never
populated by any of its three real call sites (`app/api/public/slots/route.ts`,
`availability.service.ts`'s `getPublicBookableSlots`, and `booking.service.ts`).
Every booking was only checked against Gate's own internal bookings/holds.
A professional's real Google Calendar was fetched and displayed as "connected"
in the dashboard, but never actually consulted to prevent a double-booking.

## Decision

Built `server/services/calendar-provider.service.ts` as the single place that
knows how to route a `CalendarAccount` to its actual provider implementation.
`availability.service.ts` now always calls through this abstraction
(`fetchExternalBusyRanges`) instead of relying on a parameter nobody was
setting. `booking.service.ts`'s event-creation path was switched from calling
`googleCalendarService` directly to calling `calendarProviderService.createEvent`.

## Why

Fixing the conflict-checking bug and adding multi-provider support turned out
to be the same fix: `CalendarAccount` was already provider-agnostic at the
schema level (`provider: CalendarProvider`, `useForConflictCheck`,
`isDefaultEventCalendar`) — a professional could already have Google and
(eventually) Outlook accounts side by side, they just weren't both being read
from. Routing every call through one abstraction means adding Outlook or
CalDAV later is "add one branch to `calendar-provider.service.ts`," not
touching every call site that needs busy times or creates events again.

Unimplemented providers fail open — `getBusyRangesForAccount` logs a warning
and returns `[]` rather than crashing the whole availability check, matching
the project's general fail-open philosophy (see `CLAUDE.md`).

## Alternatives considered

- **Patch the three call sites individually** to populate
  `externalBusyRanges` from Google directly. Rejected — would have fixed the
  bug but not the multi-provider requirement, and left three places that
  would each need their own Outlook/CalDAV branch later instead of one.

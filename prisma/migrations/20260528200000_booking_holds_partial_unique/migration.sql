-- Partial unique index on booking_holds:
-- Prevents two ACTIVE holds from covering the same slot for the same professional.
-- Only one hold per (professional_id, slot_start, slot_end) can have status = 'ACTIVE'.
-- Released, expired, and converted holds are excluded so history is preserved.

CREATE UNIQUE INDEX booking_holds_active_slot_unique
  ON booking_holds (professional_id, slot_start, slot_end)
  WHERE status = 'ACTIVE';

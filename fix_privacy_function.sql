-- fix_privacy_function.sql
-- Deprecated helper script previously used to override fn_CanUserViewTicket.
-- TicketMaster has been removed; the canonical function lives in 16_privacy_and_watchers.sql.
-- This file is intentionally a no-op to avoid reintroducing deprecated objects.
PRINT 'fix_privacy_function.sql skipped (canonical privacy function defined in 16_privacy_and_watchers.sql).';
GO

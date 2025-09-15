SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
INSERT INTO app.Tickets (summary, status, severity, site_id, created_at, updated_at, is_private, has_service_request, privacy_level) 
VALUES ('Simple Test Ticket', 'Open', 1, 1000, SYSUTCDATETIME(), SYSUTCDATETIME(), 0, 0, 'public');
SELECT COUNT(*) as total FROM app.Tickets;
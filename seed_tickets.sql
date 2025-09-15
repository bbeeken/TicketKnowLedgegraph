-- Seed fresh tickets for testing PATCH functionality
SET QUOTED_IDENTIFIER ON;

INSERT INTO app.Tickets (
  summary, 
  description, 
  status, 
  severity, 
  category_id, 
  site_id, 
  created_by, 
  created_at, 
  updated_at,
  is_private,
  has_service_request,
  privacy_level
)
VALUES 
  ('Test Ticket 1', 'This is a test ticket for PATCH testing', 'Open', 2, 1, 1000, 8, SYSUTCDATETIME(), SYSUTCDATETIME(), 0, 0, 'public'),
  ('Test Ticket 2', 'Another test ticket for update functionality', 'Open', 1, 1, 1000, 8, SYSUTCDATETIME(), SYSUTCDATETIME(), 0, 0, 'public'),
  ('HVAC Issue', 'Air conditioning not working in main building', 'Open', 3, 2, 1001, 8, SYSUTCDATETIME(), SYSUTCDATETIME(), 0, 0, 'public'),
  ('Network Outage', 'Internet connection down in office area', 'In Progress', 4, 3, 1002, 8, SYSUTCDATETIME(), SYSUTCDATETIME(), 0, 0, 'public'),
  ('Printer Problem', 'Main office printer is offline', 'Open', 1, 1, 1000, 8, SYSUTCDATETIME(), SYSUTCDATETIME(), 0, 0, 'public');

-- Check the inserted tickets
SELECT ticket_id, summary, status, severity FROM app.Tickets ORDER BY ticket_id DESC;
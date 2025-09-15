-- Simple ticket seed script
USE [OpsGraph];
GO

SET QUOTED_IDENTIFIER ON;
GO

-- Quick ticket seed script with correct site_id mappings and SET options
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

-- site_id=1: Vermillion (store_id=1006)
-- site_id=2: Steele (store_id=1002)  
-- site_id=3: Summit (store_id=1001)
-- site_id=4: SummitShop (store_id=1021)
-- site_id=5: Hot Springs (store_id=1009)
-- site_id=6: Corporate (store_id=1000)
-- site_id=7: Heinz Retail Estate (store_id=2000)

INSERT INTO app.Tickets (summary, description, status, severity, category_id, site_id, created_by, substatus_code, created_at, updated_at) VALUES 
('POS Terminal Issue', 'Main POS terminal not responding at register 1', 'Open', 3, 3, 1, 1, 'awaiting_assignment', SYSUTCDATETIME(), SYSUTCDATETIME()),
('Network Connectivity Problem', 'Internet connection dropping intermittently', 'In Progress', 2, 1, 2, 1, 'researching', SYSUTCDATETIME(), SYSUTCDATETIME()),
('Fuel Dispenser Error', 'Dispenser #2 showing out of order message', 'Open', 3, 2, 3, 1, 'awaiting_assignment', SYSUTCDATETIME(), SYSUTCDATETIME()),
('Coffee Machine Maintenance', 'Coffee machine needs cleaning and maintenance', 'In Progress', 1, 2, 5, 2, 'scheduled_maintenance', SYSUTCDATETIME(), SYSUTCDATETIME()),
('Security Camera Offline', 'Parking lot camera not functioning', 'Open', 2, 1, 4, 1, 'awaiting_assignment', SYSUTCDATETIME(), SYSUTCDATETIME()),
('Corporate Network Upgrade', 'Upgrading network infrastructure at corporate office', 'In Progress', 1, 1, 6, 1, 'implementing', SYSUTCDATETIME(), SYSUTCDATETIME()),
('Real Estate Documentation', 'Update property documentation for Heinz Real Estate', 'Open', 1, 3, 7, 2, 'awaiting_review', SYSUTCDATETIME(), SYSUTCDATETIME());

SELECT 'Test tickets created successfully!' AS Result;

PRINT 'Test tickets created successfully!';
GO
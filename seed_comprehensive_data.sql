-- Comprehensive seed data for OpsGraph system
USE [OpsGraph];
GO

-- Clear existing data first (in proper order to avoid FK constraints)
DELETE FROM app.TicketMessages;
DELETE FROM app.TicketWatchers;
DELETE FROM app.Tickets;
DELETE FROM app.Assets;
DELETE FROM app.Vendors;
DELETE FROM app.UserSiteAccess;
DELETE FROM app.Users WHERE email NOT IN ('admin@example.com', 'tech@example.com');
DELETE FROM app.Categories;
DELETE FROM app.Substatuses;
DELETE FROM app.Statuses;
GO

-- Insert Statuses
SET IDENTITY_INSERT app.Statuses ON;
INSERT INTO app.Statuses (status_id, status, sort_order) VALUES
(1, 'Open', 1),
(2, 'In Progress', 2),
(3, 'Closed', 3);
SET IDENTITY_INSERT app.Statuses OFF;
GO

-- Insert Substatuses
INSERT INTO app.Substatuses (substatus_code, substatus, status_id, sort_order) VALUES
('AWAITING_ASSIGNMENT', 'Awaiting Assignment', 1, 1),
('AWAITING_EQUIPMENT', 'Awaiting Equipment', 2, 1),
('SERVICE_COMPLETE', 'Service Complete', 3, 1),
('AWAITING_CONTACT_REPLY', 'Awaiting Contact Reply', 2, 2),
('AWAITING_TECH_REPLY', 'Awaiting Tech Reply', 2, 3),
('AWAITING_SERVICE', 'Awaiting Service', 2, 4),
('CANCELED', 'Canceled', 3, 2),
('RESEARCHING', 'Researching', 2, 5);
GO

-- Insert Categories
SET IDENTITY_INSERT app.Categories ON;
INSERT INTO app.Categories (category_id, name, description, sort_order) VALUES
(1, 'Incidents', 'General incident reports', 1),
(2, 'Building / Equipment', 'Building and equipment issues', 2),
(3, 'Accounting / ChargeBack', 'Accounting chargeback issues', 3),
(4, 'Accounting / Claims', 'Accounting claims processing', 4),
(5, 'Deli_Kitchen / Equipment', 'Deli and kitchen equipment', 5),
(6, 'Heinz Real Estate', 'Real estate related issues', 6),
(7, 'Human Resources', 'HR related requests', 7),
(8, 'POS (Retalix,Verifone,TeleCheck) / Equipment', 'Point of sale system equipment', 8),
(9, 'Security Systems (Cameras, Locks, Door Controls, Alarms)', 'Security system issues', 9),
(10, 'Purchase Request', 'Purchase requests', 10),
(11, 'Accounting / Receipts', 'Receipt processing', 11),
(12, 'Merchandise / Scanning / Etags', 'Merchandise and scanning issues', 12),
(13, 'Accounting / GPNS', 'GPNS accounting issues', 13),
(14, 'Subway / Equipment', 'Subway equipment issues', 14),
(15, 'Caribou / Equipment', 'Caribou equipment issues', 15),
(16, 'Pizzahut / Equipment', 'Pizza Hut equipment issues', 16),
(17, 'Cinnabon / Equipment', 'Cinnabon equipment issues', 17),
(18, 'Cinnabon(Price Changes, Configuration)', 'Cinnabon configuration', 18),
(19, 'Subway(Price Changes, Configuration)', 'Subway configuration', 19),
(20, 'Caribou(Price Changes, Configuration)', 'Caribou configuration', 20),
(21, 'Deli(Price Changes, Configuration)', 'Deli configuration', 21),
(22, 'IT-O365(User Changes, Configuration)', 'Office 365 user management', 22),
(23, 'IT-User Equipment(User Computers,Printers,Fax)', 'User equipment support', 23),
(24, 'IT-Store Equipment(Networking,Servers)', 'Store IT infrastructure', 24),
(25, 'Accounting/Books_Polling', 'Books polling issues', 25),
(26, 'Fuel/Equipment', 'Fuel system equipment', 26),
(27, 'POS Configuration Change Request(Price Changes,ButtonsLayout)', 'POS configuration changes', 27),
(28, 'Pizzahut(Price Changes, Configuration)', 'Pizza Hut configuration', 28),
(29, 'Vendor Service Request', 'Vendor service requests', 29),
(30, 'TA Service', 'TA service requests', 30),
(31, 'IT-Phones(Service,Hardware,Configuration Changes)', 'Phone system support', 31),
(32, 'Unassigned', 'Unassigned tickets', 32),
(33, 'PDI / WorkForce', 'PDI WorkForce issues', 33),
(34, 'PDI / Enterprise', 'PDI Enterprise issues', 34),
(35, 'PDI / Hosting', 'PDI Hosting issues', 35),
(36, 'Fueling systems', 'Fueling system issues', 36),
(38, 'HandHeld', 'Handheld device issues', 38),
(39, 'Orders - IT', 'IT orders', 39),
(40, 'Orders - Fuel', 'Fuel orders', 40),
(41, 'Orders - General', 'General orders', 41),
(42, 'Preventive Maintenance', 'Preventive maintenance tasks', 42),
(43, 'Training/Documentation', 'Training and documentation', 43),
(44, 'Regulatory Compliance', 'Regulatory compliance issues', 44),
(45, 'Vendor Management', 'Vendor management', 45),
(46, 'Food Safety', 'Food safety issues', 46),
(47, 'Fuel Claims', 'Fuel claims processing', 47),
(48, 'Smart Safe', 'Smart safe issues', 48),
(49, 'Merchandising / Pricebook', 'Merchandising and pricebook', 49),
(50, 'All Retail Sites', 'All retail site issues', 50);
SET IDENTITY_INSERT app.Categories OFF;
GO

-- Insert additional test users
INSERT INTO app.Users (name, email, password, phone, role, is_admin, is_active, created_at) VALUES
('John Smith', 'john.smith@example.com', 'TechPass123!', '555-0101', 'technician', 0, 1, SYSUTCDATETIME()),
('Sarah Johnson', 'sarah.johnson@example.com', 'ManagerPass123!', '555-0102', 'manager', 0, 1, SYSUTCDATETIME()),
('Mike Davis', 'mike.davis@example.com', 'TechPass123!', '555-0103', 'technician', 0, 1, SYSUTCDATETIME()),
('Lisa Chen', 'lisa.chen@example.com', 'SuperPass123!', '555-0104', 'supervisor', 0, 1, SYSUTCDATETIME()),
('Bob Wilson', 'bob.wilson@example.com', 'StorePass123!', '555-0105', 'store_manager', 0, 1, SYSUTCDATETIME());
GO

-- Give users access to sites
INSERT INTO app.UserSiteAccess (user_id, site_id) 
SELECT u.user_id, s.site_id 
FROM app.Users u
CROSS JOIN app.Sites s
WHERE u.email IN ('admin@example.com', 'tech@example.com', 'john.smith@example.com', 'sarah.johnson@example.com', 'mike.davis@example.com', 'lisa.chen@example.com', 'bob.wilson@example.com');
GO

-- Insert Vendors
INSERT INTO app.Vendors (name, contact_name, phone, email, created_at) VALUES
('TechCorp Solutions', 'Jim Anderson', '555-1001', 'support@techcorp.com', SYSUTCDATETIME()),
('Fuel Systems Inc', 'Mary Rodriguez', '555-1002', 'service@fuelsystems.com', SYSUTCDATETIME()),
('POS Masters', 'Dave Thompson', '555-1003', 'help@posmasters.com', SYSUTCDATETIME()),
('Security Pro', 'Anna Garcia', '555-1004', 'support@securitypro.com', SYSUTCDATETIME()),
('Kitchen Equipment Co', 'Steve Brown', '555-1005', 'service@kitchenequip.com', SYSUTCDATETIME()),
('Network Solutions', 'Jennifer Lee', '555-1006', 'support@networksol.com', SYSUTCDATETIME()),
('Building Maintenance LLC', 'Robert Taylor', '555-1007', 'service@buildingmaint.com', SYSUTCDATETIME());
GO

-- Insert Assets
INSERT INTO app.Assets (asset_id, site_id, zone_id, type, model, vendor, serial, installed_at) VALUES
(1001, 1001, 1, 'POS Terminal', 'Verifone VX520', 'POS Masters', 'VX520-001', SYSUTCDATETIME()),
(1002, 1001, 1, 'Coffee Machine', 'Bunn CWTF35-3', 'Kitchen Equipment Co', 'BUNN-001', SYSUTCDATETIME()),
(1003, 1001, 2, 'Fuel Dispenser', 'Wayne Ovation II', 'Fuel Systems Inc', 'WAYNE-001', SYSUTCDATETIME()),
(1004, 1001, 1, 'Security Camera', 'Hikvision DS-2CD2143G0-I', 'Security Pro', 'HIK-001', SYSUTCDATETIME()),
(1005, 1002, 1, 'POS Terminal', 'Verifone VX520', 'POS Masters', 'VX520-002', SYSUTCDATETIME()),
(1006, 1002, 1, 'Refrigerator', 'True T-72', 'Kitchen Equipment Co', 'TRUE-001', SYSUTCDATETIME()),
(1007, 1003, 1, 'Network Switch', 'Cisco SG250-26', 'Network Solutions', 'CISCO-001', SYSUTCDATETIME()),
(1008, 1003, 2, 'Fuel Pump', 'Tokheim Quantium 510', 'Fuel Systems Inc', 'TOK-001', SYSUTCDATETIME()),
(1009, 1004, 1, 'Smart Safe', 'Gunnebo SafePay', 'Security Pro', 'GUNN-001', SYSUTCDATETIME()),
(1010, 1005, 1, 'HVAC Unit', 'Carrier 48TCED006', 'Building Maintenance LLC', 'CARR-001', SYSUTCDATETIME());
GO

-- Insert sample tickets
DECLARE @admin_id INT = (SELECT user_id FROM app.Users WHERE email = 'admin@example.com');
DECLARE @tech_id INT = (SELECT user_id FROM app.Users WHERE email = 'tech@example.com');
DECLARE @john_id INT = (SELECT user_id FROM app.Users WHERE email = 'john.smith@example.com');
DECLARE @sarah_id INT = (SELECT user_id FROM app.Users WHERE email = 'sarah.johnson@example.com');

INSERT INTO app.Tickets (summary, description, status, severity, category_id, site_id, created_by, assignee_user_id, substatus_code, created_at, updated_at) VALUES
('POS Terminal Not Responding', 'The main POS terminal at register 1 is completely unresponsive. Cannot process any transactions.', 'Open', 'High', 8, 1001, @admin_id, @john_id, 'AWAITING_ASSIGNMENT', SYSUTCDATETIME(), SYSUTCDATETIME()),
('Coffee Machine Leaking', 'Coffee machine in the store is leaking water from the bottom. Creating a safety hazard.', 'In Progress', 'Medium', 15, 1001, @tech_id, @john_id, 'AWAITING_EQUIPMENT', SYSUTCDATETIME(), SYSUTCDATETIME()),
('Fuel Dispenser Error', 'Dispenser #3 showing "Out of Order" error. Cannot dispense fuel.', 'Open', 'High', 26, 1001, @sarah_id, NULL, 'AWAITING_ASSIGNMENT', SYSUTCDATETIME(), SYSUTCDATETIME()),
('Security Camera Offline', 'Camera in parking lot appears to be offline. No video feed available.', 'In Progress', 'Medium', 9, 1001, @admin_id, @tech_id, 'RESEARCHING', SYSUTCDATETIME(), SYSUTCDATETIME()),
('Network Issues', 'Intermittent network connectivity issues affecting all store operations.', 'In Progress', 'High', 24, 1003, @john_id, @sarah_id, 'AWAITING_TECH_REPLY', SYSUTCDATETIME(), SYSUTCDATETIME()),
('HVAC Not Cooling', 'Air conditioning unit not providing adequate cooling. Store temperature rising.', 'Open', 'Medium', 2, 1005, @tech_id, NULL, 'AWAITING_ASSIGNMENT', SYSUTCDATETIME(), SYSUTCDATETIME()),
('Smart Safe Malfunction', 'Smart safe not accepting deposits. Display showing error code E-404.', 'Closed', 'Low', 48, 1004, @admin_id, @john_id, 'SERVICE_COMPLETE', DATEADD(day, -2, SYSUTCDATETIME()), SYSUTCDATETIME()),
('Price Update Request', 'Need to update prices for all Subway menu items effective immediately.', 'In Progress', 'Medium', 19, 1002, @sarah_id, @tech_id, 'AWAITING_SERVICE', SYSUTCDATETIME(), SYSUTCDATETIME()),
('Preventive Maintenance', 'Scheduled preventive maintenance for all fuel dispensers.', 'Open', 'Low', 42, 1001, @admin_id, NULL, 'AWAITING_ASSIGNMENT', SYSUTCDATETIME(), SYSUTCDATETIME()),
('Training Request', 'New employee needs training on POS system operations.', 'In Progress', 'Low', 43, 1002, @sarah_id, @john_id, 'AWAITING_CONTACT_REPLY', SYSUTCDATETIME(), SYSUTCDATETIME());
GO

-- Insert ticket messages
DECLARE @ticket1 INT = (SELECT TOP 1 ticket_id FROM app.Tickets WHERE summary = 'POS Terminal Not Responding');
DECLARE @ticket2 INT = (SELECT TOP 1 ticket_id FROM app.Tickets WHERE summary = 'Coffee Machine Leaking');
DECLARE @ticket4 INT = (SELECT TOP 1 ticket_id FROM app.Tickets WHERE summary = 'Security Camera Offline');
DECLARE @ticket5 INT = (SELECT TOP 1 ticket_id FROM app.Tickets WHERE summary = 'Network Issues');

INSERT INTO app.TicketMessages (ticket_id, user_id, message, message_type, created_at) VALUES
(@ticket1, @admin_id, 'Ticket created. POS terminal completely unresponsive.', 'comment', SYSUTCDATETIME()),
(@ticket1, @john_id, 'I will investigate this issue immediately. Checking power connections first.', 'comment', SYSUTCDATETIME()),
(@ticket2, @tech_id, 'Initial assessment shows water leak from bottom of machine. Will need replacement parts.', 'comment', SYSUTCDATETIME()),
(@ticket2, @john_id, 'Parts have been ordered. Expected delivery in 2-3 business days.', 'status_change', SYSUTCDATETIME()),
(@ticket4, @admin_id, 'Camera went offline around 2 PM today. Please check network connectivity.', 'comment', SYSUTCDATETIME()),
(@ticket4, @tech_id, 'Network connection is fine. Appears to be a camera hardware issue. Will replace unit.', 'comment', SYSUTCDATETIME()),
(@ticket5, @john_id, 'Network issues started this morning. Affecting POS systems and internet connectivity.', 'comment', SYSUTCDATETIME()),
(@ticket5, @sarah_id, 'I have contacted the ISP. They are investigating potential line issues in the area.', 'comment', SYSUTCDATETIME());
GO

-- Insert ticket watchers
INSERT INTO app.TicketWatchers (ticket_id, user_id, watcher_type, is_active) VALUES
(@ticket1, @admin_id, 'manual', 1),
(@ticket1, @sarah_id, 'manual', 1),
(@ticket2, @admin_id, 'manual', 1),
(@ticket4, @john_id, 'manual', 1),
(@ticket5, @admin_id, 'manual', 1),
(@ticket5, @tech_id, 'manual', 1);
GO

PRINT 'Comprehensive seed data has been successfully inserted!';
PRINT 'Created:';
PRINT '- 8 Substatuses mapped to 3 main statuses';
PRINT '- 50 Categories covering all business areas';
PRINT '- 5 Additional test users with site access';
PRINT '- 7 Vendors for equipment and services';
PRINT '- 10 Assets across different sites and types';
PRINT '- 10 Sample tickets with various statuses and priorities';
PRINT '- 8 Ticket messages showing conversation history';
PRINT '- 6 Ticket watchers for notifications';
GO
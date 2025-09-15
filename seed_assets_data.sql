-- Seed Assets Data for Coffee Cup Travel Plaza Sites
-- This script populates realistic assets for each site to support the Asset Management functionality

USE OpsGraph;
GO

-- Clear existing asset data if needed (commented out for safety)
-- DELETE FROM app.TicketAssets;
-- DELETE FROM app.Assets;

-- First, let's create some zones for better organization
-- These represent physical areas within each site
INSERT INTO app.Zones (site_id, label) VALUES
-- Vermillion (site_id = 1)
(1, 'Fuel Island 1'),
(1, 'Fuel Island 2'), 
(1, 'Store Interior'),
(1, 'Kitchen'),
(1, 'Back Office'),
(1, 'Parking Lot'),

-- Steele (site_id = 2)
(2, 'Fuel Island 1'),
(2, 'Store Interior'),
(2, 'Kitchen'),
(2, 'Back Office'),
(2, 'Parking Lot'),

-- Summit (site_id = 3)
(3, 'Fuel Island 1'),
(3, 'Fuel Island 2'),
(3, 'Store Interior'),
(3, 'Kitchen'),
(3, 'Back Office'),
(3, 'Parking Lot'),

-- SummitShop (site_id = 4)
(4, 'Service Bay 1'),
(4, 'Service Bay 2'),
(4, 'Parts Storage'),
(4, 'Office'),

-- Hot Springs (site_id = 5)
(5, 'Fuel Island 1'),
(5, 'Store Interior'),
(5, 'Kitchen'),
(5, 'Back Office'),
(5, 'Parking Lot'),

-- Corporate (site_id = 6)
(6, 'Main Office'),
(6, 'IT Room'),
(6, 'Conference Room'),
(6, 'Break Room'),

-- Heinz Retail Estate (site_id = 7)
(7, 'Office');
GO

-- Now insert comprehensive asset data
INSERT INTO app.Assets (asset_id, site_id, zone_id, type, model, vendor, serial, installed_at) VALUES
-- Vermillion Assets (site_id = 1)
(1001, 1, 1, 'fuel_dispenser', 'Wayne Helix 6000', 'Wayne Fueling Systems', 'WH6K-2023-001', '2023-03-15 10:00:00'),
(1002, 1, 2, 'fuel_dispenser', 'Wayne Helix 6000', 'Wayne Fueling Systems', 'WH6K-2023-002', '2023-03-15 10:30:00'),
(1003, 1, 3, 'pos_terminal', 'Verifone Ruby2', 'Verifone', 'VF-RB2-001', '2023-01-10 09:00:00'),
(1004, 1, 3, 'pos_terminal', 'Verifone Ruby2', 'Verifone', 'VF-RB2-002', '2023-01-10 09:15:00'),
(1005, 1, 4, 'coffee_machine', 'Bunn Ultra-2', 'Bunn Corporation', 'BU2-2022-101', '2022-11-20 14:00:00'),
(1006, 1, 4, 'slush_machine', 'Cornelius Frozen Beverage', 'Cornelius Inc', 'CFB-456-2023', '2023-02-01 11:00:00'),
(1007, 1, 3, 'hvac_unit', 'Carrier 50TCA06', 'Carrier', 'CR-50TCA-001', '2022-08-15 08:00:00'),
(1008, 1, 5, 'security_camera', 'Hikvision DS-2CD2143G0-IS', 'Hikvision', 'HK-DS2CD-001', '2023-04-10 16:00:00'),
(1009, 1, 6, 'lighting_system', 'LED Canopy Lights', 'Cree Lighting', 'CRE-LED-001', '2023-01-05 12:00:00'),

-- Steele Assets (site_id = 2)
(2001, 2, 7, 'fuel_dispenser', 'Gilbarco Encore 700S', 'Gilbarco', 'GB-E700S-001', '2022-12-01 10:00:00'),
(2002, 2, 8, 'pos_terminal', 'NCR Silver', 'NCR Corporation', 'NCR-SLV-001', '2022-10-15 09:00:00'),
(2003, 2, 8, 'pos_terminal', 'NCR Silver', 'NCR Corporation', 'NCR-SLV-002', '2022-10-15 09:30:00'),
(2004, 2, 9, 'coffee_machine', 'Bunn Ultra-2', 'Bunn Corporation', 'BU2-2022-201', '2022-09-10 14:00:00'),
(2005, 2, 8, 'hvac_unit', 'Trane XR13', 'Trane', 'TR-XR13-001', '2022-07-20 08:00:00'),
(2006, 2, 10, 'security_camera', 'Axis P3245-LV', 'Axis Communications', 'AX-P3245-001', '2023-03-01 16:00:00'),
(2007, 2, 11, 'lighting_system', 'LED Parking Lot Lights', 'Lithonia Lighting', 'LTH-LED-001', '2022-11-15 12:00:00'),

-- Summit Assets (site_id = 3)
(3001, 3, 12, 'fuel_dispenser', 'Wayne Ovation', 'Wayne Fueling Systems', 'WOV-2023-001', '2023-05-01 10:00:00'),
(3002, 3, 13, 'fuel_dispenser', 'Wayne Ovation', 'Wayne Fueling Systems', 'WOV-2023-002', '2023-05-01 10:30:00'),
(3003, 3, 14, 'pos_terminal', 'Square Terminal', 'Square Inc', 'SQ-TERM-001', '2023-02-14 09:00:00'),
(3004, 3, 14, 'pos_terminal', 'Square Terminal', 'Square Inc', 'SQ-TERM-002', '2023-02-14 09:15:00'),
(3005, 3, 15, 'coffee_machine', 'Fetco CBS-2131XTS', 'Fetco', 'FET-CBS-001', '2023-01-20 14:00:00'),
(3006, 3, 15, 'fryer', 'Henny Penny Evolution Elite', 'Henny Penny', 'HP-EE-001', '2022-12-10 13:00:00'),
(3007, 3, 14, 'hvac_unit', 'Lennox XC25', 'Lennox', 'LX-XC25-001', '2022-09-05 08:00:00'),
(3008, 3, 16, 'security_camera', 'Dahua IPC-HDW5831R-ZE', 'Dahua Technology', 'DH-IPC-001', '2023-04-20 16:00:00'),
(3009, 3, 17, 'lighting_system', 'LED Canopy Lights', 'Cooper Lighting', 'CP-LED-001', '2023-01-15 12:00:00'),

-- SummitShop Assets (site_id = 4)
(4001, 4, 18, 'lift_system', 'BendPak HD-9ST', 'BendPak', 'BP-HD9ST-001', '2022-08-01 10:00:00'),
(4002, 4, 19, 'lift_system', 'BendPak HD-9ST', 'BendPak', 'BP-HD9ST-002', '2022-08-01 11:00:00'),
(4003, 4, 20, 'tool_cabinet', 'Mac Tools Tech Series', 'Mac Tools', 'MAC-TS-001', '2022-07-15 14:00:00'),
(4004, 4, 21, 'compressor', 'Ingersoll Rand 2475N7.5', 'Ingersoll Rand', 'IR-2475-001', '2022-06-20 09:00:00'),
(4005, 4, 18, 'diagnostic_equipment', 'Snap-on SOLUS Ultra', 'Snap-on', 'SO-SOLUS-001', '2022-09-10 15:00:00'),

-- Hot Springs Assets (site_id = 5)
(5001, 5, 22, 'fuel_dispenser', 'Gilbarco Encore 500S', 'Gilbarco', 'GB-E500S-001', '2022-11-10 10:00:00'),
(5002, 5, 23, 'pos_terminal', 'Clover Station Pro', 'Clover', 'CLV-SP-001', '2022-10-05 09:00:00'),
(5003, 5, 24, 'coffee_machine', 'Curtis G4 ThermoPro', 'Curtis', 'CUR-G4TP-001', '2022-12-01 14:00:00'),
(5004, 5, 23, 'hvac_unit', 'Goodman GSX13', 'Goodman', 'GM-GSX13-001', '2022-08-25 08:00:00'),
(5005, 5, 25, 'security_camera', 'Lorex 4K Ultra HD', 'Lorex Technology', 'LRX-4K-001', '2023-03-15 16:00:00'),

-- Corporate Assets (site_id = 6)
(6001, 6, 27, 'server', 'Dell PowerEdge R750', 'Dell Technologies', 'DELL-R750-001', '2023-01-10 10:00:00'),
(6002, 6, 27, 'network_switch', 'Cisco Catalyst 2960-X', 'Cisco Systems', 'CISCO-2960X-001', '2023-01-12 11:00:00'),
(6003, 6, 27, 'ups_system', 'APC Smart-UPS SRT 3000VA', 'APC by Schneider Electric', 'APC-SRT3K-001', '2023-01-15 09:00:00'),
(6004, 6, 26, 'workstation', 'HP EliteDesk 800 G9', 'HP Inc', 'HP-ED800-001', '2023-02-01 14:00:00'),
(6005, 6, 28, 'av_system', 'Polycom Studio X50', 'Polycom', 'POLY-SX50-001', '2023-02-15 13:00:00'),

-- Heinz Retail Estate Assets (site_id = 7)
(7001, 7, 30, 'workstation', 'Lenovo ThinkCentre M75q', 'Lenovo', 'LN-M75Q-001', '2023-01-20 14:00:00'),
(7002, 7, 30, 'printer', 'HP LaserJet Pro M404n', 'HP Inc', 'HP-LJP-001', '2023-01-25 15:00:00');
GO

-- Create some sample ticket-asset linkages for demonstration
-- Link some assets to existing tickets (if any exist)
-- This will be populated when tickets are created and assets are linked via the UI
PRINT 'Asset seeding completed successfully!';
PRINT 'Created assets for all 7 Coffee Cup Travel Plaza sites';
PRINT 'Asset types include: fuel_dispenser, pos_terminal, coffee_machine, hvac_unit, security_camera, lighting_system, and more';
GO
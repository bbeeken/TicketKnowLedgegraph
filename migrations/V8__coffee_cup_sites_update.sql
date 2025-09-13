-- Migration: Update Sites table with Coffee Cup Travel Plaza data
-- Version: V8__coffee_cup_sites_update.sql
-- Description: Add new columns to Sites table and populate with real Coffee Cup Travel Plaza locations

-- Add new columns to existing Sites table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'app' AND TABLE_NAME = 'Sites' AND COLUMN_NAME = 'store_id')
BEGIN
    ALTER TABLE app.Sites ADD store_id INT NULL;
END;

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'app' AND TABLE_NAME = 'Sites' AND COLUMN_NAME = 'form_title')
BEGIN
    ALTER TABLE app.Sites ADD form_title NVARCHAR(200) NULL;
END;

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'app' AND TABLE_NAME = 'Sites' AND COLUMN_NAME = 'street')
BEGIN
    ALTER TABLE app.Sites ADD street NVARCHAR(200) NULL;
END;

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'app' AND TABLE_NAME = 'Sites' AND COLUMN_NAME = 'zip')
BEGIN
    ALTER TABLE app.Sites ADD zip CHAR(5) NULL;
END;

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'app' AND TABLE_NAME = 'Sites' AND COLUMN_NAME = 'phone')
BEGIN
    ALTER TABLE app.Sites ADD phone NVARCHAR(20) NULL;
END;

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'app' AND TABLE_NAME = 'Sites' AND COLUMN_NAME = 'street_l')
BEGIN
    ALTER TABLE app.Sites ADD street_l NVARCHAR(200) NULL;
END;

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'app' AND TABLE_NAME = 'Sites' AND COLUMN_NAME = 'pdi_name')
BEGIN
    ALTER TABLE app.Sites ADD pdi_name NVARCHAR(100) NULL;
END;

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'app' AND TABLE_NAME = 'Sites' AND COLUMN_NAME = 'email')
BEGIN
    ALTER TABLE app.Sites ADD email NVARCHAR(255) NULL;
END;

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'app' AND TABLE_NAME = 'Sites' AND COLUMN_NAME = 'caribou_id')
BEGIN
    ALTER TABLE app.Sites ADD caribou_id NVARCHAR(20) NULL;
END;

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'app' AND TABLE_NAME = 'Sites' AND COLUMN_NAME = 'fuel_dispensers')
BEGIN
    ALTER TABLE app.Sites ADD fuel_dispensers BIT NOT NULL DEFAULT 0;
END;

-- Add default timezone if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'app' AND TABLE_NAME = 'Sites' AND COLUMN_NAME = 'tz')
BEGIN
    ALTER TABLE app.Sites ADD tz NVARCHAR(40) NOT NULL DEFAULT 'America/Chicago';
END;

GO

-- Clear existing data and insert Coffee Cup Travel Plaza sites
DELETE FROM app.Sites;

-- Insert Coffee Cup Travel Plaza Sites
INSERT INTO app.Sites (site_id, name, store_id, form_title, street, city, state, zip, phone, street_l, pdi_name, email, caribou_id, fuel_dispensers, tz) VALUES
(1, N'Vermillion', 1006, N'Coffee Cup Travel Plaza - Burbank', NULL, N'Burbank', N'SD', N'57010', N'6056242062', N'47051 SD-50', N'Vermillion', N'store1006@heinzcorps.com', N'8204', 1, N'America/Chicago'),
(2, N'Steele', 1002, N'Coffee Cup Travel Plaza - Steele', NULL, N'Steele', N'ND', N'58482', N'7014752274', N'620 Mitchell Ave N', N'Steele', N'store1002@heinzcorps.com', N'8427', 1, N'America/Chicago'),
(3, N'Summit', 1001, N'Coffee Cup Travel Plaza - Summit', N'45789 US-12', N'Summit', N'SD', N'57266', N'6053986493', N'45789 US-12', N'Summit', N'store1001@heinzcorps.com', N'8299', 1, N'America/Chicago'),
(4, N'SummitShop', 1021, N'TA Truck Service Center - Summit SD', NULL, N'Summit', N'SD', N'57266', NULL, N'45789 US-12', N'Summit Shop', N'shop1021@heinzcorps.com', NULL, 0, N'America/Chicago'),
(5, N'Hot Springs', 1009, N'Coffee Cup Travel Plaza - Hot Springs', NULL, N'Hot Springs', N'SD', N'57747', N'6057454215', N'27638 US-385', N'Hot Springs', N'store1009@heinzcorps.com', NULL, 1, N'America/Chicago'),
(6, N'Corporate', 1000, N'Coffee Cup Travel Plaza - Corporate Office', NULL, N'Sioux Falls', N'SD', N'57106', N'6052742540', N'2508 S Carolyn Ave', N'HH Admin', N'bbeeken@heinzcorps.com', NULL, 0, N'America/Chicago'),
(7, N'Heinz Retail Estate', 2000, N'Heinz Real Estate', NULL, N'Sioux Falls', N'SD', N'57106', N'6052742540', N'2508 S Carolyn Ave', N'HRE', N'hre@heinzcorps.com', NULL, 0, N'America/Chicago'),
-- Legacy site for backwards compatibility (keeping site_id 1006 referenced elsewhere)
(1006, N'Vermillion', 1006, N'Coffee Cup Travel Plaza - Burbank', NULL, N'Burbank', N'SD', N'57010', N'6056242062', N'47051 SD-50', N'Vermillion', N'store1006@heinzcorps.com', N'8204', 1, N'America/Chicago');

GO

PRINT 'Sites table updated with Coffee Cup Travel Plaza locations';

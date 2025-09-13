-- 02_enums_calendars_temporal.sql
-- Domain enums, calendars, temporal tables
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Statuses
IF OBJECT_ID('app.Statuses','U') IS NULL
CREATE TABLE app.Statuses (
    status NVARCHAR(30) PRIMARY KEY,
    sort_order TINYINT NOT NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM app.Statuses WHERE status = 'Open')
INSERT INTO app.Statuses (status, sort_order) VALUES
('Open',1),('In Progress',2),('Pending',3),('Resolved',4),('Closed',5),('Canceled',6);
GO

-- Severities
IF OBJECT_ID('app.Severities','U') IS NULL
CREATE TABLE app.Severities (
    severity TINYINT PRIMARY KEY,
    label NVARCHAR(40) NOT NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM app.Severities WHERE severity = 1)
INSERT INTO app.Severities (severity, label) VALUES
(1,'Info'),(2,'Minor'),(3,'Major'),(4,'High'),(5,'Critical');
GO

-- Categories
IF OBJECT_ID('app.Categories','U') IS NULL
CREATE TABLE app.Categories (
    category_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    slug NVARCHAR(100) NOT NULL UNIQUE,
    domain NVARCHAR(60) NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM app.Categories)
INSERT INTO app.Categories (name, slug, domain) VALUES
('Network/ATG','network-atg','Network'),
('Dispenser/Flow','dispenser-flow','Fuel'),
('POS/Payments','pos-payments','POS');
GO

-- Substatuses
IF OBJECT_ID('app.Substatuses','U') IS NULL
CREATE TABLE app.Substatuses (
    substatus_id INT IDENTITY(1,1) PRIMARY KEY,
    substatus_code NVARCHAR(60) NOT NULL UNIQUE,
    substatus_name NVARCHAR(120) NOT NULL,
    status NVARCHAR(30) NOT NULL,
    sort_order TINYINT NOT NULL DEFAULT 1,
    is_active BIT NOT NULL DEFAULT 1,
    CONSTRAINT FK_Substatuses_Status FOREIGN KEY(status) REFERENCES app.Statuses(status)
);
GO
IF NOT EXISTS (SELECT 1 FROM app.Substatuses WHERE substatus_code = 'awaiting_assignment')
INSERT INTO app.Substatuses (substatus_code, substatus_name, status, sort_order) VALUES
-- Open substatuses
('awaiting_assignment', 'Awaiting Assignment', 'Open', 1),
('awaiting_review', 'Awaiting Review', 'Open', 2),
('awaiting_approval', 'Awaiting Approval', 'Open', 3),
-- In Progress substatuses
('researching', 'Researching', 'In Progress', 1),
('implementing', 'Implementing', 'In Progress', 2),
('testing', 'Testing', 'In Progress', 3),
('documenting', 'Documenting', 'In Progress', 4),
-- Pending substatuses
('vendor_response', 'Awaiting Vendor Response', 'Pending', 1),
('customer_response', 'Awaiting Customer Response', 'Pending', 2),
('parts_delivery', 'Awaiting Parts Delivery', 'Pending', 3),
('scheduled_maintenance', 'Scheduled Maintenance', 'Pending', 4),
-- Resolved substatuses
('solution_implemented', 'Solution Implemented', 'Resolved', 1),
('workaround_provided', 'Workaround Provided', 'Resolved', 2),
('duplicate_closed', 'Duplicate - Closed', 'Resolved', 3),
-- Closed substatuses
('verified_resolved', 'Verified Resolved', 'Closed', 1),
('customer_satisfied', 'Customer Satisfied', 'Closed', 2),
-- Canceled substatuses
('request_withdrawn', 'Request Withdrawn', 'Canceled', 1),
('duplicate_request', 'Duplicate Request', 'Canceled', 2),
('not_reproducible', 'Not Reproducible', 'Canceled', 3);
GO

-- Visibilities
IF OBJECT_ID('app.Visibilities','U') IS NULL
CREATE TABLE app.Visibilities (
    name NVARCHAR(16) PRIMARY KEY
);
GO
IF NOT EXISTS (SELECT 1 FROM app.Visibilities WHERE name = 'internal')
INSERT INTO app.Visibilities (name) VALUES ('internal'),('public');
GO

-- LinkKinds
IF OBJECT_ID('app.LinkKinds','U') IS NULL
CREATE TABLE app.LinkKinds (
    name NVARCHAR(30) PRIMARY KEY
);
GO
IF NOT EXISTS (SELECT 1 FROM app.LinkKinds WHERE name = 'duplicate')
INSERT INTO app.LinkKinds (name) VALUES ('duplicate'),('related'),('parent'),('child');
GO

-- Calendars
IF OBJECT_ID('app.Calendars','U') IS NULL
CREATE TABLE app.Calendars (
    calendar_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(80) NOT NULL UNIQUE
);
GO

IF OBJECT_ID('app.CalendarHours','U') IS NULL
CREATE TABLE app.CalendarHours (
    calendar_id INT NOT NULL,
    dow TINYINT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    PRIMARY KEY(calendar_id, dow, start_time),
    FOREIGN KEY(calendar_id) REFERENCES app.Calendars(calendar_id)
);
GO

IF OBJECT_ID('app.Holidays','U') IS NULL
CREATE TABLE app.Holidays (
    calendar_id INT NOT NULL,
    holiday_date DATE NOT NULL,
    name NVARCHAR(80) NOT NULL,
    PRIMARY KEY(calendar_id, holiday_date),
    FOREIGN KEY(calendar_id) REFERENCES app.Calendars(calendar_id)
);
GO

-- Enable temporal tables for Tickets and TicketAssignments
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Tickets' AND temporal_type = 2)
BEGIN
    ALTER TABLE app.Tickets
    ADD ValidFrom DATETIME2(3) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL DEFAULT SYSUTCDATETIME(),
        ValidTo   DATETIME2(3) GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL DEFAULT '9999-12-31T23:59:59.999',
        PERIOD FOR SYSTEM_TIME (ValidFrom, ValidTo);
    ALTER TABLE app.Tickets SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = app.TicketsHistory));
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TicketAssignments' AND temporal_type = 2)
BEGIN
    ALTER TABLE app.TicketAssignments
    ADD ValidFrom DATETIME2(3) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL DEFAULT SYSUTCDATETIME(),
        ValidTo   DATETIME2(3) GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL DEFAULT '9999-12-31T23:59:59.999',
        PERIOD FOR SYSTEM_TIME (ValidFrom, ValidTo);
    ALTER TABLE app.TicketAssignments SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = app.TicketAssignmentsHistory));
END
GO

-- Add FKs for enums
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Tickets_Status')
ALTER TABLE app.Tickets ADD CONSTRAINT FK_Tickets_Status FOREIGN KEY (status) REFERENCES app.Statuses(status);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Tickets_Severity')
ALTER TABLE app.Tickets ADD CONSTRAINT FK_Tickets_Severity FOREIGN KEY (severity) REFERENCES app.Severities(severity);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Tickets_Category')
ALTER TABLE app.Tickets ADD CONSTRAINT FK_Tickets_Category FOREIGN KEY (category_id) REFERENCES app.Categories(category_id);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Tickets_Substatus')
ALTER TABLE app.Tickets ADD CONSTRAINT FK_Tickets_Substatus FOREIGN KEY (substatus_code) REFERENCES app.Substatuses(substatus_code);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_TicketComments_Visibility')
ALTER TABLE app.TicketComments ADD CONSTRAINT FK_TicketComments_Visibility FOREIGN KEY (visibility) REFERENCES app.Visibilities(name);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_TicketLinks_Kind')
ALTER TABLE app.TicketLinks ADD CONSTRAINT FK_TicketLinks_Kind FOREIGN KEY (kind) REFERENCES app.LinkKinds(name);
GO

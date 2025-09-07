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
    name NVARCHAR(60) NOT NULL UNIQUE
);
GO
IF NOT EXISTS (SELECT 1 FROM app.Categories)
INSERT INTO app.Categories (name) VALUES
('Network/ATG'),('Dispenser/Flow'),('POS/Payments');
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
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_TicketComments_Visibility')
ALTER TABLE app.TicketComments ADD CONSTRAINT FK_TicketComments_Visibility FOREIGN KEY (visibility) REFERENCES app.Visibilities(name);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_TicketLinks_Kind')
ALTER TABLE app.TicketLinks ADD CONSTRAINT FK_TicketLinks_Kind FOREIGN KEY (kind) REFERENCES app.LinkKinds(name);
GO

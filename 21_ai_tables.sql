-- 21_ai_tables.sql
-- Tables to store AI recommendations and annotations
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('app.TicketAIRecommendations','U') IS NULL
CREATE TABLE app.TicketAIRecommendations (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,
    provider NVARCHAR(100) NOT NULL,
    recommendations NVARCHAR(MAX) NOT NULL, -- JSON array of recommendations
    confidence FLOAT NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID('app.TicketAIAnnotations','U') IS NULL
CREATE TABLE app.TicketAIAnnotations (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,
    annotation NVARCHAR(MAX) NOT NULL,
    created_by INT NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

PRINT '21_ai_tables.sql applied';
GO

-- 00_create_database.sql
-- Create OpsGraph DB, schemas, and base config
IF DB_ID('OpsGraph') IS NULL
BEGIN
    CREATE DATABASE [OpsGraph]
    ON PRIMARY (
        NAME = N'OpsGraph',
        FILENAME = N'C:\SQLData\OpsGraph.mdf',
        SIZE = 32MB, FILEGROWTH = 8MB
    )
    LOG ON (
        NAME = N'OpsGraph_log',
        FILENAME = N'C:\SQLData\OpsGraph_log.ldf',
        SIZE = 16MB, FILEGROWTH = 8MB
    )
    WITH CATALOG_COLLATION = DATABASE_DEFAULT;
    ALTER DATABASE [OpsGraph] SET RECOVERY SIMPLE;
END
GO

USE [OpsGraph];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'app') EXEC('CREATE SCHEMA app');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'kg') EXEC('CREATE SCHEMA kg');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'sec') EXEC('CREATE SCHEMA sec');
GO

ALTER DATABASE SCOPED CONFIGURATION SET LEGACY_CARDINALITY_ESTIMATION = OFF;
GO

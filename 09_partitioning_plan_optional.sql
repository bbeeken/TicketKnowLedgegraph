-- 09_partitioning_plan_optional.sql
-- Partitioning plan for Events/Alerts (optional, guarded)
USE [OpsGraph];
GO

-- Only run if not exists
IF NOT EXISTS (SELECT * FROM sys.partition_functions WHERE name = 'pf_Monthly')
BEGIN
    CREATE PARTITION FUNCTION pf_Monthly (DATETIME2(3))
    AS RANGE RIGHT FOR VALUES ('2025-01-01T00:00:00.000', '2025-02-01T00:00:00.000', '2025-03-01T00:00:00.000');
    CREATE PARTITION SCHEME ps_Monthly AS PARTITION pf_Monthly ALL TO ([PRIMARY]);
END
GO

-- Helper proc to add next month boundary
CREATE OR ALTER PROCEDURE app.usp_AddNextMonthPartition
AS
BEGIN
    DECLARE @max DATETIME2(3) = (SELECT MAX(value) FROM sys.partition_range_values WHERE function_id = OBJECT_ID('pf_Monthly'));
    DECLARE @next DATETIME2(3) = DATEADD(MONTH, 1, @max);
    DECLARE @sql NVARCHAR(400) = N'ALTER PARTITION FUNCTION pf_Monthly() SPLIT RANGE (''' + CONVERT(NVARCHAR(30), @next, 126) + ''')';
    EXEC(@sql);
END
GO

-- Compress old partitions
CREATE OR ALTER PROCEDURE app.usp_CompressOldPartitions
AS
BEGIN
    -- Example: mark partitions older than 2 months for compression
    -- (actual compression requires Enterprise Edition)
    -- This is a stub for ops
    PRINT 'Compression logic would go here.';
END
GO

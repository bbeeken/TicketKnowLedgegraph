-- V5__monitoring_enhancements.sql
USE [OpsGraph];
GO

-- Enhance Monitor Sources with health tracking
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('app.MonitorSources')
    AND name = 'health_status'
)
BEGIN
    ALTER TABLE app.MonitorSources
    ADD last_error_at DATETIME2(3) NULL,
        error_count INT NOT NULL DEFAULT 0,
        health_status NVARCHAR(20) NOT NULL DEFAULT 'Healthy' 
            CONSTRAINT CK_MonitorSources_HealthStatus 
            CHECK (health_status IN ('Healthy', 'Degraded', 'Failed')),
        retry_backoff_mins INT NOT NULL DEFAULT 5,
        last_successful_poll_at DATETIME2(3) NULL,
        avg_response_time_ms INT NULL,
        max_requests_per_minute INT NOT NULL DEFAULT 60;
END;
GO

-- Add alert deduplication
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('app.AlertQueue')
    AND name = 'hash_signature'
)
BEGIN
    ALTER TABLE app.AlertQueue
    ADD hash_signature VARBINARY(32),
        duplicate_count INT NOT NULL DEFAULT 0,
        first_occurrence_at DATETIME2(3) NULL,
        suppressed BIT NOT NULL DEFAULT 0;

    CREATE NONCLUSTERED INDEX IX_AlertQueue_HashSignature 
    ON app.AlertQueue(hash_signature)
    WHERE processed_at IS NULL;
END;
GO

-- Alert throttling configuration
IF OBJECT_ID('app.AlertThrottleRules','U') IS NULL
CREATE TABLE app.AlertThrottleRules (
    rule_id INT IDENTITY(1,1) PRIMARY KEY,
    source_id INT NOT NULL,
    alert_type_pattern NVARCHAR(200) NULL,
    max_alerts_per_minute INT NOT NULL DEFAULT 60,
    throttle_window_mins INT NOT NULL DEFAULT 5,
    suppress_duplicates BIT NOT NULL DEFAULT 1,
    duplicate_window_mins INT NOT NULL DEFAULT 60,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by INT NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    FOREIGN KEY (source_id) REFERENCES app.MonitorSources(source_id),
    FOREIGN KEY (created_by) REFERENCES app.Users(user_id)
);
GO

-- Alert processing metrics
IF OBJECT_ID('app.AlertProcessingMetrics','U') IS NULL
CREATE TABLE app.AlertProcessingMetrics (
    metric_id INT IDENTITY(1,1) PRIMARY KEY,
    source_id INT NOT NULL,
    processing_date DATE NOT NULL,
    processing_hour INT NOT NULL,
    alerts_received INT NOT NULL DEFAULT 0,
    alerts_processed INT NOT NULL DEFAULT 0,
    alerts_failed INT NOT NULL DEFAULT 0,
    alerts_throttled INT NOT NULL DEFAULT 0,
    alerts_duplicated INT NOT NULL DEFAULT 0,
    avg_processing_time_ms INT NULL,
    max_processing_time_ms INT NULL,
    FOREIGN KEY (source_id) REFERENCES app.MonitorSources(source_id),
    CONSTRAINT UQ_AlertMetrics_SourceHour UNIQUE (source_id, processing_date, processing_hour)
);
GO

-- Alert processing stored procedures
IF OBJECT_ID('app.usp_CheckAlertThrottling', 'P') IS NOT NULL
    DROP PROCEDURE app.usp_CheckAlertThrottling;
GO

CREATE PROCEDURE app.usp_CheckAlertThrottling
    @SourceId INT,
    @AlertType NVARCHAR(100),
    @WindowMinutes INT = 5
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @CurrentCount INT;
    DECLARE @MaxAllowed INT;
    
    -- Get throttle settings
    SELECT @MaxAllowed = MAX(max_alerts_per_minute) * @WindowMinutes
    FROM app.AlertThrottleRules
    WHERE source_id = @SourceId
    AND (alert_type_pattern IS NULL 
         OR @AlertType LIKE alert_type_pattern)
    AND is_active = 1;
    
    -- If no rule found, use default from source config
    IF @MaxAllowed IS NULL
    BEGIN
        SELECT @MaxAllowed = max_requests_per_minute * @WindowMinutes
        FROM app.MonitorSources
        WHERE source_id = @SourceId;
    END;
    
    -- Count recent alerts
    SELECT @CurrentCount = COUNT(*)
    FROM app.AlertQueue
    WHERE source_id = @SourceId
    AND received_at >= DATEADD(MINUTE, -@WindowMinutes, SYSUTCDATETIME())
    AND suppressed = 0;
    
    -- Return throttle status
    SELECT 
        CASE WHEN @CurrentCount >= @MaxAllowed THEN 1 ELSE 0 END as should_throttle,
        @MaxAllowed as max_allowed,
        @CurrentCount as current_count,
        @WindowMinutes as window_minutes;
END;
GO

-- Add alert deduplication procedure
IF OBJECT_ID('app.usp_CheckAlertDuplication', 'P') IS NOT NULL
    DROP PROCEDURE app.usp_CheckAlertDuplication;
GO

CREATE PROCEDURE app.usp_CheckAlertDuplication
    @SourceId INT,
    @AlertType NVARCHAR(100),
    @Payload NVARCHAR(MAX),
    @HashSignature VARBINARY(32)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @DuplicateWindow INT;
    DECLARE @ShouldSuppress BIT = 0;
    DECLARE @ExistingAlertId BIGINT;
    
    -- Get deduplication settings
    SELECT TOP 1 @DuplicateWindow = duplicate_window_mins
    FROM app.AlertThrottleRules
    WHERE source_id = @SourceId
    AND (alert_type_pattern IS NULL 
         OR @AlertType LIKE alert_type_pattern)
    AND is_active = 1
    AND suppress_duplicates = 1;
    
    IF @DuplicateWindow IS NULL
        SET @DuplicateWindow = 60; -- Default 1 hour
        
    -- Check for duplicates
    SELECT TOP 1 
        @ExistingAlertId = queue_id,
        @ShouldSuppress = 1
    FROM app.AlertQueue
    WHERE source_id = @SourceId
    AND hash_signature = @HashSignature
    AND received_at >= DATEADD(MINUTE, -@DuplicateWindow, SYSUTCDATETIME());
    
    -- Return result
    SELECT 
        @ShouldSuppress as should_suppress,
        @ExistingAlertId as existing_alert_id,
        @DuplicateWindow as window_minutes;
END;
GO

-- Create monitoring dashboard view
IF OBJECT_ID('app.vw_MonitoringDashboard', 'V') IS NOT NULL
    DROP VIEW app.vw_MonitoringDashboard;
GO

CREATE VIEW app.vw_MonitoringDashboard AS
WITH hourly_metrics AS (
    SELECT 
        source_id,
        processing_date,
        processing_hour,
        alerts_received,
        alerts_processed,
        alerts_failed,
        alerts_throttled,
        alerts_duplicated,
        avg_processing_time_ms,
        max_processing_time_ms
    FROM app.AlertProcessingMetrics
    WHERE processing_date >= DATEADD(DAY, -7, CAST(GETUTCDATE() AS DATE))
),
source_health AS (
    SELECT 
        ms.source_id,
        ms.name as source_name,
        ms.health_status,
        ms.error_count,
        ms.last_error_at,
        ms.last_successful_poll_at,
        ms.avg_response_time_ms,
        DATEDIFF(MINUTE, ms.last_successful_poll_at, SYSUTCDATETIME()) as mins_since_last_success
    FROM app.MonitorSources ms
)
SELECT 
    sh.source_id,
    sh.source_name,
    sh.health_status,
    sh.error_count,
    sh.last_error_at,
    sh.last_successful_poll_at,
    sh.avg_response_time_ms,
    sh.mins_since_last_success,
    SUM(hm.alerts_received) as alerts_received_7d,
    SUM(hm.alerts_processed) as alerts_processed_7d,
    SUM(hm.alerts_failed) as alerts_failed_7d,
    SUM(hm.alerts_throttled) as alerts_throttled_7d,
    SUM(hm.alerts_duplicated) as alerts_duplicated_7d,
    AVG(hm.avg_processing_time_ms) as avg_processing_time_ms_7d,
    MAX(hm.max_processing_time_ms) as max_processing_time_ms_7d,
    COUNT(DISTINCT hm.processing_date) as active_days_7d
FROM source_health sh
LEFT JOIN hourly_metrics hm ON sh.source_id = hm.source_id
GROUP BY 
    sh.source_id,
    sh.source_name,
    sh.health_status,
    sh.error_count,
    sh.last_error_at,
    sh.last_successful_poll_at,
    sh.avg_response_time_ms,
    sh.mins_since_last_success;
GO

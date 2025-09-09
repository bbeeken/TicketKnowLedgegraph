-- V7__predictive_maintenance_enhancements.sql
USE [OpsGraph];
GO

-- Add ML model versioning
IF OBJECT_ID('app.MaintenanceModels','U') IS NULL
CREATE TABLE app.MaintenanceModels (
    model_id INT IDENTITY(1,1) PRIMARY KEY,
    asset_type NVARCHAR(60) NOT NULL,
    model_version NVARCHAR(20) NOT NULL,
    model_params NVARCHAR(MAX) NOT NULL,  -- JSON with hyperparameters
    training_metrics NVARCHAR(MAX) NOT NULL,  -- JSON with training metrics
    validation_metrics NVARCHAR(MAX) NOT NULL,  -- JSON with validation metrics
    deployed_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    trained_at DATETIME2(3) NOT NULL,
    accuracy_score DECIMAL(5,2) NOT NULL,
    precision_score DECIMAL(5,2) NOT NULL,
    recall_score DECIMAL(5,2) NOT NULL,
    f1_score DECIMAL(5,2) NOT NULL,
    training_duration_mins INT NOT NULL,
    training_sample_size INT NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_by INT NOT NULL,
    notes NVARCHAR(MAX) NULL,
    FOREIGN KEY (created_by) REFERENCES app.Users(user_id),
    CONSTRAINT UQ_ModelVersion UNIQUE (asset_type, model_version)
);
GO

-- Add failure pattern detection
IF OBJECT_ID('app.FailurePatterns','U') IS NULL
CREATE TABLE app.FailurePatterns (
    pattern_id INT IDENTITY(1,1) PRIMARY KEY,
    asset_type NVARCHAR(60) NOT NULL,
    pattern_name NVARCHAR(100) NOT NULL,
    pattern_description NVARCHAR(MAX) NULL,
    pattern_json NVARCHAR(MAX) NOT NULL,  -- JSON pattern definition
    detection_window_hours INT NOT NULL,
    min_confidence_score DECIMAL(5,2) NOT NULL,
    detected_count INT NOT NULL DEFAULT 0,
    false_positive_count INT NOT NULL DEFAULT 0,
    true_positive_count INT NOT NULL DEFAULT 0,
    last_detected_at DATETIME2(3) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by INT NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    FOREIGN KEY (created_by) REFERENCES app.Users(user_id)
);
GO

-- Add feature importance tracking
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('app.MaintenancePredictions')
    AND name = 'model_id'
)
BEGIN
    ALTER TABLE app.MaintenancePredictions
    ADD model_id INT NULL,
        pattern_id INT NULL,
        feature_importance NVARCHAR(MAX) NULL,  -- JSON
        prediction_explanation NVARCHAR(MAX) NULL,  -- Human-readable explanation
        feedback_notes NVARCHAR(MAX) NULL,
        reviewed_by INT NULL,
        reviewed_at DATETIME2(3) NULL,
        FOREIGN KEY (model_id) REFERENCES app.MaintenanceModels(model_id),
        FOREIGN KEY (pattern_id) REFERENCES app.FailurePatterns(pattern_id),
        FOREIGN KEY (reviewed_by) REFERENCES app.Users(user_id);
END;
GO

-- Add model training history
IF OBJECT_ID('app.ModelTrainingHistory','U') IS NULL
CREATE TABLE app.ModelTrainingHistory (
    training_id INT IDENTITY(1,1) PRIMARY KEY,
    model_id INT NOT NULL,
    training_started_at DATETIME2(3) NOT NULL,
    training_completed_at DATETIME2(3) NULL,
    training_status NVARCHAR(20) NOT NULL,  -- 'Running', 'Completed', 'Failed'
    training_error NVARCHAR(MAX) NULL,
    dataset_size INT NOT NULL,
    cross_validation_folds INT NOT NULL,
    hyperparameters NVARCHAR(MAX) NOT NULL,  -- JSON
    validation_results NVARCHAR(MAX) NULL,  -- JSON
    model_artifacts_path NVARCHAR(500) NULL,
    FOREIGN KEY (model_id) REFERENCES app.MaintenanceModels(model_id),
    CONSTRAINT CK_TrainingStatus CHECK (training_status IN ('Running', 'Completed', 'Failed'))
);
GO

-- Add model performance tracking
IF OBJECT_ID('app.ModelPerformanceMetrics','U') IS NULL
CREATE TABLE app.ModelPerformanceMetrics (
    metric_id INT IDENTITY(1,1) PRIMARY KEY,
    model_id INT NOT NULL,
    evaluation_date DATE NOT NULL,
    predictions_made INT NOT NULL DEFAULT 0,
    true_positives INT NOT NULL DEFAULT 0,
    false_positives INT NOT NULL DEFAULT 0,
    true_negatives INT NOT NULL DEFAULT 0,
    false_negatives INT NOT NULL DEFAULT 0,
    avg_confidence_score DECIMAL(5,2) NULL,
    avg_lead_time_hours DECIMAL(10,2) NULL,
    processing_time_ms INT NULL,
    FOREIGN KEY (model_id) REFERENCES app.MaintenanceModels(model_id),
    CONSTRAINT UQ_ModelMetrics UNIQUE (model_id, evaluation_date)
);
GO

-- Add model deployment tracking
IF OBJECT_ID('app.ModelDeployments','U') IS NULL
CREATE TABLE app.ModelDeployments (
    deployment_id INT IDENTITY(1,1) PRIMARY KEY,
    model_id INT NOT NULL,
    deployed_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    deployed_by INT NOT NULL,
    deployment_status NVARCHAR(20) NOT NULL,  -- 'Active', 'Retired', 'Failed'
    retirement_reason NVARCHAR(500) NULL,
    retired_at DATETIME2(3) NULL,
    retired_by INT NULL,
    FOREIGN KEY (model_id) REFERENCES app.MaintenanceModels(model_id),
    FOREIGN KEY (deployed_by) REFERENCES app.Users(user_id),
    FOREIGN KEY (retired_by) REFERENCES app.Users(user_id),
    CONSTRAINT CK_DeploymentStatus CHECK (deployment_status IN ('Active', 'Retired', 'Failed'))
);
GO

-- Create model evaluation stored procedure
IF OBJECT_ID('app.usp_EvaluateModelPerformance', 'P') IS NOT NULL
    DROP PROCEDURE app.usp_EvaluateModelPerformance;
GO

CREATE PROCEDURE app.usp_EvaluateModelPerformance
    @ModelId INT,
    @EvaluationDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @EvaluationDate IS NULL
        SET @EvaluationDate = CAST(GETUTCDATE() AS DATE);
        
    -- Calculate performance metrics
    WITH prediction_outcomes AS (
        SELECT 
            mp.model_id,
            COUNT(*) as total_predictions,
            SUM(CASE 
                WHEN mp.was_accurate = 1 AND t.ticket_id IS NOT NULL THEN 1 
                ELSE 0 
            END) as true_positives,
            SUM(CASE 
                WHEN mp.was_accurate = 0 AND t.ticket_id IS NOT NULL THEN 1 
                ELSE 0 
            END) as false_positives,
            SUM(CASE 
                WHEN mp.was_accurate = 1 AND t.ticket_id IS NULL THEN 1 
                ELSE 0 
            END) as true_negatives,
            SUM(CASE 
                WHEN mp.was_accurate = 0 AND t.ticket_id IS NULL THEN 1 
                ELSE 0 
            END) as false_negatives,
            AVG(mp.confidence_score) as avg_confidence,
            AVG(DATEDIFF(HOUR, mp.created_at, COALESCE(t.created_at, mp.predicted_failure_at))) as avg_lead_time
        FROM app.MaintenancePredictions mp
        LEFT JOIN app.Tickets t ON mp.ticket_id = t.ticket_id
        WHERE mp.model_id = @ModelId
        AND CAST(mp.created_at AS DATE) = @EvaluationDate
        GROUP BY mp.model_id
    )
    MERGE app.ModelPerformanceMetrics AS target
    USING prediction_outcomes AS source
    ON (target.model_id = source.model_id AND target.evaluation_date = @EvaluationDate)
    WHEN MATCHED THEN
        UPDATE SET
            predictions_made = source.total_predictions,
            true_positives = source.true_positives,
            false_positives = source.false_positives,
            true_negatives = source.true_negatives,
            false_negatives = source.false_negatives,
            avg_confidence_score = source.avg_confidence,
            avg_lead_time_hours = source.avg_lead_time
    WHEN NOT MATCHED THEN
        INSERT (
            model_id,
            evaluation_date,
            predictions_made,
            true_positives,
            false_positives,
            true_negatives,
            false_negatives,
            avg_confidence_score,
            avg_lead_time_hours
        )
        VALUES (
            source.model_id,
            @EvaluationDate,
            source.total_predictions,
            source.true_positives,
            source.false_positives,
            source.true_negatives,
            source.false_negatives,
            source.avg_confidence,
            source.avg_lead_time
        );
END;
GO

-- Create model performance dashboard view
IF OBJECT_ID('app.vw_ModelPerformanceDashboard', 'V') IS NOT NULL
    DROP VIEW app.vw_ModelPerformanceDashboard;
GO

CREATE VIEW app.vw_ModelPerformanceDashboard AS
WITH model_metrics AS (
    SELECT 
        m.model_id,
        m.asset_type,
        m.model_version,
        mpm.evaluation_date,
        mpm.predictions_made,
        mpm.true_positives,
        mpm.false_positives,
        mpm.true_negatives,
        mpm.false_negatives,
        mpm.avg_confidence_score,
        mpm.avg_lead_time_hours
    FROM app.MaintenanceModels m
    JOIN app.ModelPerformanceMetrics mpm ON m.model_id = mpm.model_id
    WHERE m.is_active = 1
)
SELECT 
    mm.model_id,
    mm.asset_type,
    mm.model_version,
    mm.evaluation_date,
    mm.predictions_made,
    mm.true_positives,
    mm.false_positives,
    mm.true_negatives,
    mm.false_negatives,
    mm.avg_confidence_score,
    mm.avg_lead_time_hours,
    CAST(mm.true_positives + mm.true_negatives AS FLOAT) / 
        NULLIF(mm.predictions_made, 0) as accuracy,
    CAST(mm.true_positives AS FLOAT) / 
        NULLIF(mm.true_positives + mm.false_positives, 0) as precision,
    CAST(mm.true_positives AS FLOAT) / 
        NULLIF(mm.true_positives + mm.false_negatives, 0) as recall,
    -- F1 Score calculation
    2 * (CAST(mm.true_positives AS FLOAT) / NULLIF(mm.true_positives + mm.false_positives, 0)) * 
        (CAST(mm.true_positives AS FLOAT) / NULLIF(mm.true_positives + mm.false_negatives, 0)) /
    NULLIF(
        (CAST(mm.true_positives AS FLOAT) / NULLIF(mm.true_positives + mm.false_positives, 0)) +
        (CAST(mm.true_positives AS FLOAT) / NULLIF(mm.true_positives + mm.false_negatives, 0)),
        0
    ) as f1_score
FROM model_metrics mm;
GO

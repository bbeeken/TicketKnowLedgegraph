-- 20_kg_analytics.sql
-- Analytics and reasoning helpers for co-fail detection and root-cause candidate extraction
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Ensure analytics schema
IF SCHEMA_ID('kg_analytics') IS NULL
    EXEC('CREATE SCHEMA kg_analytics');
GO

-- Table: cofail scores between asset pairs within a site
IF OBJECT_ID('kg_analytics.CofailScores','U') IS NULL
CREATE TABLE kg_analytics.CofailScores (
    site_id INT NOT NULL,
    asset_a INT NOT NULL,
    asset_b INT NOT NULL,
    co_count INT NOT NULL DEFAULT 0,
    last_co_occurred_at DATETIME2(3) NULL,
    score FLOAT NULL,
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY(site_id, asset_a, asset_b)
);
GO
CREATE NONCLUSTERED INDEX IX_CofailScores_Score ON kg_analytics.CofailScores(score DESC) WHERE score IS NOT NULL;
GO

-- Inline table-valued function: find adjacent co-fail events (classic co-occurrence within time window)
CREATE OR ALTER FUNCTION kg.fn_CofailAdjacent(@site_id INT, @minutes INT)
RETURNS TABLE
AS
RETURN
(
    SELECT
        e1.site_id AS site_id,
        a1.alert_id AS atg_alert_id,
        e1.occurred_at AS atg_time,
        as1.zone_id AS atg_zone_id,
        as2.zone_id AS adj_zone_id,
        e2.asset_id AS other_asset_id,
        e2.canonical_code AS other_code,
        e2.occurred_at AS other_time,
        DATEDIFF(MINUTE, e1.occurred_at, e2.occurred_at) AS delta_min
    FROM app.Alerts a1
    JOIN app.Events e1 ON a1.event_id = e1.event_id
    JOIN app.Assets as1 ON e1.asset_id = as1.asset_id
    JOIN app.Events e2 ON e1.site_id = e2.site_id
        AND e2.event_id <> e1.event_id
        AND e2.occurred_at BETWEEN e1.occurred_at AND DATEADD(MINUTE, @minutes, e1.occurred_at)
    LEFT JOIN app.Assets as2 ON e2.asset_id = as2.asset_id
    WHERE a1.site_id = ISNULL(@site_id, e1.site_id)
      AND e1.site_id = ISNULL(@site_id, e1.site_id)
);
GO

-- View: convenience 120-minute cofail adjacent (materialized by worker)
CREATE OR ALTER VIEW kg.vw_CofailAdjacent120
AS
SELECT * FROM kg.fn_CofailAdjacent(NULL, 120);
GO

-- Procedure: refresh cofail scores for a given site and window (aggregates into kg_analytics.CofailScores)
CREATE OR ALTER PROCEDURE kg.usp_RefreshCofailScores
    @site_id INT = NULL,
    @window_minutes INT = 120
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @now DATETIME2(3) = SYSUTCDATETIME();

        ;WITH pairs AS (
            SELECT
                e1.site_id AS site_id,
                e1.asset_id AS asset_a,
                e2.asset_id AS asset_b,
                COUNT(1) AS co_count,
                MAX(e2.occurred_at) AS last_co
            FROM app.Events e1
            JOIN app.Events e2
              ON e1.site_id = e2.site_id
              AND e2.event_id <> e1.event_id
              AND e2.occurred_at BETWEEN e1.occurred_at AND DATEADD(MINUTE, @window_minutes, e1.occurred_at)
            WHERE (@site_id IS NULL OR e1.site_id = @site_id)
            GROUP BY e1.site_id, e1.asset_id, e2.asset_id
        )
        MERGE kg_analytics.CofailScores AS target
        USING (
            SELECT site_id, asset_a, asset_b, co_count, last_co FROM pairs
        ) AS src (site_id, asset_a, asset_b, co_count, last_co)
        ON target.site_id = src.site_id AND target.asset_a = src.asset_a AND target.asset_b = src.asset_b
        WHEN MATCHED THEN
            UPDATE SET co_count = src.co_count, last_co_occurred_at = src.last_co, score = CASE WHEN src.co_count > 0 THEN src.co_count * 1.0 / NULLIF(DATEDIFF(MINUTE, src.last_co, @now),0) ELSE 0 END, updated_at = @now
        WHEN NOT MATCHED THEN
            INSERT (site_id, asset_a, asset_b, co_count, last_co_occurred_at, score, updated_at)
            VALUES (src.site_id, src.asset_a, src.asset_b, src.co_count, src.last_co, CASE WHEN src.co_count > 0 THEN src.co_count * 1.0 / NULLIF(DATEDIFF(MINUTE, src.last_co, @now),0) ELSE 0 END, @now);

    END TRY
    BEGIN CATCH
        DECLARE @err_msg NVARCHAR(4000) = ERROR_MESSAGE();
        INSERT INTO app.IntegrationErrors (source, ref_id, message, details, created_at)
        VALUES ('kg.usp_RefreshCofailScores', CONVERT(NVARCHAR(64), @site_id), @err_msg, ERROR_PROCEDURE(), SYSUTCDATETIME());
        THROW;
    END CATCH
END
GO

-- Lightweight root-cause candidate TVF: for a ticket return top N assets by cofail score in site
CREATE OR ALTER FUNCTION kg.fn_RootCauseCandidates(@ticket_id INT, @top INT)
RETURNS TABLE
AS
RETURN
(
    SELECT TOP(@top)
        cs.site_id,
        cs.asset_a AS candidate_asset_id,
        cs.asset_b AS related_asset_id,
        cs.co_count,
        cs.score
    FROM kg_analytics.CofailScores cs
    JOIN app.TicketAssets ta ON (ta.asset_id = cs.asset_a OR ta.asset_id = cs.asset_b)
    WHERE ta.ticket_id = @ticket_id
    ORDER BY cs.score DESC
);
GO

PRINT '20_kg_analytics.sql applied';
GO

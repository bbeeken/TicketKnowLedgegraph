import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any
import json
import pyodbc
import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

log = structlog.get_logger()

class MaintenancePredictor:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.scheduler = AsyncIOScheduler()

    async def start(self):
        """Start the predictive maintenance scheduler"""
        # Run predictions every hour
        self.scheduler.add_job(
            self.run_predictions,
            IntervalTrigger(hours=1),
            id='maintenance_predictor',
            name='Predictive Maintenance Analysis'
        )
        
        # Update impact scores every 6 hours
        self.scheduler.add_job(
            self.update_impact_scores,
            IntervalTrigger(hours=6),
            id='impact_analyzer',
            name='Asset Impact Analysis'
        )
        
        self.scheduler.start()
        log.info("Predictive maintenance analyzer started")

    async def run_predictions(self):
        """Run predictive maintenance analysis"""
        try:
            conn = pyodbc.connect(self.connection_string)
            cursor = conn.cursor()

            # Get active rules
            cursor.execute("""
                SELECT rule_id, asset_type, condition_pattern,
                       prediction_window_hours, confidence_threshold
                FROM app.MaintenanceRules
                WHERE is_active = 1
            """)
            rules = cursor.fetchall()

            for rule in rules:
                # Parse the condition pattern (JSON format)
                pattern = json.loads(rule.condition_pattern)
                
                # Get relevant events for analysis
                cursor.execute("""
                    SELECT e.asset_id, e.canonical_code, e.level,
                           e.occurred_at, e.message,
                           a.type as asset_type
                    FROM app.Events e
                    JOIN app.Assets a ON e.asset_id = a.asset_id
                    WHERE a.type = ?
                    AND e.occurred_at >= DATEADD(HOUR, -?, SYSUTCDATETIME())
                    ORDER BY e.asset_id, e.occurred_at
                """, rule.asset_type, rule.prediction_window_hours * 2)
                
                events = cursor.fetchall()

                # Group events by asset
                asset_events: Dict[int, List[Any]] = {}
                for event in events:
                    if event.asset_id not in asset_events:
                        asset_events[event.asset_id] = []
                    asset_events[event.asset_id].append(event)

                # Analyze each asset's events
                for asset_id, asset_events in asset_events.items():
                    prediction = self._analyze_events(
                        asset_id, asset_events, pattern,
                        rule.prediction_window_hours,
                        rule.confidence_threshold
                    )
                    
                    if prediction:
                        # Record the prediction
                        cursor.execute("""
                            INSERT INTO app.MaintenancePredictions (
                                asset_id, rule_id, predicted_failure_at,
                                confidence_score, contributing_factors
                            )
                            VALUES (?, ?, ?, ?, ?)
                        """, (
                            asset_id,
                            rule.rule_id,
                            prediction['predicted_failure_at'],
                            prediction['confidence_score'],
                            json.dumps(prediction['factors'])
                        ))

                        # Create a preventive maintenance ticket if confidence is high
                        if prediction['confidence_score'] >= 90:
                            cursor.execute("""
                                INSERT INTO app.Tickets (
                                    site_id, asset_id, category_id,
                                    priority, severity, summary,
                                    status, created_at, updated_at
                                )
                                SELECT 
                                    a.site_id,
                                    a.asset_id,
                                    (SELECT category_id FROM app.Categories WHERE name = 'Preventive Maintenance'),
                                    'P2',
                                    'High',
                                    'Predictive Maintenance Required - ' + a.name,
                                    'Open',
                                    SYSUTCDATETIME(),
                                    SYSUTCDATETIME()
                                FROM app.Assets a
                                WHERE a.asset_id = ?
                            """, asset_id)
                            
                            ticket_id = cursor.execute("SELECT SCOPE_IDENTITY()").fetchval()
                            
                            # Update prediction with ticket reference
                            cursor.execute("""
                                UPDATE app.MaintenancePredictions
                                SET ticket_id = ?
                                WHERE prediction_id = SCOPE_IDENTITY()
                            """, ticket_id)

            conn.commit()
            log.info("Completed predictive maintenance analysis")

        except Exception as e:
            log.error("Failed to run maintenance predictions", error=str(e))
        finally:
            cursor.close()
            conn.close()

    async def update_impact_scores(self):
        """Update impact scores for all assets"""
        try:
            conn = pyodbc.connect(self.connection_string)
            cursor = conn.cursor()

            # Get all assets
            cursor.execute("SELECT asset_id FROM app.Assets")
            assets = cursor.fetchall()

            for asset in assets:
                # Update impact score
                cursor.execute("EXEC app.usp_AnalyzeAssetImpact @asset_id = ?", 
                             asset.asset_id)

            conn.commit()
            log.info("Updated all asset impact scores")

        except Exception as e:
            log.error("Failed to update impact scores", error=str(e))
        finally:
            cursor.close()
            conn.close()

    def _analyze_events(self, asset_id: int, events: List[Any], 
                       pattern: Dict[str, Any], window_hours: int,
                       confidence_threshold: float) -> Dict[str, Any]:
        """
        Analyze events for an asset to predict potential failures.
        Returns prediction details if confidence threshold is met.
        """
        now = datetime.utcnow()
        prediction_window = timedelta(hours=window_hours)
        
        # Example pattern matching (customize based on your needs)
        error_count = sum(1 for e in events if e.level in ('Error', 'Critical'))
        warning_count = sum(1 for e in events if e.level == 'Warning')
        
        # Simple prediction model (enhance with ML as needed)
        if error_count > 0 or warning_count >= 3:
            confidence = min(
                ((error_count * 20) + (warning_count * 5)), 
                100
            )
            
            if confidence >= confidence_threshold:
                return {
                    'predicted_failure_at': now + prediction_window,
                    'confidence_score': confidence,
                    'factors': {
                        'error_count': error_count,
                        'warning_count': warning_count,
                        'event_patterns': [
                            {
                                'code': e.canonical_code,
                                'level': e.level,
                                'count': sum(1 for x in events 
                                           if x.canonical_code == e.canonical_code)
                            }
                            for e in events
                        ]
                    }
                }
        
        return None

if __name__ == "__main__":
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    CONNECTION_STRING = os.getenv("DB_CONNECTION_STRING")
    if not CONNECTION_STRING:
        raise ValueError("DB_CONNECTION_STRING environment variable not set")

    predictor = MaintenancePredictor(CONNECTION_STRING)
    
    loop = asyncio.get_event_loop()
    loop.create_task(predictor.start())
    
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        pass
    finally:
        loop.close()

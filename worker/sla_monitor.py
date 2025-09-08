import asyncio
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import pyodbc
import structlog

log = structlog.get_logger()

class SLAMonitor:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.scheduler = AsyncIOScheduler()

    async def start(self):
        """Start the SLA monitoring scheduler"""
        self.scheduler.add_job(
            self.check_slas,
            IntervalTrigger(minutes=5),  # Check every 5 minutes
            id='sla_monitor',
            name='SLA Breach Monitor'
        )
        self.scheduler.start()
        log.info("SLA monitor started")

    async def check_slas(self):
        """Check for SLA breaches and escalate tickets"""
        try:
            conn = pyodbc.connect(self.connection_string)
            cursor = conn.cursor()
            
            # Execute the stored proc
            cursor.execute("EXEC app.usp_EscalateOverdueTickets")
            conn.commit()
            
            # Log escalation counts
            cursor.execute("""
                SELECT COUNT(*) as escalated_count 
                FROM app.TicketSLAs 
                WHERE breached = 1 
                AND computed_at > DATEADD(MINUTE, -5, SYSUTCDATETIME())
            """)
            row = cursor.fetchone()
            if row and row[0] > 0:
                log.info("Tickets escalated", count=row[0])

        except Exception as e:
            log.error("Failed to check SLAs", error=str(e))
        finally:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    CONNECTION_STRING = os.getenv("DB_CONNECTION_STRING")
    if not CONNECTION_STRING:
        raise ValueError("DB_CONNECTION_STRING environment variable not set")

    monitor = SLAMonitor(CONNECTION_STRING)
    
    loop = asyncio.get_event_loop()
    loop.create_task(monitor.start())
    
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        pass
    finally:
        loop.close()

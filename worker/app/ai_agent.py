import asyncio
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from .db import get_conn
from .settings import settings

logger = logging.getLogger('ai_agent')
app = FastAPI()

class Recommendation(BaseModel):
    ticket_id: int
    recommendations: list
    confidence: float

@app.post('/ai/ticket/{ticket_id}/generate')
async def generate(ticket_id: int):
    # Assemble context from DB
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute('EXEC app.usp_GetTicketDetail @ticket_id=?', ticket_id)
        # read multiple result sets: main, assets, watchers, comments, attachments
        main = cur.fetchone()
        # naive candidate generation: return assets as recommendations
        cur.nextset()
        assets = cur.fetchall()
        candidates = [dict(asset_id=row.asset_id, type=row.type) for row in assets]
        recs = {'ticket_id': ticket_id, 'recommendations': candidates, 'confidence': 0.6}
        # persist to app.TicketAIRecommendations
        cur.execute('INSERT INTO app.TicketAIRecommendations (ticket_id, provider, recommendations, confidence) VALUES (?,?,?,?)', ticket_id, 'local', str(recs['recommendations']), recs['confidence'])
        conn.commit()
        conn.close()
        return recs
    except Exception as e:
        logger.exception('AI generate failed')
        raise HTTPException(status_code=500, detail='AI generation failed')

@app.get('/ai/ticket/{ticket_id}/latest')
async def latest(ticket_id: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('SELECT TOP(1) recommendations, confidence, created_at FROM app.TicketAIRecommendations WHERE ticket_id=? ORDER BY created_at DESC', ticket_id)
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    return {'recommendations': row[0], 'confidence': row[1], 'created_at': row[2].isoformat()}

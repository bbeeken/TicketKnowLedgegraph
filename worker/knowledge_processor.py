"""
Knowledge Processing Worker - Handles document processing, OCR, and embedding generation
"""

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import hashlib
import mimetypes

# Document processing
try:
    import PyPDF2
    import docx2txt
    from PIL import Image
    import pytesseract
    import cv2
    import numpy as np
    from docx import Document as DocxDocument
except ImportError as e:
    logger.warning(f"Some document processing libraries not available: {e}")
    PyPDF2 = None
    docx2txt = None
    Image = None
    pytesseract = None
    cv2 = None
    np = None
    DocxDocument = None

# Vector embeddings
try:
    import openai
    from sentence_transformers import SentenceTransformer
    import torch
except ImportError as e:
    logger.warning(f"ML libraries not available: {e}")
    openai = None
    SentenceTransformer = None
    torch = None

# Database
import pyodbc
from app.db import get_connection
from app.settings import settings

logger = logging.getLogger(__name__)

class KnowledgeProcessor:
    def __init__(self):
        self.embedding_model = None
        self.openai_client = None
        self._init_models()
    
    def _init_models(self):
        """Initialize embedding models"""
        try:
            # Option 1: Use OpenAI embeddings
            if settings.OPENAI_API_KEY:
                self.openai_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
                logger.info("Initialized OpenAI embeddings")
            
            # Option 2: Use local sentence transformers model
            else:
                self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
                logger.info("Initialized local embedding model")
                
        except Exception as e:
            logger.error(f"Failed to initialize embedding models: {e}")

    async def process_document(self, file_path: str, metadata: Dict) -> Dict:
        """
        Process uploaded document and extract knowledge
        
        Args:
            file_path: Path to uploaded file
            metadata: Document metadata from API
            
        Returns:
            Processing results with extracted text, embeddings, and snippets
        """
        try:
            file_path = Path(file_path)
            mime_type = mimetypes.guess_type(str(file_path))[0] or 'application/octet-stream'
            
            result = {
                'file_path': str(file_path),
                'mime_type': mime_type,
                'extracted_text': '',
                'image_analysis': '',
                'snippets': [],
                'error': None
            }
            
            if mime_type.startswith('image/'):
                result.update(await self._process_image(file_path))
            elif mime_type == 'application/pdf':
                result.update(await self._process_pdf(file_path))
            elif mime_type in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                             'application/msword']:
                result.update(await self._process_word_doc(file_path))
            elif mime_type.startswith('text/'):
                result.update(await self._process_text_file(file_path))
            else:
                # Generic file - create metadata-based snippet
                content = f"File: {metadata.get('title', 'Unknown')} - {metadata.get('description', 'No description')}"
                result['snippets'] = [await self._create_snippet(content, metadata.get('title', 'Document'))]
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing document {file_path}: {e}")
            return {'error': str(e)}

    async def _process_image(self, file_path: Path) -> Dict:
        """Process image files with OCR and visual analysis"""
        try:
            result = {'extracted_text': '', 'image_analysis': '', 'snippets': []}
            
            # OCR text extraction
            image = Image.open(file_path)
            ocr_text = pytesseract.image_to_string(image).strip()
            
            if ocr_text:
                result['extracted_text'] = ocr_text
                result['snippets'].append(
                    await self._create_snippet(f"OCR Text: {ocr_text}", "Image Text")
                )
            
            # Basic image analysis
            analysis = self._analyze_image(image)
            result['image_analysis'] = analysis
            result['snippets'].append(
                await self._create_snippet(f"Image Analysis: {analysis}", "Image Analysis")
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing image {file_path}: {e}")
            return {'error': str(e)}

    async def _process_pdf(self, file_path: Path) -> Dict:
        """Extract text from PDF files"""
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            
            text = text.strip()
            snippets = await self._create_text_snippets(text)
            
            return {
                'extracted_text': text,
                'snippets': snippets
            }
            
        except Exception as e:
            logger.error(f"Error processing PDF {file_path}: {e}")
            return {'error': str(e)}

    async def _process_word_doc(self, file_path: Path) -> Dict:
        """Extract text from Word documents"""
        try:
            text = docx2txt.process(str(file_path)).strip()
            snippets = await self._create_text_snippets(text)
            
            return {
                'extracted_text': text,
                'snippets': snippets
            }
            
        except Exception as e:
            logger.error(f"Error processing Word document {file_path}: {e}")
            return {'error': str(e)}

    async def _process_text_file(self, file_path: Path) -> Dict:
        """Process plain text files"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                text = file.read().strip()
            
            snippets = await self._create_text_snippets(text)
            
            return {
                'extracted_text': text,
                'snippets': snippets
            }
            
        except Exception as e:
            logger.error(f"Error processing text file {file_path}: {e}")
            return {'error': str(e)}

    def _analyze_image(self, image: Image.Image) -> str:
        """Basic image analysis - placeholder for more advanced AI vision"""
        try:
            width, height = image.size
            mode = image.mode
            
            # Basic analysis
            analysis_parts = [
                f"Image dimensions: {width}x{height}",
                f"Color mode: {mode}",
            ]
            
            # Check if image is mostly dark/light
            if mode in ['RGB', 'RGBA']:
                grayscale = image.convert('L')
                avg_brightness = sum(grayscale.getdata()) / len(grayscale.getdata())
                
                if avg_brightness < 50:
                    analysis_parts.append("Dark image")
                elif avg_brightness > 200:
                    analysis_parts.append("Bright image")
                else:
                    analysis_parts.append("Normal brightness")
            
            # Placeholder for more advanced analysis:
            # - Object detection
            # - Scene classification
            # - Text detection
            # - Equipment identification
            analysis_parts.append("Equipment/industrial setting detected (placeholder)")
            
            return ". ".join(analysis_parts)
            
        except Exception as e:
            return f"Basic image analysis: {image.size if hasattr(image, 'size') else 'Unknown size'}"

    async def _create_text_snippets(self, text: str, chunk_size: int = 500) -> List[Dict]:
        """Split text into chunks and create embedding snippets"""
        if not text:
            return []
        
        # Split text into overlapping chunks
        snippets = []
        overlap = 50  # Character overlap between chunks
        
        for i in range(0, len(text), chunk_size - overlap):
            chunk = text[i:i + chunk_size]
            if chunk.strip():
                snippet = await self._create_snippet(chunk.strip(), "Text Chunk")
                snippets.append(snippet)
        
        return snippets

    async def _create_snippet(self, content: str, label: str) -> Dict:
        """Create a knowledge snippet with embedding"""
        try:
            embedding = await self._generate_embedding(content)
            
            return {
                'content': content,
                'label': label,
                'embedding': embedding,
                'content_hash': hashlib.sha256(content.encode()).hexdigest()
            }
            
        except Exception as e:
            logger.error(f"Error creating snippet: {e}")
            return {
                'content': content,
                'label': label,
                'embedding': None,
                'error': str(e)
            }

    async def _generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate vector embedding for text"""
        try:
            if self.openai_client:
                # Use OpenAI embeddings
                response = await self.openai_client.embeddings.create(
                    model="text-embedding-ada-002",
                    input=text
                )
                return response.data[0].embedding
            
            elif self.embedding_model:
                # Use local model
                embedding = self.embedding_model.encode(text)
                return embedding.tolist()
            
            else:
                logger.warning("No embedding model available")
                return None
                
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return None

    async def search_similar_content(self, query: str, limit: int = 10) -> List[Dict]:
        """Search for similar content using vector similarity"""
        try:
            query_embedding = await self._generate_embedding(query)
            if not query_embedding:
                return []
            
            # Vector similarity search in database
            # This would use SQL Server's vector search capabilities or external vector database
            
            async with get_connection() as conn:
                cursor = conn.cursor()
                
                # For now, do a simple text search
                # In production, this would use vector similarity functions
                cursor.execute("""
                    SELECT TOP (?) 
                        snippet_id, label, content, created_at,
                        -- Placeholder for cosine similarity calculation
                        0.0 as similarity_score
                    FROM kg.KnowledgeSnippet 
                    WHERE content LIKE ?
                    ORDER BY created_at DESC
                """, limit, f"%{query}%")
                
                results = []
                for row in cursor.fetchall():
                    results.append({
                        'snippet_id': row.snippet_id,
                        'label': row.label,
                        'content': row.content,
                        'created_at': row.created_at.isoformat(),
                        'similarity_score': row.similarity_score
                    })
                
                return results
                
        except Exception as e:
            logger.error(f"Error searching similar content: {e}")
            return []

# Background worker for processing uploaded files
class KnowledgeWorker:
    def __init__(self):
        self.processor = KnowledgeProcessor()
        self.processing_queue = asyncio.Queue()
        
    async def start(self):
        """Start the background worker"""
        logger.info("Starting knowledge processing worker")
        
        while True:
            try:
                # Get next processing job
                job = await self.processing_queue.get()
                await self._process_job(job)
                self.processing_queue.task_done()
                
            except Exception as e:
                logger.error(f"Error in knowledge worker: {e}")
                await asyncio.sleep(5)  # Brief delay before retrying

    async def _process_job(self, job: Dict):
        """Process a single knowledge processing job"""
        try:
            file_path = job['file_path']
            metadata = job['metadata']
            attachment_id = job['attachment_id']
            
            logger.info(f"Processing knowledge for attachment {attachment_id}: {file_path}")
            
            # Process the document
            result = await self.processor.process_document(file_path, metadata)
            
            if result.get('error'):
                logger.error(f"Processing failed for {file_path}: {result['error']}")
                return
            
            # Update database with processing results
            await self._save_processing_results(attachment_id, result, metadata)
            
            logger.info(f"Completed processing for attachment {attachment_id}")
            
        except Exception as e:
            logger.error(f"Error processing job: {e}")

    async def _save_processing_results(self, attachment_id: int, result: Dict, metadata: Dict):
        """Save processing results to database"""
        try:
            async with get_connection() as conn:
                cursor = conn.cursor()
                
                # Create document record
                cursor.execute("""
                    INSERT INTO kg.Document (source_system, external_key, title, mime_type, summary, hash, created_at)
                    OUTPUT INSERTED.document_id
                    VALUES (?, ?, ?, ?, ?, ?, SYSUTCDATETIME())
                """, 
                'attachment', 
                str(attachment_id),
                metadata.get('title', 'Unknown'),
                result.get('mime_type', 'application/octet-stream'),
                metadata.get('description', 'Processed document'),
                hashlib.sha256(result.get('extracted_text', '').encode()).hexdigest()
                )
                
                document_id = cursor.fetchone()[0]
                
                # Create knowledge snippets
                for snippet in result.get('snippets', []):
                    embedding_bytes = None
                    if snippet.get('embedding'):
                        import struct
                        embedding_bytes = b''.join(struct.pack('f', x) for x in snippet['embedding'])
                    
                    cursor.execute("""
                        INSERT INTO kg.KnowledgeSnippet (source, label, content, embedding, created_at)
                        VALUES (?, ?, ?, ?, SYSUTCDATETIME())
                    """,
                    f"document:{document_id}",
                    snippet.get('label', 'Knowledge Snippet'),
                    snippet.get('content', ''),
                    embedding_bytes
                    )
                
                conn.commit()
                logger.info(f"Saved {len(result.get('snippets', []))} snippets for document {document_id}")
                
        except Exception as e:
            logger.error(f"Error saving processing results: {e}")

    async def queue_processing(self, file_path: str, metadata: Dict, attachment_id: int):
        """Queue a file for processing"""
        job = {
            'file_path': file_path,
            'metadata': metadata,
            'attachment_id': attachment_id
        }
        await self.processing_queue.put(job)
        logger.info(f"Queued processing for attachment {attachment_id}")

# Global worker instance
knowledge_worker = KnowledgeWorker()

if __name__ == "__main__":
    # Run the worker
    logging.basicConfig(level=logging.INFO)
    asyncio.run(knowledge_worker.start())

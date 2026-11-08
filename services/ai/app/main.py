from fastapi import FastAPI, Header, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
import os
from loguru import logger

app = FastAPI(
    title="DevFlow AI Intelligence Engine",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

INTERNAL_KEY = os.getenv("INTERNAL_API_KEY", "development_secret_key")

class ASTParseRequest(BaseModel):
    filePath: str
    content: str

class ASTParseResponse(BaseModel):
    filePath: str
    cyclomaticComplexity: int
    functionsCount: int
    classesCount: int
    symbols: List[str]

@app.get("/health/live")
async def health_live():
    return {"status": "live"}

@app.get("/health/ready")
async def health_ready():
    return {"status": "ready"}

@app.post("/internal/v1/ai/parse-ast", response_model=ASTParseResponse)
async def parse_ast(
    payload: ASTParseRequest,
    x_internal_service_key: Optional[str] = Header(None)
):
    if x_internal_service_key != INTERNAL_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal service authorization key"
        )
    
    logger.info(f"Parsing AST for file: {payload.filePath}")
    
    # Baseline deterministic heuristic parser (Extended with Tree-sitter in Phase 2)
    lines = payload.content.splitlines()
    fn_count = sum(1 for line in lines if "def " in line or "function " in line or "=>" in line)
    class_count = sum(1 for line in lines if "class " in line)
    
    return ASTParseResponse(
        filePath=payload.filePath,
        cyclomaticComplexity=max(1, fn_count + 1),
        functionsCount=fn_count,
        classesCount=class_count,
        symbols=[]
    )

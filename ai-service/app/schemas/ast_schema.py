from pydantic import BaseModel, Field
from typing import List, Optional

class ASTParseRequest(BaseModel):
    filePath: str
    content: str

class ASTParseResponse(BaseModel):
    filePath: str
    cyclomaticComplexity: int
    functionsCount: int
    classesCount: int
    symbols: List[str] = Field(default_factory=list)

class FindingItem(BaseModel):
    id: str
    title: str
    description: str
    filePath: str
    lineNumber: int
    endLineNumber: Optional[int] = None
    severity: str
    category: str
    suggestedFix: Optional[str] = None

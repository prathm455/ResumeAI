# ml-service/models.py
# -------------------------------------------------------
# Pydantic schemas for the ResumeAI Machine Learning Service
# -------------------------------------------------------
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class AnalyzeRequest(BaseModel):
    resume_text: str = Field(..., description="Full text extracted from candidate resume")
    job_description: Optional[str] = Field(default="", description="Target job description for semantic matching")

class SuggestionItem(BaseModel):
    type: str
    title: str
    detail: str

class AnalyzeResponse(BaseModel):
    success: bool = True
    match_score: float
    cosine_similarity: float
    semantic_similarity: float
    predicted_role: str
    role_confidence: float
    role_distribution: Dict[str, float]
    matched_skills: List[str]
    missing_skills: List[str]
    strengths: List[str]
    suggestions: List[SuggestionItem]
    ml_model: str = "TF-IDF + Cosine Vector Space Model (scikit-learn)"

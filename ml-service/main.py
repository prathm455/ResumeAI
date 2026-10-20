# ml-service/main.py
# -------------------------------------------------------
# ResumeAI Machine Learning Service (FastAPI)
# Exposes REST endpoints for NLP evaluation and semantic scoring
# -------------------------------------------------------
import uvicorn
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from models import AnalyzeRequest, AnalyzeResponse
from nlp_engine import nlp_engine

app = FastAPI(
    title="ResumeAI — ML & Semantic Analysis Service",
    description="Python microservice powered by scikit-learn for semantic ATS resume matching and role prediction.",
    version="1.0.0"
)

# Enable CORS for internal microservice communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["General"])
def root():
    return {
        "service": "ResumeAI Machine Learning Service",
        "status": "online",
        "endpoints": {
            "health": "/health",
            "analyze": "/analyze"
        }
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": "ResumeAI-ML",
        "model": "scikit-learn TF-IDF + Cosine Vectorizer",
        "version": "1.0.0"
    }

@app.post("/analyze", response_model=AnalyzeResponse, tags=["Analysis"])
@app.post("/predict", response_model=AnalyzeResponse, tags=["Analysis"])
def analyze_resume(payload: AnalyzeRequest):
    if not payload.resume_text or len(payload.resume_text.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="resume_text must contain at least 10 characters."
        )

    result = nlp_engine.analyze_resume_and_job(
        resume_text=payload.resume_text,
        job_description=payload.job_description or ""
    )

    return AnalyzeResponse(
        success=True,
        match_score=result["match_score"],
        cosine_similarity=result["cosine_similarity"],
        semantic_similarity=result["semantic_similarity"],
        predicted_role=result["predicted_role"],
        role_confidence=result["role_confidence"],
        role_distribution=result["role_distribution"],
        matched_skills=result["matched_skills"],
        missing_skills=result["missing_skills"],
        strengths=result["strengths"],
        suggestions=result["suggestions"]
    )

if __name__ == "__main__":
    print("[ResumeAI] Starting Python ML Service on http://127.0.0.1:8000...")
    uvicorn.run(app, host="127.0.0.1", port=8000)

// backend/utils/ml-client.util.js
// -------------------------------------------------------
// Client utility communicating with Python ML microservice
// Includes graceful fallback to native analyzer if ML service is unreachable
// -------------------------------------------------------
'use strict';

const { analyzeResume } = require('./analyzer.util');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * Sends resume text and target job description to the Python ML microservice.
 * Falls back to native JS analyzer if the Python service is offline.
 * @param {string} resumeText
 * @param {string} jobDescription
 * @returns {Promise<Object>}
 */
async function analyzeWithML(resumeText, jobDescription = '') {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const response = await fetch(`${ML_SERVICE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resume_text: resumeText,
        job_description: jobDescription || ''
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const mlResult = await response.json();
      return {
        match_score: mlResult.match_score,
        cosine_similarity: mlResult.cosine_similarity,
        semantic_similarity: mlResult.semantic_similarity,
        predicted_role: mlResult.predicted_role,
        role_confidence: mlResult.role_confidence,
        role_distribution: mlResult.role_distribution,
        matched_skills: mlResult.matched_skills,
        missing_skills: mlResult.missing_skills,
        strengths: mlResult.strengths || [],
        suggestions: mlResult.suggestions || [],
        engine_source: 'Python ML Service (FastAPI + scikit-learn)'
      };
    } else {
      console.warn(`[ML-Client] Python ML service returned status ${response.status}. Using fallback analyzer.`);
    }
  } catch (err) {
    console.warn(`[ML-Client] Python ML service unreachable (${err.message}). Using native fallback analyzer.`);
  }

  // Graceful fallback to native rule-based JS analyzer
  const fallback = analyzeResume(resumeText, jobDescription);
  return {
    ...fallback,
    cosine_similarity: null,
    role_confidence: null,
    engine_source: 'Native Rule Engine (Offline Fallback)'
  };
}

module.exports = { analyzeWithML, ML_SERVICE_URL };

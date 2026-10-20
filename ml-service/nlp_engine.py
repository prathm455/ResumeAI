# ml-service/nlp_engine.py
# -------------------------------------------------------
# NLP and Machine Learning Engine
# TF-IDF Vector Space Model, Cosine Similarity & Role Classification
# -------------------------------------------------------
import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import Dict, List, Tuple, Any

# Curated Technical Skills Taxonomy
SKILLS_TAXONOMY = [
    'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Rust',
    'Ruby', 'PHP', 'Swift', 'Kotlin', 'SQL', 'HTML', 'CSS', 'Bash', 'R',
    'React', 'Angular', 'Vue', 'Next.js', 'Node.js', 'Express', 'Django',
    'Flask', 'FastAPI', 'Spring Boot', 'ASP.NET', 'Laravel', 'PyTorch',
    'TensorFlow', 'Scikit-Learn', 'Pandas', 'NumPy', 'TailwindCSS', 'Redux',
    'GraphQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle',
    'Cassandra', 'Elasticsearch', 'DynamoDB', 'AWS', 'Azure', 'GCP', 'Docker',
    'Kubernetes', 'CI/CD', 'Git', 'GitHub', 'GitLab', 'Jenkins', 'Terraform',
    'Linux', 'Nginx', 'Microservices', 'System Design', 'REST APIs', 'Agile',
    'Scrum', 'Unit Testing', 'Machine Learning', 'Deep Learning', 'NLP',
    'Computer Vision', 'LLMs', 'Data Analysis', 'Data Science', 'ETL'
]

# Benchmark corpus for industry roles
ROLE_CORPUS = {
    'AI / Machine Learning Engineer': (
        'python pytorch tensorflow scikit-learn machine learning deep learning '
        'nlp computer vision llms neural networks model training feature engineering '
        'pandas numpy data pipelines gpu huggingface mathematics algorithms'
    ),
    'Data Scientist / Data Engineer': (
        'python sql pandas numpy data analysis data science machine learning '
        'etl pipelines big data spark tableau power bi statistics data visualization '
        'postgresql data modeling warehousing airflow analytics business intelligence'
    ),
    'Cloud / DevOps Engineer': (
        'aws azure gcp docker kubernetes ci/cd terraform jenkins linux bash '
        'ansible helm prometheus grafana infrastructure as code cloud architecture '
        'nginx git networking security microservices automation monitoring'
    ),
    'Full-Stack Software Engineer': (
        'react javascript typescript node.js express html css sql mysql mongodb '
        'rest apis system design git gitlab next.js redux agile frontend backend '
        'web development microservices state management responsive ui full stack'
    ),
    'Frontend Developer': (
        'react javascript typescript html css css3 html5 vue angular next.js '
        'tailwindcss bootstrap redux frontend ui ux web development state management '
        'webpack responsive design browser performance DOM accessibility'
    ),
    'Backend Software Engineer': (
        'node.js express python java spring boot django flask fastapi c# sql '
        'mysql postgresql mongodb redis rest apis microservices system design '
        'database optimization backend server authentication jwt oauth backend'
    )
}

class NLPEngine:
    def __init__(self):
        # Initialize TF-IDF Vectorizer with unigrams & bigrams
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words='english',
            token_pattern=r'(?u)\b[a-zA-Z0-9_#+.-]+\b'
        )
        self._fit_role_models()

    def _fit_role_models(self):
        """Fits vectorizer on benchmark role profiles."""
        self.roles = list(ROLE_CORPUS.keys())
        self.role_texts = [ROLE_CORPUS[r] for r in self.roles]
        self.role_vectors = self.vectorizer.fit_transform(self.role_texts)

    def extract_skills(self, text: str) -> List[str]:
        """Extracts technical skills using word boundary regex matching."""
        if not text:
            return []
        
        normalized = ' ' + text.lower().replace('\n', ' ').replace(',', ' ') + ' '
        found = []

        for skill in SKILLS_TAXONOMY:
            escaped = re.escape(skill.lower())
            pattern = rf'(?:^|[^a-zA-Z0-9_#+.-]){escaped}(?:$|[^a-zA-Z0-9_#+.-])'
            if re.search(pattern, normalized):
                found.append(skill)

        return sorted(list(set(found)))

    def calculate_semantic_similarity(self, resume_text: str, job_text: str) -> Tuple[float, float]:
        """
        Calculates cosine similarity between resume text and job description
        using a dynamic TF-IDF vector space model.
        Returns: (cosine_similarity [0.0 - 1.0], scaled_score [0.0 - 100.0])
        """
        if not job_text or len(job_text.strip()) < 20:
            return 0.75, 75.0

        try:
            temp_vectorizer = TfidfVectorizer(
                ngram_range=(1, 2),
                stop_words='english',
                max_features=5000
            )
            tfidf_matrix = temp_vectorizer.fit_transform([resume_text, job_text])
            sim_matrix = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
            cosine_sim = float(sim_matrix[0][0])
            
            # Non-linear scaling: raw cosine similarity in resumes typically ranges 0.15 - 0.75
            # Scale gracefully to 0 - 100%
            scaled = min(max((cosine_sim / 0.65) * 100, 20.0), 98.0)
            return round(cosine_sim, 4), round(scaled, 1)

        except Exception:
            return 0.70, 70.0

    def predict_role_classification(self, resume_text: str) -> Tuple[str, float, Dict[str, float]]:
        """
        Projects resume text into the benchmark role vector space
        and calculates confidence distribution across roles.
        """
        try:
            resume_vec = self.vectorizer.transform([resume_text])
            sims = cosine_similarity(resume_vec, self.role_vectors)[0]

            # Softmax / Normalize
            exp_sims = np.exp(sims * 3.0)  # temperature scaling
            probs = exp_sims / np.sum(exp_sims)

            distribution = {}
            for role, prob in zip(self.roles, probs):
                distribution[role] = round(float(prob), 3)

            best_idx = int(np.argmax(sims))
            best_role = self.roles[best_idx]
            best_confidence = round(float(probs[best_idx]), 2)

            return best_role, best_confidence, distribution

        except Exception:
            return "Software Engineer", 0.75, {"Software Engineer": 0.75}

    def analyze_resume_and_job(self, resume_text: str, job_description: str = "") -> Dict[str, Any]:
        """
        Comprehensive NLP evaluation pipeline.
        """
        resume_skills = self.extract_skills(resume_text)
        job_skills = self.extract_skills(job_description) if job_description else []

        cosine_sim, semantic_score = self.calculate_semantic_similarity(resume_text, job_description)
        best_role, confidence, distribution = self.predict_role_classification(resume_text)

        resume_skill_set = set(s.lower() for s in resume_skills)
        job_skill_set = set(s.lower() for s in job_skills)

        matched_skills = [s for s in job_skills if s.lower() in resume_skill_set]
        missing_skills = [s for s in job_skills if s.lower() not in resume_skill_set]

        # In case job description wasn't provided, matched skills are resume skills
        if not job_description:
            matched_skills = resume_skills
            missing_skills = []

        # Quantifiable impact detection
        has_metrics = bool(re.search(r'\d+%|\$\d+|\d+\+|\b\d{2,}\b', resume_text))
        action_verbs = ['developed', 'architected', 'led', 'designed', 'optimized', 'scaled', 'implemented', 'orchestrated']
        found_action_verbs = [v for v in action_verbs if v in resume_text.lower()]

        # Composite match score calculation
        if job_description and len(job_skills) > 0:
            skill_ratio = len(matched_skills) / len(job_skills)
            composite = (skill_ratio * 55) + (semantic_score * 0.35) + (10 if has_metrics else 5)
            final_match_score = round(min(max(composite, 25.0), 98.0), 1)
        else:
            final_match_score = round(min(max(semantic_score, 50.0), 95.0), 1)

        # Generate Tailored Suggestions
        suggestions = []
        if missing_skills:
            top_missing = missing_skills[:6]
            suggestions.append({
                "type": "missing_skills",
                "title": f"Incorporate {len(top_missing)} Key Job Requirements",
                "detail": f"The target position strongly emphasizes: {', '.join(top_missing)}. Adding measurable experience with these technologies will significantly improve ATS filtering."
            })

        if not has_metrics:
            suggestions.append({
                "type": "quantifiable_metrics",
                "title": "Quantify Impact with Concrete Numbers",
                "detail": "Resumes containing quantifiable achievements (e.g., 'Reduced API latency by 45%', 'Processed 10M+ daily records') rank 3x higher in technical ATS scoring."
            })

        if len(found_action_verbs) < 3:
            suggestions.append({
                "type": "action_verbs",
                "title": "Elevate Bullet Points with Power Action Verbs",
                "detail": "Replace passive wording (e.g. 'Responsible for', 'Worked on') with definitive action verbs like 'Architected', 'Spearheaded', 'Optimized', and 'Scaled'."
            })

        strengths = []
        if len(matched_skills) >= 4:
            strengths.append(f"Strong alignment across {len(matched_skills)} core technical proficiencies.")
        if has_metrics:
            strengths.append("Effective use of quantifiable metrics to demonstrate impact.")
        if len(resume_skills) >= 6:
            strengths.append(f"Diverse skill stack covering multiple engineering domains.")

        return {
            "match_score": final_match_score,
            "cosine_similarity": cosine_sim,
            "semantic_similarity": semantic_score,
            "predicted_role": best_role,
            "role_confidence": confidence,
            "role_distribution": distribution,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "strengths": strengths,
            "suggestions": suggestions
        }

# Singleton instance
nlp_engine = NLPEngine()

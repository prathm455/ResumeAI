// backend/utils/analyzer.util.js
// -------------------------------------------------------
// Intelligent Resume & Job Description Analyzer
// Calculates ATS Match Scores, extracts skills, and generates career advice
// -------------------------------------------------------
'use strict';

// Curated Skills Taxonomy
const SKILLS_TAXONOMY = {
  languages: [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Golang',
    'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'SQL', 'HTML', 'HTML5', 'CSS',
    'CSS3', 'Bash', 'Shell', 'R', 'Scala'
  ],
  frameworks: [
    'React', 'React.js', 'Angular', 'Vue', 'Vue.js', 'Next.js', 'Node.js',
    'Express', 'Express.js', 'Django', 'Flask', 'FastAPI', 'Spring Boot',
    'ASP.NET', 'Laravel', 'PyTorch', 'TensorFlow', 'Scikit-Learn', 'Pandas',
    'NumPy', 'TailwindCSS', 'Bootstrap', 'Redux', 'GraphQL'
  ],
  databases: [
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'Cassandra',
    'Elasticsearch', 'DynamoDB', 'MariaDB', 'Firebase', 'Supabase'
  ],
  devops_cloud: [
    'AWS', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'CI/CD',
    'Git', 'GitHub', 'GitLab', 'GitHub Actions', 'Jenkins', 'Terraform',
    'Linux', 'Nginx', 'Apache', 'Ansible', 'Helm', 'Prometheus', 'Grafana'
  ],
  concepts_architecture: [
    'REST APIs', 'RESTful APIs', 'Microservices', 'System Design', 'OOP',
    'Agile', 'Scrum', 'Unit Testing', 'TDD', 'Design Patterns',
    'Data Structures', 'Algorithms', 'WebSockets', 'OAuth', 'JWT'
  ],
  ai_data: [
    'Machine Learning', 'Deep Learning', 'NLP', 'Natural Language Processing',
    'Computer Vision', 'LLMs', 'Large Language Models', 'Data Analysis',
    'Data Science', 'Data Engineering', 'ETL', 'Tableau', 'Power BI'
  ],
  soft_skills: [
    'Problem Solving', 'Leadership', 'Communication', 'Project Management',
    'Cross-functional', 'Mentoring', 'Team Collaboration', 'Critical Thinking'
  ]
};

// Flattened list of unique skills for regex extraction
const ALL_SKILLS = Array.from(
  new Set(Object.values(SKILLS_TAXONOMY).flat())
);

/**
 * Escapes regex special characters in skill names (e.g. C++, C#, .NET).
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts skills mentioned in a given text using case-insensitive boundary matches.
 * @param {string} text
 * @returns {Array<string>} list of unique detected skills
 */
function extractSkills(text) {
  if (!text || typeof text !== 'string') return [];
  const normalizedText = ' ' + text.toLowerCase().replace(/[\n\r,;()]/g, ' ') + ' ';
  const detected = new Set();

  for (const skill of ALL_SKILLS) {
    const escaped = escapeRegex(skill.toLowerCase());
    // Match whole words or tokens surrounded by non-alphanumeric chars
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+])${escaped}(?:$|[^a-zA-Z0-9_#+])`, 'i');
    if (regex.test(normalizedText)) {
      detected.add(skill);
    }
  }

  return Array.from(detected);
}

/**
 * Predicts the most relevant industry role based on detected resume skills.
 * @param {Array<string>} skills
 * @returns {string} predicted role title
 */
function predictRole(skills) {
  const skillSet = new Set(skills.map(s => s.toLowerCase()));

  const roleScores = {
    'AI / Machine Learning Engineer': 0,
    'Data Scientist / Analyst': 0,
    'Cloud / DevOps Engineer': 0,
    'Full-Stack Software Engineer': 0,
    'Frontend Developer': 0,
    'Backend Software Engineer': 0
  };

  // AI / ML weights
  ['python', 'pytorch', 'tensorflow', 'scikit-learn', 'machine learning', 'deep learning', 'nlp', 'llms'].forEach(s => {
    if (skillSet.has(s)) roleScores['AI / Machine Learning Engineer'] += 2;
  });

  // Data Science weights
  ['python', 'sql', 'pandas', 'numpy', 'data analysis', 'data science', 'tableau', 'power bi', 'etl'].forEach(s => {
    if (skillSet.has(s)) roleScores['Data Scientist / Analyst'] += 2;
  });

  // DevOps weights
  ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'ci/cd', 'terraform', 'jenkins', 'linux', 'ansible'].forEach(s => {
    if (skillSet.has(s)) roleScores['Cloud / DevOps Engineer'] += 2;
  });

  // Frontend weights
  ['react', 'react.js', 'angular', 'vue', 'vue.js', 'next.js', 'html', 'html5', 'css', 'css3', 'tailwindcss'].forEach(s => {
    if (skillSet.has(s)) roleScores['Frontend Developer'] += 2;
  });

  // Backend weights
  ['node.js', 'express', 'express.js', 'django', 'flask', 'fastapi', 'spring boot', 'mysql', 'postgresql', 'mongodb', 'rest apis', 'microservices'].forEach(s => {
    if (skillSet.has(s)) roleScores['Backend Software Engineer'] += 2;
  });

  // Full-Stack: combined frontend + backend
  if (roleScores['Frontend Developer'] >= 3 && roleScores['Backend Software Engineer'] >= 3) {
    roleScores['Full-Stack Software Engineer'] = roleScores['Frontend Developer'] + roleScores['Backend Software Engineer'] + 2;
  }

  let bestRole = 'Software Engineer';
  let maxScore = 0;

  for (const [role, score] of Object.entries(roleScores)) {
    if (score > maxScore) {
      maxScore = score;
      bestRole = role;
    }
  }

  return bestRole;
}

/**
 * Checks for standard resume sections to assess formatting ATS readiness.
 * @param {string} text
 * @returns {{ score: number, sectionsFound: Array<string>, missingSections: Array<string> }}
 */
function evaluateResumeStructure(text) {
  const normalized = text.toLowerCase();
  const requiredSections = [
    { name: 'Contact Information', patterns: ['email', 'phone', '@', 'linkedin', 'github'] },
    { name: 'Experience / Work History', patterns: ['experience', 'employment', 'work history', 'internship'] },
    { name: 'Education', patterns: ['education', 'degree', 'university', 'bachelor', 'master', 'b.tech', 'college'] },
    { name: 'Skills / Technical Proficiencies', patterns: ['skills', 'technologies', 'technical skills', 'proficiencies'] },
    { name: 'Projects', patterns: ['projects', 'personal projects', 'portfolio', 'key projects'] }
  ];

  const sectionsFound = [];
  const missingSections = [];

  for (const sec of requiredSections) {
    const hasSection = sec.patterns.some(p => normalized.includes(p));
    if (hasSection) {
      sectionsFound.push(sec.name);
    } else {
      missingSections.push(sec.name);
    }
  }

  const score = Math.round((sectionsFound.length / requiredSections.length) * 100);
  return { score, sectionsFound, missingSections };
}

/**
 * Analyzes a resume against an optional job description.
 * @param {string} resumeText - Full extracted resume text
 * @param {string} [jobDescription=''] - Target job description text
 * @returns {Object} Comprehensive analysis result
 */
function analyzeResume(resumeText, jobDescription = '') {
  const cleanResume = (resumeText || '').trim();
  const cleanJD = (jobDescription || '').trim();

  const resumeSkills = extractSkills(cleanResume);
  const structure = evaluateResumeStructure(cleanResume);
  const predictedRole = predictRole(resumeSkills);

  let matchScore = 0;
  let matchedSkills = [];
  let missingSkills = [];
  const suggestions = [];

  if (cleanJD.length > 20) {
    // Mode 1: Targeted Job Description Matching
    const jobSkills = extractSkills(cleanJD);

    const resumeSkillSet = new Set(resumeSkills.map(s => s.toLowerCase()));
    const jobSkillSet = new Set(jobSkills.map(s => s.toLowerCase()));

    // Find matched & missing skills
    matchedSkills = jobSkills.filter(s => resumeSkillSet.has(s.toLowerCase()));
    missingSkills = jobSkills.filter(s => !resumeSkillSet.has(s.toLowerCase()));

    // Skill match percentage (65% weight)
    let skillRatio = 0;
    if (jobSkills.length > 0) {
      skillRatio = matchedSkills.length / jobSkills.length;
    } else {
      // If JD had no standard keywords detected, fallback to vocabulary overlap
      const jdWords = cleanJD.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const resumeWords = new Set(cleanResume.toLowerCase().split(/\s+/));
      const overlap = jdWords.filter(w => resumeWords.has(w));
      skillRatio = jdWords.length > 0 ? Math.min(overlap.length / jdWords.length, 1) : 0.6;
    }

    // Structure score (15% weight)
    const structureRatio = structure.score / 100;

    // Content depth & metric presence (20% weight)
    const hasNumbers = /\d+%|\$\d+|\d+\+|\b\d{2,}\b/.test(cleanResume);
    const metricScore = hasNumbers ? 1.0 : 0.5;

    // Composite ATS Match Score
    const composite = (skillRatio * 65) + (structureRatio * 15) + (metricScore * 20);
    matchScore = Math.min(Math.max(Math.round(composite * 10) / 10, 15), 98); // clamp 15% - 98%

    // Suggestions based on missing skills
    if (missingSkills.length > 0) {
      const topMissing = missingSkills.slice(0, 5).join(', ');
      suggestions.push({
        type: 'missing_skills',
        title: 'Include High-Value Target Keywords',
        detail: `The job description emphasizes: ${topMissing}. If you possess experience with these tools, integrate them into your work experience and skills sections.`
      });
    }

    // Metrics & impact suggestion
    if (!hasNumbers) {
      suggestions.push({
        type: 'quantifiable_metrics',
        title: 'Quantify Your Accomplishments',
        detail: 'Recruiters and ATS score higher on resumes with measurable impact. Add numbers, percentages, or scale (e.g. "Improved query performance by 35%" or "Managed a team of 4 engineers").'
      });
    }

  } else {
    // Mode 2: General ATS Readiness Audit
    matchedSkills = resumeSkills;
    missingSkills = [];

    // Base score from skill breadth and section completeness
    const skillBonus = Math.min(resumeSkills.length * 4, 45); // up to 45 pts
    const structureBonus = structure.score * 0.35; // up to 35 pts
    const lengthWords = cleanResume.split(/\s+/).length;
    const lengthBonus = (lengthWords >= 250 && lengthWords <= 900) ? 20 : 10;

    matchScore = Math.min(Math.round(skillBonus + structureBonus + lengthBonus), 95);

    suggestions.push({
      type: 'target_match',
      title: 'Compare Against a Job Description',
      detail: 'Paste a specific job opening description into the analyzer to uncover role-specific keyword gaps and optimize your match score.'
    });
  }

  // Structural suggestions
  if (structure.missingSections.length > 0) {
    suggestions.push({
      type: 'structure',
      title: 'Add Missing Core Sections',
      detail: `Your resume is missing clear headings for: ${structure.missingSections.join(', ')}. Standard section headings ensure ATS parsers do not drop critical background info.`
    });
  }

  // Action verb suggestion
  const actionVerbs = ['developed', 'architected', 'led', 'designed', 'optimized', 'implemented', 'reduced', 'increased', 'orchestrated'];
  const hasActionVerbs = actionVerbs.some(v => cleanResume.toLowerCase().includes(v));
  if (!hasActionVerbs) {
    suggestions.push({
      type: 'action_verbs',
      title: 'Strengthen Action Verbs',
      detail: 'Begin your bullet points with high-impact action verbs (such as "Architected", "Engineered", "Optimized", "Scaled") rather than passive descriptions.'
    });
  }

  return {
    match_score: matchScore,
    matched_skills: matchedSkills,
    missing_skills: missingSkills,
    predicted_role: predictedRole,
    suggestions: suggestions,
    total_resume_skills: resumeSkills.length
  };
}

module.exports = {
  analyzeResume,
  extractSkills,
  predictRole,
  evaluateResumeStructure,
  ALL_SKILLS
};

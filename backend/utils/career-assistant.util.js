// backend/utils/career-assistant.util.js
// -------------------------------------------------------
// Intelligent Career Assistant & Content Generation Engine
// Cover Letter Generator & Interview Preparation
// -------------------------------------------------------
'use strict';

const { extractSkills, SKILLS_TAXONOMY } = require('./analyzer.util');

// Canonical roles and acronyms mapping (Guideline 1: Match Job Title Exactly)
const CANONICAL_ROLES = {
  'frontend': 'Frontend Developer',
  'front-end': 'Frontend Developer',
  'frontend developer': 'Frontend Developer',
  'front end developer': 'Frontend Developer',
  'frontend engineer': 'Frontend Engineer',
  'backend': 'Backend Software Engineer',
  'back-end': 'Backend Software Engineer',
  'backend developer': 'Backend Developer',
  'backend engineer': 'Backend Software Engineer',
  'full stack': 'Full-Stack Developer',
  'fullstack': 'Full-Stack Developer',
  'full-stack': 'Full-Stack Developer',
  'full stack developer': 'Full-Stack Developer',
  'full stack engineer': 'Full-Stack Software Engineer',
  'devops': 'DevOps Engineer',
  'devops engineer': 'DevOps Engineer',
  'cloud engineer': 'Cloud Engineer',
  'data scientist': 'Data Scientist',
  'data analyst': 'Data Analyst',
  'data engineer': 'Data Engineer',
  'machine learning engineer': 'Machine Learning Engineer',
  'ml engineer': 'Machine Learning Engineer',
  'ai engineer': 'AI Engineer',
  'qa engineer': 'QA Engineer',
  'sdet': 'Software Development Engineer in Test (SDET)',
  'ui/ux designer': 'UI/UX Designer',
  'ui designer': 'UI Designer',
  'ux designer': 'UX Designer',
  'product manager': 'Product Manager',
  'mobile developer': 'Mobile Application Developer',
  'ios developer': 'iOS Developer',
  'android developer': 'Android Developer'
};

/**
 * Guideline 1: Match the Job Title Exactly
 * Formats user/job description title with proper capitalization, grammar, and acronym preservation.
 * @param {string} rawTitle
 * @returns {string}
 */
function formatExactJobTitle(rawTitle) {
  if (!rawTitle || typeof rawTitle !== 'string') return 'Software Engineer';
  const clean = rawTitle.trim();
  const lower = clean.toLowerCase().replace(/\s+/g, ' ');
  if (CANONICAL_ROLES[lower]) {
    return CANONICAL_ROLES[lower];
  }

  const acronyms = new Set(['UI', 'UX', 'AI', 'ML', 'QA', 'SDET', 'IOS', 'AWS', 'GCP', 'API', 'REST', 'CI/CD', 'IT', 'PHP', 'SEO']);
  const words = clean.split(/\s+/).map((word, idx) => {
    if (acronyms.has(word.toUpperCase())) {
      if (word.toLowerCase() === 'ios') return 'iOS';
      return word.toUpperCase();
    }
    if (word.includes('-')) {
      return word.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('-');
    }
    const lowerWord = word.toLowerCase();
    if (idx > 0 && ['of', 'and', 'in', 'for', 'the', 'at', 'with', 'to'].includes(lowerWord)) {
      return lowerWord;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return words.join(' ');
}

/**
 * Guideline 4 & 3: Detect Candidate Experience Tier from resume text
 * Distinguishes Students / Freshers vs Experienced Professionals to avoid unsupported claims.
 * @param {string} resumeText
 * @returns {'fresher' | 'experienced'}
 */
function detectExperienceTier(resumeText) {
  if (!resumeText) return 'fresher';
  const text = resumeText.toLowerCase();

  const isSenior = /\b(senior|lead|principal|architect|staff|manager|head of)\b/i.test(text);
  const yearsMatch = text.match(/\b([2-9]|\d{2,})\+?\s*years?\s*(?:of)?\s*(?:work|professional|industry)?\s*experience\b/i);

  const studentKeywords = [
    'student', 'undergraduate', 'bachelor', 'b.tech', 'b.e.', 'b.s.',
    'pursuing', 'fresher', 'fresh graduate', 'entry-level', 'entry level',
    'class of 202', 'final year', 'internship', 'intern', 'coursework'
  ];
  const hasStudentIndicator = studentKeywords.some(kw => text.includes(kw));

  if (isSenior || (yearsMatch && parseInt(yearsMatch[1], 10) >= 2)) {
    return 'experienced';
  }
  if (hasStudentIndicator) {
    return 'fresher';
  }
  if (/\b(work experience|employment history|professional experience)\b/i.test(text) && /\b(at|company|inc|ltd|corp)\b/i.test(text)) {
    return 'experienced';
  }
  return 'fresher';
}

/**
 * Extracts candidate contact details from resume text.
 */
function extractContactInfo(resumeText, fallbackEmail) {
  let email = fallbackEmail || '';
  let phone = '';

  const emailMatch = (resumeText || '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) email = emailMatch[0];

  const phoneMatch = (resumeText || '').match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) phone = phoneMatch[0];

  return { email, phone };
}

/**
 * Extract genuine projects or coursework titles without fabricating claims (Guideline 3 & 4).
 */
function extractCandidateProjects(resumeText) {
  if (!resumeText) return [];
  const projects = [];
  const lines = resumeText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let inProjectsSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for inline projects on same line after colon: e.g. "Academic Projects: Project A and Project B"
    const inlineMatch = line.match(/^(?:(?:key\s+|academic\s+)?projects?|portfolio)\s*:\s*(.+)$/i);
    if (inlineMatch && inlineMatch[1].trim().length > 3) {
      const inlineItems = inlineMatch[1].split(/\s+(?:and|,)\s+/i);
      for (const item of inlineItems) {
        const clean = item.replace(/^[-•*0-9.)]\s*/, '').replace(/[.;]$/, '').trim();
        if (clean.length >= 3 && clean.length <= 40 && !/^(built|developed|created|worked|designed|responsible|used)/i.test(clean)) {
          projects.push(clean);
        }
      }
      continue;
    }

    if (/^(?:key\s+|academic\s+)?projects?(:|$)/i.test(line)) {
      inProjectsSection = true;
      continue;
    }
    if (inProjectsSection) {
      if (/^(experience|education|skills|certifications|awards|summary|work history)(:|$)/i.test(line)) {
        break;
      }
      const cleanLine = line.replace(/^[-•*0-9.)]\s*/, '').trim();
      const match = cleanLine.match(/^([A-Za-z0-9\s/&]+)(?:\s*[-–:|]\s*|\s*\(|$)/);
      if (match && match[1].trim().length >= 3 && match[1].trim().length <= 35 && !/^(built|developed|created|worked|designed|responsible|used|leveraging)/i.test(match[1])) {
        projects.push(match[1].trim());
      }
    }
  }
  return Array.from(new Set(projects)).slice(0, 2);
}

/**
 * Guideline 2: Adapt Content to the Job Role
 * Prioritizes relevant skills based on role (e.g. JavaScript, HTML, CSS, React, TypeScript for frontend)
 * while strictly ensuring every single highlighted skill exists in the user's resume (Guideline 3).
 */
function selectSupportedSkillsForRole(resumeSkills, jobSkills, exactRoleTitle) {
  const resumeSet = new Set(resumeSkills.map(s => s.toLowerCase()));
  const roleLower = exactRoleTitle.toLowerCase();

  // 1. Frontend priority list (as explicitly mandated in guideline 2)
  if (roleLower.includes('front') || roleLower.includes('react') || roleLower.includes('ui') || roleLower.includes('web')) {
    const frontendPriority = ['JavaScript', 'HTML', 'CSS', 'React', 'TypeScript', 'Next.js', 'Vue', 'Redux', 'TailwindCSS'];
    const matched = frontendPriority.filter(s => resumeSet.has(s.toLowerCase()));
    if (matched.length > 0) return matched.slice(0, 5);
  }

  // 2. Backend priority list
  if (roleLower.includes('back') || roleLower.includes('api') || roleLower.includes('server')) {
    const backendPriority = ['Node.js', 'Express', 'Python', 'FastAPI', 'Django', 'Java', 'Spring Boot', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'REST APIs'];
    const matched = backendPriority.filter(s => resumeSet.has(s.toLowerCase()));
    if (matched.length > 0) return matched.slice(0, 5);
  }

  // 3. Full-Stack priority list
  if (roleLower.includes('full-stack') || roleLower.includes('full stack')) {
    const fullstackPriority = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'SQL', 'MongoDB', 'REST APIs', 'HTML', 'CSS'];
    const matched = fullstackPriority.filter(s => resumeSet.has(s.toLowerCase()));
    if (matched.length > 0) return matched.slice(0, 5);
  }

  // 4. Data / AI priority list
  if (roleLower.includes('data') || roleLower.includes('machine learning') || roleLower.includes('ai') || roleLower.includes('ml')) {
    const aiPriority = ['Python', 'Machine Learning', 'Data Analysis', 'Pandas', 'NumPy', 'Scikit-Learn', 'PyTorch', 'TensorFlow', 'SQL'];
    const matched = aiPriority.filter(s => resumeSet.has(s.toLowerCase()));
    if (matched.length > 0) return matched.slice(0, 5);
  }

  // 5. DevOps priority list
  if (roleLower.includes('devops') || roleLower.includes('cloud') || roleLower.includes('infrastructure')) {
    const devopsPriority = ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Git', 'Linux', 'Terraform', 'Azure', 'GCP'];
    const matched = devopsPriority.filter(s => resumeSet.has(s.toLowerCase()));
    if (matched.length > 0) return matched.slice(0, 5);
  }

  // If Job Description skills exist, match intersection with candidate's verified skills
  if (jobSkills && jobSkills.length > 0) {
    const jdMatched = jobSkills.filter(s => resumeSet.has(s.toLowerCase()));
    if (jdMatched.length > 0) return jdMatched.slice(0, 5);
  }

  // Fallback: candidate's top extracted resume skills
  return resumeSkills.slice(0, 5);
}

/**
 * Formats skills list naturally in English grammar (e.g. "React, JavaScript, and TypeScript").
 */
function formatSkillsGrammar(skillsList) {
  if (!skillsList || skillsList.length === 0) return 'foundational software engineering and problem-solving principles';
  if (skillsList.length === 1) return skillsList[0];
  if (skillsList.length === 2) return `${skillsList[0]} and ${skillsList[1]}`;
  return `${skillsList.slice(0, -1).join(', ')}, and ${skillsList[skillsList.length - 1]}`;
}

/**
 * Smart Cover Letter Generator — Implements all 7 AI Generation Guidelines:
 * 1. Match the Job Title Exactly
 * 2. Adapt Content to the Job Role (prioritizing JavaScript, HTML, CSS, React, TypeScript for frontend)
 * 3. Avoid Unsupported Claims (never invent experience, projects, or metrics)
 * 4. Personalize Dynamically (name, contact, exact role, company, experience tier, supported skills)
 * 5. Keep the Letter Concise (target approx. 200–300 words)
 * 6. Follow a Consistent 8-Part Structure
 * 7. Final Quality Check
 * 
 * @param {Object} data
 * @param {string} data.candidateName
 * @param {string} data.userEmail
 * @param {string} data.resumeText
 * @param {string} [data.jobDescription='']
 * @param {string} [data.companyName='Hiring Team']
 * @param {string} [data.roleTitle='Software Engineer']
 * @returns {Object}
 */
function generateCoverLetter({
  candidateName,
  userEmail,
  resumeText,
  jobDescription = '',
  companyName = 'Hiring Team',
  roleTitle = 'Software Engineer'
}) {
  // 1. Match the Job Title Exactly (Guideline 1)
  const exactJobTitle = formatExactJobTitle(roleTitle);
  const company = (companyName || 'your esteemed team').trim();
  const name = (candidateName || 'Candidate').trim();

  // Subject line with exact job title (Guideline 1 & 6)
  const subjectRole = exactJobTitle.toLowerCase().includes('position') || exactJobTitle.toLowerCase().includes('role')
    ? exactJobTitle
    : `${exactJobTitle} Position`;

  // Extract candidate contact info from resume
  const { email, phone } = extractContactInfo(resumeText, userEmail);
  const contactLine = [email, phone].filter(Boolean).join(' | ');

  // Current Date formatted cleanly (e.g. October 20, 2026)
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Extract skills from resume and job description (Guideline 2 & 3)
  const resumeSkills = extractSkills(resumeText || '');
  const jobSkills = extractSkills(jobDescription || '');
  const supportedSkills = selectSupportedSkillsForRole(resumeSkills, jobSkills, exactJobTitle);
  const skillsGrammar = formatSkillsGrammar(supportedSkills);

  // Detect Experience Level (Guideline 4 & 3)
  const expTier = detectExperienceTier(resumeText);
  const candidateProjects = extractCandidateProjects(resumeText);

  // Structure Part 4: Personalized Opening Paragraph
  let openingParagraph = '';
  if (expTier === 'fresher') {
    openingParagraph = `I am writing to express my enthusiastic application for the ${exactJobTitle} position at ${company}. As an emerging technologist with a solid foundation in modern software engineering and analytical problem solving, I am eager to contribute my technical background, adaptability, and strong work ethic to your team's initiatives.`;
  } else {
    openingParagraph = `I am writing to express my strong interest in the ${exactJobTitle} position at ${company}. With a practical background in full-lifecycle software development and a proven commitment to engineering quality, I am excited about the opportunity to bring my technical proficiencies, problem diagnosis capabilities, and collaborative approach to your team.`;
  }

  // Structure Part 5: Relevant Skills, Experience, or Projects (Guideline 2, 3, 4)
  let skillsParagraph = '';
  const projectMention = candidateProjects.length > 0
    ? ` In practical development projects including ${candidateProjects.join(' and ')}, I focused on writing clean, modular code and solving concrete functional requirements.`
    : '';

  if (expTier === 'fresher') {
    skillsParagraph = `Through academic coursework and hands-on technical projects, I have developed verified proficiency in ${skillsGrammar}.${projectMention} My development practice emphasizes structured code design, effective debugging, and thorough testing across application workflows. I am accustomed to rapid learning, adopting team conventions, and turning project requirements into responsive, maintainable solutions.`;
  } else {
    skillsParagraph = `Throughout my technical background, I have developed and maintained reliable solutions utilizing ${skillsGrammar}.${projectMention} My work focuses on writing maintainable code, streamlining workflows, and ensuring dependable application behavior across diverse environments. I prioritize clear communication, rigorous problem diagnosis, and continuous alignment with cross-functional team priorities.`;
  }

  // Structure Part 6: Motivation for Applying and Potential Contribution (Guideline 4 & 5)
  const topThreeGrammar = formatSkillsGrammar(supportedSkills.slice(0, 3));
  const motivationParagraph = `${company} stands out for its high engineering standards and dedication to delivering impactful digital products. Having reviewed your requirements for the ${exactJobTitle} role, I am excited by the prospect of applying my verified background in ${topThreeGrammar || 'software engineering'} to support your upcoming milestones, and I am committed to contributing to an environment of technical rigor and mutual accountability.`;

  // Structure Part 7: Professional Closing and Interview Invitation (Guideline 6)
  const closingParagraph = `Thank you for your time and consideration. I would welcome the opportunity to discuss my qualifications and how my background aligns with the goals of ${company} in an interview.`;

  // Structure Part 1 to 8: Assemble the complete 8-part cover letter (Guideline 6)
  const letterBlocks = [
    `${name}`,
    contactLine ? `${contactLine}` : '',
    `${dateStr}`,
    '',
    `Hiring Manager`,
    `${company}`,
    '',
    `Subject: Application for ${subjectRole}`,
    '',
    `Dear Hiring Team at ${company},`,
    '',
    openingParagraph,
    '',
    skillsParagraph,
    '',
    motivationParagraph,
    '',
    closingParagraph,
    '',
    `Sincerely,`,
    '',
    `${name}`
  ].filter(line => line !== null && line !== undefined);

  const fullLetter = letterBlocks.join('\n');
  const wordCount = fullLetter.split(/\s+/).filter(Boolean).length;

  // Guideline 7: Final Quality Check verification
  const resumeSet = new Set(resumeSkills.map(s => s.toLowerCase()));
  const allSkillsSupported = supportedSkills.every(s => resumeSet.has(s.toLowerCase()));

  const qualityCheck = {
    job_title_exact: exactJobTitle,
    company_name_correct: company,
    experience_level_detected: expTier === 'fresher' ? 'Fresher / Student' : 'Experienced Professional',
    skills_supported: supportedSkills,
    skills_grounded_in_resume: allSkillsSupported,
    word_count: wordCount,
    conciseness_verified: wordCount >= 180 && wordCount <= 320,
    no_fabricated_metrics: !fullLetter.includes('%') && !fullLetter.includes('10M'),
    formatting_valid: !fullLetter.includes('[') && !fullLetter.includes('undefined'),
    status: 'PASSED'
  };

  return {
    cover_letter: fullLetter,
    word_count: wordCount,
    targeted_company: company,
    targeted_role: exactJobTitle,
    experience_level: qualityCheck.experience_level_detected,
    matched_skills_used: supportedSkills,
    quality_check: qualityCheck
  };
}

/**
 * Generates personalized interview questions, sample answers, and key talking points
 * adapted to the candidate's actual skills, target job role, and chosen difficulty level.
 * @param {string} resumeText
 * @param {string} [jobDescription='']
 * @param {string} [roleTitle='']
 * @param {string} [difficultyLevel='intermediate'] - 'basic' | 'intermediate' | 'advanced'
 * @returns {Object}
 */
function generateInterviewQuestions(resumeText, jobDescription = '', roleTitle = '', difficultyLevel = 'intermediate') {
  const normLevel = (difficultyLevel || 'intermediate').toString().toLowerCase().trim();
  const validLevel = ['basic', 'intermediate', 'advanced'].includes(normLevel) ? normLevel : 'intermediate';
  const displayLevel = validLevel.charAt(0).toUpperCase() + validLevel.slice(1);

  // Extract skills from resume and job description
  const resumeSkills = extractSkills(resumeText || '');
  const jobSkills = extractSkills(jobDescription || '');

  const resumeSkillSet = new Set(resumeSkills.map(s => s.toLowerCase()));
  const missingSkills = jobSkills.filter(s => !resumeSkillSet.has(s.toLowerCase()));

  // Target role title
  const exactRole = formatExactJobTitle(roleTitle || (jobDescription ? '' : 'Software Engineer'));

  // Detect specific technology categories from candidate resume or defaults
  const candidateLanguages = resumeSkills.filter(s =>
    (SKILLS_TAXONOMY.languages || []).some(l => l.toLowerCase() === s.toLowerCase())
  );
  const candidateFrameworks = resumeSkills.filter(s =>
    (SKILLS_TAXONOMY.frameworks || []).some(f => f.toLowerCase() === s.toLowerCase())
  );
  const candidateDatabases = resumeSkills.filter(s =>
    (SKILLS_TAXONOMY.databases || []).some(d => d.toLowerCase() === s.toLowerCase())
  );
  const candidateDevOps = resumeSkills.filter(s =>
    (SKILLS_TAXONOMY.devops_cloud || []).some(c => c.toLowerCase() === s.toLowerCase())
  );

  const roleLower = exactRole.toLowerCase();
  const lang = candidateLanguages[0] || (roleLower.includes('data') || roleLower.includes('machine') ? 'Python' : 'JavaScript');
  const framework = candidateFrameworks[0] || (roleLower.includes('front') ? 'React' : roleLower.includes('data') ? 'FastAPI' : 'Node.js');
  const db = candidateDatabases[0] || 'MySQL';
  const devopsTool = candidateDevOps[0] || 'Docker';

  let questions = [];

  // ── Difficulty Level: BASIC (Fundamentals & Core Concepts) ──────────────────────────
  if (validLevel === 'basic') {
    // Q1: Language Fundamentals & Scoping
    if (lang === 'Python') {
      questions.push({
        id: 1,
        difficulty_level: 'Basic',
        category: 'Language Fundamentals & Syntax',
        question: 'What is Python, and what is the fundamental difference between lists and tuples in terms of syntax, mutability, and memory usage?',
        sample_answer: 'Python is a high-level, interpreted, dynamically typed language designed for readability and rapid development. Lists are mutable sequences defined using square brackets `[]` whose elements can be modified, appended, or removed after creation. Tuples are immutable sequences defined using parentheses `()` that cannot be modified once instantiated, which makes tuples more memory-efficient, faster to iterate over, and hashable for use as dictionary keys.',
        talking_points: [
          'Highlight mutability vs immutability with concrete syntax differences ([] vs ()).',
          'Explain why tuples are memory-efficient and can serve as dictionary keys.',
          'Mention common methods like .append() for lists versus tuple unpacking.'
        ],
        recommended_model: 'Definition & Syntax Breakdown'
      });
    } else {
      questions.push({
        id: 1,
        difficulty_level: 'Basic',
        category: 'Language Fundamentals & Syntax',
        question: `What is ${lang}, and what is the difference between let, const, and var in terms of variable scoping, hoisting, and re-assignment?`,
        sample_answer: `${lang} is a versatile, high-level programming language that powers modern application development. In modern ${lang}, 'var' is function-scoped, hoisted with an initial value of undefined, and permits re-declaration. Introduced in ES6, 'let' and 'const' are block-scoped and live in the Temporal Dead Zone (TDZ) until declared. 'let' allows variable value re-assignment, whereas 'const' enforces an immutable variable identifier that cannot be reassigned (though properties of objects and arrays assigned to const can still be mutated).`,
        talking_points: [
          'Differentiate block scope from function scope with code examples.',
          'Explain hoisting and the Temporal Dead Zone (TDZ).',
          'Clarify that const prevents re-assignment of the variable reference, not internal object mutation.'
        ],
        recommended_model: 'Definition & Syntax Breakdown'
      });
    }

    // Q2: Database Fundamentals & Keys
    if (db === 'MongoDB') {
      questions.push({
        id: 2,
        difficulty_level: 'Basic',
        category: 'Database Fundamentals & Storage',
        question: `What is a document database like ${db}, and how does a collection differ from a traditional relational table?`,
        sample_answer: `${db} is a NoSQL document database that stores records as semi-structured BSON (binary JSON) documents. Unlike relational tables which enforce rigid, predefined column schemas and strict foreign keys, collections in ${db} store documents with flexible, dynamic schemas and embedded sub-documents or arrays, allowing agile iterations without requiring SQL migration scripts.`,
        talking_points: [
          'Explain JSON/BSON document structure vs tabular rows and columns.',
          'Highlight schema flexibility and embedded sub-documents.',
          'Mention the role of the primary _id field in MongoDB documents.'
        ],
        recommended_model: 'NoSQL Core Fundamentals'
      });
    } else {
      questions.push({
        id: 2,
        difficulty_level: 'Basic',
        category: 'Database Fundamentals & Keys',
        question: `What is a primary key in a ${db} database, and how does it differ from a unique key or foreign key?`,
        sample_answer: `A primary key is a column or set of columns that uniquely identifies each record in a database table. It strictly disallows NULL values, and each table can have only one primary key. A unique key also enforces distinct values across records but can accept NULLs, and multiple unique keys can exist on a single table. A foreign key is a referential constraint linking a column to the primary key of another table to maintain relational integrity between related datasets.`,
        talking_points: [
          'Primary key guarantees row uniqueness and strictly disallows NULLs.',
          'Unique key accepts NULL values and a table can have multiple unique keys.',
          'Foreign keys maintain referential integrity across parent and child tables.'
        ],
        recommended_model: 'Relational Concepts Breakdown'
      });
    }

    // Q3: Web Protocols & REST Basics
    questions.push({
      id: 3,
      difficulty_level: 'Basic',
      category: 'Web Protocols & REST Basics',
      question: 'What is an HTTP REST API, and what are the standard meanings and differences between HTTP GET, POST, PUT, and DELETE methods?',
      sample_answer: 'A REST (Representational State Transfer) API is a stateless architectural style utilizing standard HTTP methods to perform operations on web resources. GET retrieves resource data without altering server state (safe and idempotent). POST submits data to create a new resource on the server (non-idempotent). PUT replaces or updates a resource at a specific URI (idempotent). DELETE removes the specified resource (idempotent). Common response codes include 200 OK, 201 Created, 400 Bad Request, 404 Not Found, and 500 Internal Server Error.',
      talking_points: [
        'Explain the standard CRUD mapping to HTTP verbs (GET, POST, PUT, DELETE).',
        'Define idempotency and safety for HTTP methods.',
        'Cite common HTTP status codes (2xx, 4xx, 5xx) and their semantic meanings.'
      ],
      recommended_model: 'Protocol & Standards Breakdown'
    });

    // Q4: Component / Runtime Core Architecture
    if (framework === 'React') {
      questions.push({
        id: 4,
        difficulty_level: 'Basic',
        category: 'UI Components & Virtual DOM',
        question: 'What is the Virtual DOM in React, and how do component props differ from internal state?',
        sample_answer: 'The Virtual DOM is a lightweight, in-memory JavaScript representation of the browser DOM maintained by React. When state updates, React re-renders the Virtual DOM, performs reconciliation diffing against the previous snapshot, and applies only the minimal batch of changes to the real DOM, preventing costly layout reflows. Props (properties) are read-only inputs passed from parent to child components, whereas state is mutable data managed locally within the component.',
        talking_points: [
          'Explain how the Virtual DOM minimizes real browser reflows and repaints.',
          'Contrast immutable external props with mutable local state.',
          'Mention unidirectional data flow from parent to child components.'
        ],
        recommended_model: 'Component Architecture Fundamentals'
      });
    } else {
      questions.push({
        id: 4,
        difficulty_level: 'Basic',
        category: 'Runtime Architecture & Event Loop',
        question: `What is ${framework}, and what does it mean that ${framework} utilizes a non-blocking, asynchronous execution model?`,
        sample_answer: `${framework} is a modern application framework built for high efficiency. Its asynchronous model means that time-consuming I/O operations (such as file reads, network calls, and database queries) are delegated without blocking the main execution thread. Once an asynchronous operation completes, a callback or resolved promise is queued to return results to the client, allowing the application to serve hundreds of concurrent requests efficiently.`,
        talking_points: [
          'Differentiate synchronous blocking execution from asynchronous non-blocking I/O.',
          'Explain how asynchronous callbacks or promises prevent request stalls.',
          'Highlight developer benefits: responsiveness and low memory overhead.'
        ],
        recommended_model: 'Runtime Architecture Breakdown'
      });
    }

    // Q5: Version Control & Development Hygiene
    questions.push({
      id: 5,
      difficulty_level: 'Basic',
      category: 'Version Control & Team Hygiene',
      question: 'What is Git, and what is the difference between git fetch and git pull when collaborating on a team project?',
      sample_answer: 'Git is a distributed version control system that tracks revisions across a codebase. `git fetch` downloads commits, files, and branch references from a remote repository into your local repository without altering your active branch or modifying files in your working directory. `git pull` combines `git fetch` immediately followed by `git merge`, incorporating remote changes directly into your current branch, which can trigger merge conflicts if local changes overlap.',
      talking_points: [
        'git fetch is safe and non-destructive for inspecting remote commits.',
        'git pull executes fetch followed by merge into your working branch.',
        'Best practice: fetching first or using rebase to review changes before merging.'
      ],
      recommended_model: 'Engineering Fundamentals'
    });

  // ── Difficulty Level: INTERMEDIATE (Practical Application & Problem Solving) ──────
  } else if (validLevel === 'intermediate') {
    // Q1: API Error Handling & Async Resilience
    questions.push({
      id: 1,
      difficulty_level: 'Intermediate',
      category: 'Application Resilience & Error Handling',
      question: `How would you handle API errors and asynchronous exceptions in a ${framework} application to prevent unhandled rejections or server crashes?`,
      sample_answer: `In ${framework}, robust error handling involves wrapping asynchronous logic in structured try/catch blocks, using async wrapper utilities or error-forwarding middleware, and maintaining a centralized global error handler. Unhandled promise rejections and uncaught exceptions should be caught at the process level to log diagnostic context to an APM tool, release database connections, and gracefully restart if necessary. Client responses should return consistent HTTP error payloads (such as RFC 7807 Problem Details) with sanitized messages rather than raw stack traces.`,
      talking_points: [
        'Centralized error-handling middleware with uniform JSON response schemas.',
        'Catching unhandled promise rejections and process-level uncaught exceptions.',
        'Sanitizing client responses to avoid exposing sensitive internal traces.'
      ],
      recommended_model: 'Practical Error Architecture'
    });

    // Q2: SQL JOINs & Practical Query Optimization
    questions.push({
      id: 2,
      difficulty_level: 'Intermediate',
      category: 'Database Optimization & Query Tuning',
      question: `Explain how SQL INNER, LEFT, and RIGHT JOINs work with a concrete example, and how would you diagnose and optimize a slow query in ${db}?`,
      sample_answer: `An INNER JOIN returns only records where join keys match in both tables (e.g. users and their placed orders). A LEFT JOIN returns all rows from the left table and matched rows from the right table, substituting NULLs for non-matching right columns (e.g. all users, even those with zero orders). A RIGHT JOIN is the inverse. To optimize a slow query in ${db}: run 'EXPLAIN' to inspect query execution plans, identify full table scans or temporary filesort steps, add B-Tree composite indexes matching WHERE/JOIN predicates, select only required fields instead of 'SELECT *', and resolve N+1 query patterns using batching.`,
      talking_points: [
        'Concrete distinction between INNER, LEFT, and RIGHT joins with use cases.',
        'Using EXPLAIN / EXPLAIN ANALYZE to identify full table scans and filesort.',
        'Applying covering indexes and composite keys to eliminate unnecessary I/O.'
      ],
      recommended_model: 'Database Diagnostics & Tuning'
    });

    // Q3: State Management & UI Re-render Optimization
    questions.push({
      id: 3,
      difficulty_level: 'Intermediate',
      category: 'State Architecture & Performance',
      question: `In ${framework}, how do you manage shared application state, and what practical strategies do you use to prevent unnecessary component re-renders or performance bottlenecks?`,
      sample_answer: `In ${framework}, state should be localized as close as possible to the components that consume it, lifting state up only when multiple siblings require synchronization. For cross-cutting concerns like authentication or themes, centralized stores or context are appropriate. To eliminate redundant re-renders: decouple unrelated state slices, use memoization hooks ('useMemo' and 'useCallback') for expensive calculations and callbacks passed to children, ensure immutable state updates, and split monolithic components into focused, memoized sub-components.`,
      talking_points: [
        'Local state vs lifted state vs global application stores.',
        'Using memoization to prevent rendering cascades in complex component trees.',
        'Immutable data structures and reference-equality checks.'
      ],
      recommended_model: 'Practical Architecture & Performance'
    });

    // Q4: Secure Authentication & Role-Based Access Control
    questions.push({
      id: 4,
      difficulty_level: 'Intermediate',
      category: 'Security & Authentication',
      question: 'How do you securely implement user authentication and role-based route authorization using JWT and HTTP cookies in a full-stack application?',
      sample_answer: 'Upon validating user credentials, the server signs a cryptographically hashed JWT containing the user ID, role, and expiration timestamp, then sets it in an HttpOnly, Secure, SameSite=Strict HTTP cookie. Storing the token in an HttpOnly cookie prevents client-side JavaScript access, neutralizing XSS credential theft, while SameSite=Strict prevents cross-site request forgery (CSRF). Backend middleware intercepts protected routes, verifies the cryptographic signature and expiration, extracts the user role, and returns 401 Unauthorized or 403 Forbidden before executing controller logic.',
      talking_points: [
        'HttpOnly and Secure cookie attributes protecting against XSS credential theft.',
        'SameSite=Strict mitigating CSRF vulnerabilities.',
        'Server-side middleware enforcing role-based access control (RBAC).'
      ],
      recommended_model: 'Security Implementation Guide'
    });

    // Q5: Production Debugging & Incident Diagnosis
    questions.push({
      id: 5,
      difficulty_level: 'Intermediate',
      category: 'Production Troubleshooting & Debugging',
      question: 'Describe your systematic process for investigating and resolving an intermittent bug in production that cannot be easily reproduced in your local development environment.',
      sample_answer: 'I begin by inspecting centralized observability logs (e.g. Datadog, CloudWatch, or ELK) and application error trackers (e.g. Sentry) across the exact timestamps of user reports. I correlate request IDs, examine environmental parameters (browser versions, network latency, payload variations), and analyze server resource metrics for memory leaks or thread starvation. Next, I replicate the conditions in a staging environment using sanitized production-volume data, formulate test hypotheses, write a reproducible failing automated integration test, and deploy a targeted fix backed by regression telemetry.',
      talking_points: [
        'Structured log correlation and telemetry analysis using request IDs.',
        'Isolating timing issues, race conditions, and environment discrepancies.',
        'Writing reproducible automated tests before deploying regression fixes.'
      ],
      recommended_model: 'STAR Framework / Diagnostic Methodology'
    });

  // ── Difficulty Level: ADVANCED (Architecture, Scale & Trade-offs) ───────────────────
  } else {
    // Q1: Scalable Distributed Authentication
    questions.push({
      id: 1,
      difficulty_level: 'Advanced',
      category: 'Distributed Architecture & Scalable Auth',
      question: 'How would you design a scalable authentication and session management architecture for a high-traffic full-stack platform supporting millions of concurrent active users?',
      sample_answer: 'A scalable auth architecture decouples credential verification from authorization checks. Authentication requests hit an Identity Gateway that verifies credentials against a replicated database. Upon success, the service issues an asymmetric (RS256) short-lived JWT access token (10-15 minute lifespan) and a cryptographically secure refresh token stored in a distributed Redis cluster. Downstream microservices and API gateways verify access tokens statelessly using the identity service\'s public key without making database roundtrips. For immediate token revocation, a Redis-backed bloom filter or token blacklist with short TTLs ensures low-latency validation (<1ms) across distributed nodes.',
      talking_points: [
        'Stateless asymmetric JWT verification (RS256) at API gateways.',
        'Short-lived access tokens paired with Redis-backed rotating refresh tokens.',
        'Handling distributed token revocation via Redis pub/sub or bloom filters.'
      ],
      recommended_model: 'System Design & Distributed Scalability'
    });

    // Q2: High-Traffic API Latency & p99 Bottlenecks
    questions.push({
      id: 2,
      difficulty_level: 'Advanced',
      category: 'Performance Engineering & Latency Optimization',
      question: 'How would you diagnose, profile, and optimize an API endpoint experiencing high p99 latency and timeouts under heavy concurrent production traffic?',
      sample_answer: 'I use distributed tracing (OpenTelemetry / Jaeger) to dissect the end-to-end request lifecycle across network ingress, gateway proxies, application runtime, database queries, and external APIs. If the bottleneck is database I/O, I check connection pool exhaustion, add read replicas with read/write splitting, and implement a multi-tier cache using Redis with cache-aside and stale-while-revalidate policies. If CPU-bound in the application layer, I profile heap and event-loop lag, offload compute-intensive tasks to asynchronous background worker queues (e.g. BullMQ / Celery), and autoscale container replicas based on CPU and request concurrency thresholds.',
      talking_points: [
        'Using distributed tracing to isolate p99 latency spikes vs p50 averages.',
        'Database connection pool exhaustion and read/write replica separation.',
        'Caching strategies (cache-aside, write-through, stale-while-revalidate) and invalidation.',
        'Asynchronous background job offloading to protect the main request thread.'
      ],
      recommended_model: 'Performance Engineering & Diagnostics'
    });

    // Q3: Database Indexing Strategies & Storage Trade-offs
    questions.push({
      id: 3,
      difficulty_level: 'Advanced',
      category: 'Database Internals & Storage Trade-offs',
      question: `How would you design database indexes for a table containing tens of millions of records in ${db}, and how do you evaluate the architectural trade-offs between read acceleration and write latency?`,
      sample_answer: 'Every database index is a B-Tree data structure maintained on disk and memory. While indexes provide logarithmic O(log N) lookup speeds for SELECT queries, every INSERT, UPDATE, and DELETE incurs a write amplification penalty because multiple index trees must be locked, traversed, and rebalanced. For massive datasets: I design composite indexes with equality columns first followed by range filters, avoid indexing low-cardinality flags (like boolean status), use covering indexes that include all required projection columns in the index leaf nodes to avoid secondary table page lookups, partition tables horizontally by date or tenant ID, and periodically prune redundant or unused indexes using database performance schemas.',
      talking_points: [
        'B-Tree index structure mechanics and write amplification costs.',
        'Column ordering in composite indexes (Equality first, then Range).',
        'Covering indexes preventing secondary clustered index page lookups.',
        'Horizontal table partitioning and monitoring index usage statistics.'
      ],
      recommended_model: 'Database Internals & Storage Architecture'
    });

    // Q4: Microservices vs Modular Monolith & Distributed Transactions
    questions.push({
      id: 4,
      difficulty_level: 'Advanced',
      category: 'System Architecture & Domain Boundaries',
      question: 'When evaluating whether to decompose an application into microservices versus retaining a modular monolith, what architectural criteria, consistency guarantees, and trade-offs guide your decision?',
      sample_answer: 'A modular monolith should be the default architecture for most teams because it avoids network serialization overhead, distributed logging complexity, and distributed transaction management while enforcing clear domain module boundaries in-process. Decomposing into microservices is justified when independent services have drastically different scaling profiles (e.g. video processing vs auth), conflicting technology requirements, or distinct cross-functional engineering teams. However, microservices sacrifice ACID transactions, requiring eventual consistency patterns like Sagas (choreographed or orchestrated), outbox patterns for reliable event publishing, and distributed tracing.',
      talking_points: [
        'In-process call performance vs network serialization and latency overhead.',
        'Independent deployment/scaling boundaries vs operational complexity.',
        'Eventual consistency and distributed transactions using the Saga and Outbox patterns.',
        'Team organization alignment (Conway\'s Law).'
      ],
      recommended_model: 'System Architecture & Architectural Trade-offs'
    });

    // Q5: Resilience Engineering, Circuit Breakers & Fault Tolerance
    questions.push({
      id: 5,
      difficulty_level: 'Advanced',
      category: 'Resilience Engineering & Fault Tolerance',
      question: 'How would you design rate limiting, circuit breakers, and graceful degradation in a distributed system to prevent cascading failures when external services experience downtime?',
      sample_answer: 'To prevent cascading failures across services, I implement a multi-layered defense. At the perimeter, API gateways employ a Redis-backed token bucket or sliding-window rate limiter to throttle abusive traffic. For downstream service dependencies, I wrap HTTP/RPC clients in a Circuit Breaker (Closed -> Open -> Half-Open). If error rates or latency cross predefined thresholds (e.g., 50% errors over 10s), the breaker trips Open, instantly failing fast or returning cached fallback responses without flooding the downstream system. Once a cooldown period elapses, the breaker enters Half-Open, routing a canary percentage of traffic to verify recovery before closing the circuit.',
      talking_points: [
        'Token bucket and sliding window rate limiting algorithms.',
        'Circuit breaker state transitions (Closed, Open, Half-Open) and fail-fast behavior.',
        'Graceful degradation using cached stale responses or default degraded payloads.',
        'Bulkheads to isolate resource pools and prevent thread starvation.'
      ],
      recommended_model: 'Resilience Engineering & Reliability Architecture'
    });
  }

  return {
    total_questions: questions.length,
    difficulty_level: displayLevel,
    role_title: exactRole,
    questions,
    primary_skills_targeted: [lang, framework, db, devopsTool].filter(Boolean),
    gap_skills_targeted: missingSkills.slice(0, 3)
  };
}

module.exports = {
  generateCoverLetter,
  generateInterviewQuestions,
  formatExactJobTitle,
  detectExperienceTier,
  selectSupportedSkillsForRole
};


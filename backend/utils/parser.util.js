// backend/utils/parser.util.js
// -------------------------------------------------------
// Text extraction engine for PDF and DOCX resume files
// -------------------------------------------------------
'use strict';

const fs = require('fs');
const mammoth = require('mammoth');
const { PDFParse } = require('pdf-parse');

/**
 * Normalizes extracted text: removes non-printable characters,
 * normalizes linebreaks, and reduces multiple whitespaces.
 * @param {string} raw
 * @returns {string}
 */
function cleanText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts plain text from a PDF or DOCX file on disk.
 * @param {string} filePath - Absolute or relative path to the uploaded file
 * @param {string} fileType - 'pdf' | 'docx'
 * @returns {Promise<{ text: string, wordCount: number }>}
 */
async function extractTextFromResume(filePath, fileType) {
  const normalizedType = fileType.toLowerCase();
  let rawText = '';

  if (normalizedType === 'pdf') {
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText();
      rawText = parsed.text || '';
    } finally {
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
    }
  } else if (normalizedType === 'docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    rawText = result.value || '';
  } else {
    throw new Error(`Unsupported file type: ${fileType}. Only PDF and DOCX are allowed.`);
  }

  const text = cleanText(rawText);
  const wordCount = text.length > 0 ? text.split(/\s+/).filter(Boolean).length : 0;

  return { text, wordCount };
}

module.exports = { extractTextFromResume, cleanText };

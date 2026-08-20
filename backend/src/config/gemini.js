// src/config/gemini.js
// ============================================================
// Google Gemini 1.5 Flash Client Configuration
// ============================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './env.js';

let genAI = null;

export function getGeminiClient() {
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export function isGeminiConfigured() {
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  return Boolean(apiKey && apiKey.trim().length > 0);
}

/**
 * Invokes Gemini 1.5 Flash with system instructions and user prompt
 * @param {string} prompt - User / Analysis prompt
 * @param {string} [systemInstruction] - System Persona / Rules
 * @param {object} [options] - Options (temperature, maxOutputTokens, etc.)
 */
export async function callGeminiFlash(prompt, systemInstruction = '', options = {}) {
  const client = getGeminiClient();
  if (!client) {
    return { available: false, error: 'GEMINI_API_KEY is not configured.' };
  }

  try {
    const modelName = options.model || 'gemini-3.6-flash';
    const model = client.getGenerativeModel({
      model: modelName,
      systemInstruction: systemInstruction || 'You are DecisionOS AI, a world-class Chief Financial & Business Operations Intelligence Analyst. Provide concise, data-driven, strategic recommendations.',
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxOutputTokens ?? 1500,
        ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Approximate token count: 1 token ≈ 4 characters
    const estimatedPromptTokens = Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = Math.ceil(text.length / 4);
    const totalTokens = estimatedPromptTokens + estimatedOutputTokens;

    return {
      available: true,
      text,
      tokensUsed: totalTokens,
      model: 'gemini-1.5-flash',
      provider: 'google',
    };
  } catch (err) {
    console.warn('[Gemini Client] ⚠️  API Call failed, falling back to heuristic engine:', err.message);
    return {
      available: false,
      error: err.message,
    };
  }
}

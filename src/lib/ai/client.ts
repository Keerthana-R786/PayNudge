/**
 * Gemini AI client (server-only)
 * Never import this file in client components.
 */

import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || '';

let clientInstance: GoogleGenAI | null = null;

/**
 * Get or create the Gemini client instance (lazy initialization)
 */
function getClient(): GoogleGenAI {
  if (!clientInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    clientInstance = new GoogleGenAI({ apiKey });
  }
  return clientInstance;
}

/**
 * Keywords that Gemini does not accept in JSON schema
 */
const UNSUPPORTED_KEYWORDS = [
  '$schema',
  'additionalProperties',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'format',
  'pattern',
];

/**
 * Strip constraint keywords that Gemini does not support from JSON schema.
 * Keeps only structure: field names, types, required, array items, descriptions.
 * Recursively cleans nested objects and arrays.
 */
export function stripConstraintKeywords(schema: any): any {
  if (typeof schema !== 'object' || schema === null) {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map(item => stripConstraintKeywords(item));
  }

  const cleaned: any = {};

  for (const key in schema) {
    if (UNSUPPORTED_KEYWORDS.includes(key)) {
      // Skip unsupported keywords
      continue;
    }

    const value = schema[key];

    if (typeof value === 'object' && value !== null) {
      cleaned[key] = stripConstraintKeywords(value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Check if an error should trigger a retry (503, 429, or network timeout)
 */
function shouldRetry(error: any): boolean {
  if (!error) return false;
  
  const message = error.message || '';
  const code = error.code || '';
  
  // Retry on 503 (service unavailable), 429 (rate limit), or network timeouts
  return (
    message.includes('503') ||
    message.includes('UNAVAILABLE') ||
    message.includes('429') ||
    message.includes('rate limit') ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND'
  );
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Attempt to generate content with a specific model
 */
async function attemptGeneration(
  modelName: string,
  prompt: string,
  looseSchema: any
): Promise<string> {
  const client = getClient();
  
  const response = await client.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: looseSchema,
    },
  });

  if (!response.text) {
    throw new Error('No response text from AI model');
  }

  return response.text;
}

/**
 * Generate structured JSON output from a prompt using a Zod schema.
 * Includes retry logic for transient failures (503, 429, network timeouts).
 * @param prompt - The input prompt text
 * @param schema - Zod schema for validation
 * @param timeoutMs - Timeout in milliseconds (default: 25000 to allow for retries)
 * @returns Parsed and validated result
 */
export async function generateStructuredOutput<T extends z.ZodType>(
  prompt: string,
  schema: T,
  timeoutMs = 25000
): Promise<z.infer<T>> {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('AI request timed out')), timeoutMs)
  );

  const requestPromise = (async () => {
    try {
      const client = getClient();
      
      // Convert Zod schema to JSON schema
      const jsonSchema = zodToJsonSchema(schema, { $refStrategy: 'none' });
      
      // Strip constraint keywords that Gemini doesn't support
      const looseSchema = stripConstraintKeywords(jsonSchema);
      
      let lastError: any;
      let responseText: string | null = null;
      
      // Retry strategy: 3 attempts total with exponential backoff (0ms, 1000ms, 3000ms)
      const delays = [0, 1000, 3000];
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (delays[attempt] > 0) {
            await sleep(delays[attempt]);
          }
          
          responseText = await attemptGeneration(GEMINI_MODEL, prompt, looseSchema);
          console.log(`AI response received from model: ${GEMINI_MODEL}`);
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error;
          
          // Only retry on specific errors
          if (shouldRetry(error) && attempt < 2) {
            console.log(`AI attempt ${attempt + 1} failed with retryable error, retrying...`);
            continue;
          }
          
          // Don't retry on non-retryable errors (400, 401, 403, etc.)
          if (attempt === 2 || !shouldRetry(error)) {
            break;
          }
        }
      }
      
      // If main model failed with 503/429 after retries, try fallback model
      if (!responseText && GEMINI_FALLBACK_MODEL && shouldRetry(lastError)) {
        console.log(`Main model failed, trying fallback model: ${GEMINI_FALLBACK_MODEL}`);
        try {
          responseText = await attemptGeneration(GEMINI_FALLBACK_MODEL, prompt, looseSchema);
          console.log(`AI response received from fallback model: ${GEMINI_FALLBACK_MODEL}`);
        } catch (fallbackError) {
          console.error('Fallback model also failed:', fallbackError instanceof Error ? fallbackError.message : 'Unknown error');
          throw lastError; // Throw original error, not fallback error
        }
      }
      
      if (!responseText) {
        throw lastError;
      }

      const parsed = JSON.parse(responseText);
      // Validate with original Zod schema
      return schema.parse(parsed);
    } catch (error) {
      console.error('AI generation error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  })();

  return Promise.race([requestPromise, timeoutPromise]) as Promise<z.infer<T>>;
}

/**
 * Get the model name being used
 */
export function getModelName(): string {
  return GEMINI_MODEL;
}

/**
 * List available models (for debugging)
 */
export async function listModels(): Promise<string[]> {
  try {
    const client = getClient();
    const modelsPager = await client.models.list();
    const modelsList: string[] = [];
    
    for await (const model of modelsPager) {
      modelsList.push(model.name || 'unknown');
    }
    
    return modelsList;
  } catch (error) {
    console.error('Error listing models:', error);
    return [];
  }
}

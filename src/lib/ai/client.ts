/**
 * Gemini AI client (server-only)
 * Never import this file in client components.
 */

import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

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
 * Strip fields that Gemini does not support from JSON schema
 */
function stripUnsupportedFields(schema: any): any {
  const cleaned = { ...schema };
  
  // Remove $schema field (Gemini doesn't accept it)
  delete cleaned.$schema;
  
  // Remove additionalProperties from root (Gemini may reject it)
  if (cleaned.additionalProperties !== undefined) {
    delete cleaned.additionalProperties;
  }
  
  // Recursively clean nested objects
  if (cleaned.properties && typeof cleaned.properties === 'object') {
    for (const key in cleaned.properties) {
      if (typeof cleaned.properties[key] === 'object') {
        cleaned.properties[key] = stripUnsupportedFields(cleaned.properties[key]);
      }
    }
  }
  
  // Clean array items
  if (cleaned.items && typeof cleaned.items === 'object') {
    cleaned.items = stripUnsupportedFields(cleaned.items);
  }
  
  return cleaned;
}

/**
 * Generate structured JSON output from a prompt using a Zod schema.
 * @param prompt - The input prompt text
 * @param schema - Zod schema for validation
 * @param timeoutMs - Timeout in milliseconds (default: 20000)
 * @returns Parsed and validated result
 */
export async function generateStructuredOutput<T extends z.ZodType>(
  prompt: string,
  schema: T,
  timeoutMs = 20000
): Promise<z.infer<T>> {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('AI request timed out after 20 seconds')), timeoutMs)
  );

  const requestPromise = (async () => {
    try {
      const client = getClient();
      
      // Convert Zod schema to JSON schema
      const jsonSchema = zodToJsonSchema(schema, { $refStrategy: 'none' });
      
      // Strip unsupported fields
      const cleanedSchema = stripUnsupportedFields(jsonSchema);
      
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: cleanedSchema,
        },
      });

      if (!response.text) {
        throw new Error('No response text from AI model');
      }

      const parsed = JSON.parse(response.text);
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

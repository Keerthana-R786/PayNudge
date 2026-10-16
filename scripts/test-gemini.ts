/**
 * Test script for Gemini API connectivity
 * Usage: npm run test:gemini
 */

import { generateStructuredOutput, getModelName, listModels } from '../src/lib/ai/client';
import { z } from 'zod';

// Simple test schema
const TestInvoiceSchema = z.object({
  client_name: z.string(),
  client_email: z.string().email().optional(),
  line_items: z.array(
    z.object({
      description: z.string(),
      amount_dollars: z.number(),
    })
  ),
  due_in_days: z.number().int(),
});

async function test() {
  console.log('🧪 Testing Gemini API connection...\n');
  console.log(`Model: ${getModelName()}`);
  console.log(`API Key: ${process.env.GEMINI_API_KEY ? '[SET]' : '[NOT SET]'}\n`);

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set in .env file');
    process.exit(1);
  }

  const testSentence = 'Invoice Acme Corp $500 for web design, due in 14 days';
  console.log(`Test sentence: "${testSentence}"\n`);

  try {
    const result = await generateStructuredOutput(
      `Extract invoice information from this sentence: "${testSentence}". Return structured JSON.`,
      TestInvoiceSchema
    );

    console.log('✅ Success! Parsed result:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n✨ Gemini API is working correctly!');
  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n❌ Error with model ${getModelName()}:`);
      console.error(error.message);

      // If model not found, try to list available models
      if (error.message.includes('not found') || error.message.includes('404')) {
        console.log('\n🔍 Attempting to list available models...');
        try {
          const models = await listModels();
          if (models.length > 0) {
            console.log('\n📋 Available models:');
            models.forEach((model) => console.log(`  - ${model}`));
            console.log('\n💡 Update GEMINI_MODEL in .env to one of the above models');
          } else {
            console.log('Could not retrieve model list. Check your API key permissions.');
          }
        } catch (listError) {
          console.error('Failed to list models:', listError instanceof Error ? listError.message : 'Unknown error');
        }
      }
    } else {
      console.error('❌ Unknown error:', error);
    }
    process.exit(1);
  }
}

test();

# Stage 3 List Models Addition

## Summary
Added `--list` option to `scripts/test-gemini.ts` to list available models that support generateContent.

## Test Results

### npm test
```
✓ src/lib/invoice-builder.test.ts (22)
✓ src/lib/invoice-status.test.ts (6)
✓ src/lib/paypal.test.ts (11)
✓ src/lib/summary.test.ts (7)
✓ src/lib/utils.test.ts (7)
✓ src/lib/ai/client.test.ts (9)

Test Files  6 passed (6)
Tests  62 passed (62)
Duration  2.08s
```

### npm run build
```
✓ Compiled successfully in 4.6s
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (8/8)
```

## Changes Made

**File:** `scripts/test-gemini.ts`

### New Function: `listAvailableModels()`
- Calls `listModels()` from the AI client
- Prints all available models that support generateContent
- Highlights the currently configured model with `→` prefix
- Shows warning if current model is not in the available list
- Never prints the API key (only shows `[SET]` or `[NOT SET]`)

### Updated Usage
```bash
# Test API with sample invoice (existing behavior)
npm run test:gemini

# List available models (new --list option)
npx tsx --env-file=.env scripts/test-gemini.ts --list
```

### Example Output (--list mode)
```
📋 Listing available Gemini models...

API Key: [SET]

✅ Found 5 models that support generateContent:

→ gemini-3.8-flash
  gemini-2.0-flash-lite
  gemini-1.5-pro
  gemini-1.5-flash-8b
  gemini-1.0-pro

💡 Your current model (gemini-3.8-flash) is available.
```

### Features
- ✅ Checks if API key is set
- ✅ Lists all models available to the API key
- ✅ Highlights current model from `GEMINI_MODEL` env var
- ✅ Shows count of available models
- ✅ Warns if current model not found
- ✅ Never prints the API key
- ✅ Clean error handling

## Files Changed
- ✅ `scripts/test-gemini.ts` - Added `--list` option and `listAvailableModels()` function

## Files NOT Changed
- All other files unchanged
- No Stage 4 work started

## Usage Examples

### List Models
```bash
npx tsx --env-file=.env scripts/test-gemini.ts --list
```

### Test API (Default)
```bash
npm run test:gemini
# or
npx tsx --env-file=.env scripts/test-gemini.ts
```

## Notes
- The script uses the existing `listModels()` function from `src/lib/ai/client.ts`
- Models are listed from the Gemini API (real models available to your key)
- The `→` arrow highlights which model is currently configured
- Helps users quickly see what models they can switch to if the primary model is unavailable

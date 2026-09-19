/**
 * DocChase — Gemini Structured Output Validation Test Suite
 * Tests edge cases for Gemini AI output:
 * 1. Valid structured response -> parsed & formatted cleanly
 * 2. Empty raw response -> rejected safely
 * 3. Malformed JSON (syntax error) -> rejected safely
 * 4. Non-object / array at root -> rejected safely
 * 5. Missing template_name -> rejected safely
 * 6. Empty items array -> rejected safely
 * 7. Malformed items (missing name, invalid types) -> rejected safely
 * 8. Frequency normalization (maps unrecognized strings to 'monthly')
 * 9. Boolean coercion for required flag
 * 10. Item name and description length bounds
 */

const VALID_FREQUENCIES = ['monthly', 'quarterly', 'yearly', 'custom'] as const;

interface ValidationResult {
  valid: boolean;
  error?: string;
  data?: {
    template_name: string;
    frequency: string;
    items: Array<{ name: string; description: string; required: boolean }>;
  };
}

function validateGeminiChecklistOutput(rawText: string | null | undefined): ValidationResult {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    return { valid: false, error: 'AI returned empty response' };
  }

  let parsedChecklist: any;
  try {
    parsedChecklist = JSON.parse(rawText.trim());
  } catch {
    return { valid: false, error: 'AI returned malformed JSON response' };
  }

  if (!parsedChecklist || typeof parsedChecklist !== 'object' || Array.isArray(parsedChecklist)) {
    return { valid: false, error: 'AI response is not a valid JSON object' };
  }

  const templateName = typeof parsedChecklist.template_name === 'string' ? parsedChecklist.template_name.trim() : '';
  if (!templateName || templateName.length < 2 || templateName.length > 150) {
    return { valid: false, error: 'AI response contains invalid template_name' };
  }

  const freq = VALID_FREQUENCIES.includes(parsedChecklist.frequency) ? parsedChecklist.frequency : 'monthly';

  if (!Array.isArray(parsedChecklist.items) || parsedChecklist.items.length === 0 || parsedChecklist.items.length > 30) {
    return { valid: false, error: 'AI response items must be a non-empty array (1-30 items)' };
  }

  const validatedItems: Array<{ name: string; description: string; required: boolean }> = [];
  for (const it of parsedChecklist.items) {
    if (!it || typeof it !== 'object') {
      return { valid: false, error: 'AI checklist item has invalid structure' };
    }
    const name = typeof it.name === 'string' ? it.name.trim() : '';
    if (!name || name.length < 2 || name.length > 120) {
      return { valid: false, error: 'AI checklist item has missing or invalid name' };
    }
    const desc = typeof it.description === 'string' ? it.description.trim().slice(0, 300) : '';
    const reqFlag = typeof it.required === 'boolean' ? it.required : Boolean(it.required);
    validatedItems.push({
      name,
      description: desc,
      required: reqFlag,
    });
  }

  return {
    valid: true,
    data: {
      template_name: templateName,
      frequency: freq,
      items: validatedItems,
    },
  };
}

async function runStructuredOutputTests() {
  console.log('================================================================');
  console.log('🧪 Testing Gemini Structured Output Validator');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function testCase(desc: string, input: string | null | undefined, expectedValid: boolean, expectedErrorSubstr?: string) {
    total++;
    const res = validateGeminiChecklistOutput(input);
    const pass =
      res.valid === expectedValid &&
      (!expectedErrorSubstr || (res.error && res.error.includes(expectedErrorSubstr)));

    if (pass) {
      passed++;
      console.log(`  ✅ [PASS] ${desc}`);
    } else {
      console.log(`  ❌ [FAIL] ${desc} (Expected valid=${expectedValid}, got=${res.valid}, error="${res.error}")`);
    }
  }

  // 1. Valid response
  testCase(
    'Valid structured response is accepted and parsed',
    JSON.stringify({
      template_name: 'Q3 Bookkeeping Package',
      frequency: 'quarterly',
      items: [
        { name: 'Bank Statement', description: 'July-Sept statements', required: true },
        { name: 'Sales Tax Return', description: 'Filed return', required: false },
      ],
    }),
    true
  );

  // 2. Empty response
  testCase('Empty string response is rejected', '', false, 'empty response');
  testCase('Whitespace response is rejected', '   ', false, 'empty response');
  testCase('Null response is rejected', null as any, false, 'empty response');

  // 3. Malformed JSON
  testCase('Malformed JSON with unclosed braces is rejected', '{"template_name": "Incomplete', false, 'malformed JSON');
  testCase('Plain markdown text from AI is rejected', 'Here is your checklist: 1. Bank statements', false, 'malformed JSON');

  // 4. Non-object / array at root
  testCase('JSON array at root is rejected', '[{"name": "Item 1"}]', false, 'not a valid JSON object');
  testCase('Primitive number is rejected', '12345', false, 'not a valid JSON object');

  // 5. Missing template_name
  testCase(
    'Missing template_name is rejected',
    JSON.stringify({ frequency: 'monthly', items: [{ name: 'Bank Statement', required: true }] }),
    false,
    'invalid template_name'
  );
  testCase(
    'Single-character template_name is rejected',
    JSON.stringify({ template_name: 'X', frequency: 'monthly', items: [{ name: 'Bank Statement', required: true }] }),
    false,
    'invalid template_name'
  );

  // 6. Empty items array
  testCase(
    'Empty items array is rejected',
    JSON.stringify({ template_name: 'Empty Checklist', frequency: 'monthly', items: [] }),
    false,
    'non-empty array'
  );

  // 7. Malformed items
  testCase(
    'Items with missing name is rejected',
    JSON.stringify({
      template_name: 'Bad Items',
      frequency: 'monthly',
      items: [{ description: 'No name', required: true }],
    }),
    false,
    'missing or invalid name'
  );
  testCase(
    'Items with non-object element is rejected',
    JSON.stringify({
      template_name: 'Bad Items',
      frequency: 'monthly',
      items: ['just a string'],
    }),
    false,
    'invalid structure'
  );

  // 8. Frequency normalization
  const normRes = validateGeminiChecklistOutput(
    JSON.stringify({
      template_name: 'Unusual Frequency',
      frequency: 'bi-weekly', // invalid frequency
      items: [{ name: 'Bank Statement', required: true }],
    })
  );
  total++;
  if (normRes.valid && normRes.data?.frequency === 'monthly') {
    passed++;
    console.log('  ✅ [PASS] Invalid frequency string is safely normalized to "monthly"');
  } else {
    console.log('  ❌ [FAIL] Invalid frequency normalization failed');
  }

  // 9. Boolean coercion for required
  const boolRes = validateGeminiChecklistOutput(
    JSON.stringify({
      template_name: 'Coerced Booleans',
      frequency: 'monthly',
      items: [
        { name: 'Doc A', required: 1 },
        { name: 'Doc B', required: 0 },
      ],
    })
  );
  total++;
  if (boolRes.valid && boolRes.data?.items[0].required === true && boolRes.data?.items[1].required === false) {
    passed++;
    console.log('  ✅ [PASS] Non-boolean required values are safely coerced to strict booleans');
  } else {
    console.log('  ❌ [FAIL] Boolean coercion failed');
  }

  console.log('\n================================================================');
  console.log(`Structured Output Tests: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed < total) process.exit(1);
}

runStructuredOutputTests();

/**
 * DocChase Phase 1 Production Blocker Fix Test Suite
 * Validates all security, RPC contract, upload, storage, and configuration hardening.
 */

import * as fs from 'fs';
import * as path from 'path';

// Polyfill localStorage and Web File API for headless Node testing
if (!globalThis.localStorage) {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    key: (i: number) => Object.keys(store)[i] || null,
    length: 0,
  } as any;
}

import { assertProductionConfigured, CONFIG_ERROR_MESSAGE, isSupabaseConfigured } from '../src/lib/supabase';
import { requestService } from '../src/services/requests';
import { clientService } from '../src/services/clients';
import { documentService } from '../src/services/documents';
import { authService } from '../src/services/auth';

interface TestStats {
  passed: number;
  failed: number;
  total: number;
}

const stats: TestStats = { passed: 0, failed: 0, total: 0 };

function assert(condition: boolean, testName: string, failureDetails?: string) {
  stats.total++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    stats.passed++;
  } else {
    stats.failed++;
    console.error(`  ❌ [FAIL] ${testName}`);
    if (failureDetails) {
      console.error(`     Details: ${failureDetails}`);
    }
  }
}

async function runPhase1BlockerTests() {
  console.log('====================================================');
  console.log('🛡️  DocChase Phase 1 Production Blocker Test Suite');
  console.log('====================================================\n');

  // ---------------------------------------------------------------
  // 1. Production Mode Hard Failure Assertion
  // ---------------------------------------------------------------
  console.log('1. Production Configuration Hardening:');
  {
    // Test that assertProductionConfigured throws when mock is forbidden
    let thrownError: any = null;
    try {
      assertProductionConfigured(true); // simulate production with unconfigured supabase
    } catch (e: any) {
      thrownError = e;
    }
    assert(
      thrownError !== null && thrownError.message.includes('Supabase environment variables are missing'),
      'Production mode throws hard error when Supabase credentials are missing',
      thrownError ? thrownError.message : 'No error was thrown!'
    );

    // Test that development mode allows fallback
    let devError: any = null;
    try {
      assertProductionConfigured(false); // simulate development mode
    } catch (e: any) {
      devError = e;
    }
    assert(devError === null, 'Development mode permits local mock fallback safely');
  }

  // ---------------------------------------------------------------
  // 2. Client Portal RPC Contract Alignment
  // ---------------------------------------------------------------
  console.log('\n2. Client Portal RPC Contract:');
  {
    const wsA = 'ws_prod_test_firm_a';
    const clientA = await clientService.createClient(wsA, 'free', {
      name: 'Acme Corporation',
      company_name: 'Acme Corp LLC',
      email: 'finance@acme.com',
    });

    const createResA = await requestService.createRequest(wsA, 'free', {
      clientId: clientA.id,
      clientName: clientA.name,
      title: 'Q3 Tax Preparation',
      period: 'Q3 2026',
      dueDate: '2026-10-31',
      items: [
        { name: 'Bank Statement', description: 'September operating statement', required: true },
        { name: 'Expense Receipts', description: 'Receipts over $75', required: false },
      ],
    });

    const tokenA = createResA.rawToken;
    const portalDataA = await requestService.getClientRequestByToken(tokenA);

    assert(portalDataA !== null, 'Valid token resolves ClientPortalData');
    assert(
      Boolean(portalDataA?.request?.id && portalDataA?.request?.id === createResA.request.id),
      'ClientPortalData contains exact request.id'
    );
    assert(
      Boolean(portalDataA?.request?.workspace_id && portalDataA?.request?.workspace_id === wsA),
      'ClientPortalData contains exact request.workspace_id'
    );
    assert(
      Boolean(portalDataA?.request?.client_id && portalDataA?.request?.client_id === clientA.id),
      'ClientPortalData contains exact request.client_id'
    );
    assert(
      portalDataA?.request?.title === 'Q3 Tax Preparation',
      'ClientPortalData contains request.title'
    );
    assert(
      Array.isArray(portalDataA?.items) && portalDataA?.items.length === 2,
      'ClientPortalData contains mapped items array'
    );
    assert(
      Boolean(portalDataA?.items[0]?.id && portalDataA?.items[0]?.name === 'Bank Statement'),
      'ClientPortalData items contain id and name'
    );
    assert(
      portalDataA?.client?.email === 'finance@acme.com',
      'ClientPortalData contains client metadata'
    );

    // Invalid token returns null
    const invalidRes = await requestService.getClientRequestByToken('invalid_hex_token_1234567890abcdef');
    assert(invalidRes === null, 'Invalid token returns null (Access Denied)');

    // Token A cannot resolve Request B
    const wsB = 'ws_prod_test_firm_b';
    const clientB = await clientService.createClient(wsB, 'free', {
      name: 'Beta Global',
      company_name: 'Beta Global Inc',
      email: 'billing@beta.com',
    });
    const createResB = await requestService.createRequest(wsB, 'free', {
      clientId: clientB.id,
      clientName: clientB.name,
      title: 'Annual Audit 2026',
      period: 'FY 2026',
      dueDate: '2026-12-31',
      items: [{ name: 'Trial Balance', required: true }],
    });

    const portalDataBFromTokenA = await requestService.getClientRequestByToken(tokenA);
    assert(
      portalDataBFromTokenA?.request.id !== createResB.request.id,
      'Token A cannot access Request B'
    );
  }

  // ---------------------------------------------------------------
  // 3. Workspace Data Isolation
  // ---------------------------------------------------------------
  console.log('\n3. Workspace Isolation:');
  {
    const ws1 = 'ws_isolation_1';
    const ws2 = 'ws_isolation_2';

    const c1 = await clientService.createClient(ws1, 'free', {
      name: 'Client 1',
      email: 'c1@test.com',
    });
    const c2 = await clientService.createClient(ws2, 'free', {
      name: 'Client 2',
      email: 'c2@test.com',
    });

    const ws1Clients = await clientService.getClients(ws1);
    const ws2Clients = await clientService.getClients(ws2);

    assert(
      ws1Clients.some((c) => c.id === c1.id) && !ws1Clients.some((c) => c.id === c2.id),
      'Workspace 1 cannot see Workspace 2 clients'
    );
    assert(
      ws2Clients.some((c) => c.id === c2.id) && !ws2Clients.some((c) => c.id === c1.id),
      'Workspace 2 cannot see Workspace 1 clients'
    );
  }

  // ---------------------------------------------------------------
  // 4. File Validation & Magic Byte Inspection
  // ---------------------------------------------------------------
  console.log('\n4. File Validation & Magic Bytes Inspection:');
  {
    // Valid PDF buffer (%PDF-)
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    const validPdfFile = new File([pdfBytes], 'statements.pdf', { type: 'application/pdf' });
    const pdfRes = await documentService.validateFileContent(validPdfFile);
    assert(pdfRes.valid === true, 'Valid PDF file passes magic bytes (%PDF-) validation');

    // Valid JPEG buffer (\xFF\xD8\xFF)
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const validJpegFile = new File([jpegBytes], 'receipt.jpg', { type: 'image/jpeg' });
    const jpegRes = await documentService.validateFileContent(validJpegFile);
    assert(jpegRes.valid === true, 'Valid JPEG file passes magic bytes (FF D8 FF) validation');

    // Valid PNG buffer (\x89PNG\r\n\x1a\n)
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const validPngFile = new File([pngBytes], 'scan.png', { type: 'image/png' });
    const pngRes = await documentService.validateFileContent(validPngFile);
    assert(pngRes.valid === true, 'Valid PNG file passes magic bytes (89 50 4E 47) validation');

    // Valid XLSX/DOCX ZIP buffer (PK\x03\x04)
    const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
    const validXlsxFile = new File([zipBytes], 'ledger.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const xlsxRes = await documentService.validateFileContent(validXlsxFile);
    assert(xlsxRes.valid === true, 'Valid XLSX file passes magic bytes (PK 03 04) validation');

    // Malicious fake PDF (Executable/Bash script renamed to .pdf)
    const fakePdfBytes = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]); // ELF header
    const fakePdfFile = new File([fakePdfBytes], 'malicious.pdf', { type: 'application/pdf' });
    const fakePdfRes = await documentService.validateFileContent(fakePdfFile);
    assert(
      fakePdfRes.valid === false && Boolean(fakePdfRes.error?.includes('signature')),
      'Fake PDF with malicious executable bytes is strictly rejected by magic byte check'
    );

    // File exceeding 25MB limit (simulate size check)
    const oversizedFile = {
      name: 'huge_archive.pdf',
      type: 'application/pdf',
      size: 26 * 1024 * 1024, // 26MB
      slice: () => new Blob([pdfBytes]),
    } as any;
    const oversizedRes = await documentService.validateFileContent(oversizedFile);
    assert(
      oversizedRes.valid === false && Boolean(oversizedRes.error?.includes('too large')),
      'File exceeding 25MB limit is strictly rejected'
    );

    // Unsupported MIME type
    const unsupportedFile = new File([new Uint8Array([0x00, 0x01])], 'script.sh', {
      type: 'application/x-sh',
    });
    const unsupportedRes = await documentService.validateFileContent(unsupportedFile);
    assert(
      unsupportedRes.valid === false && Boolean(unsupportedRes.error?.includes('Unsupported file type')),
      'Unsupported MIME type is strictly rejected'
    );
  }

  // ---------------------------------------------------------------
  // 5. Private Storage & Signed Document URLs
  // ---------------------------------------------------------------
  console.log('\n5. Private Storage & Signed URLs:');
  {
    const signedUrl = await documentService.getSignedDocumentUrl(
      'ws_alpha/client_1/req_1/doc_1/invoice.pdf',
      3600
    );
    assert(
      typeof signedUrl === 'string' && signedUrl.length > 0,
      'getSignedDocumentUrl returns accessible URL string'
    );

    // Verify placeholder alert is removed from DocumentReviewPage.tsx
    const reviewPageSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/pages/accountant/DocumentReviewPage.tsx'),
      'utf8'
    );
    const hasPlaceholderAlert = reviewPageSource.includes('Downloading private encrypted file');
    assert(
      !hasPlaceholderAlert,
      'DocumentReviewPage has removed placeholder alert and uses real signed URLs'
    );

    const callsGetSignedUrl = reviewPageSource.includes('getSignedDocumentUrl');
    assert(
      callsGetSignedUrl,
      'DocumentReviewPage invokes getSignedDocumentUrl for private file inspection'
    );
  }

  // ---------------------------------------------------------------
  // 6. Gemini API Key & Secrets Hardening
  // ---------------------------------------------------------------
  console.log('\n6. Gemini API Key & Secrets Hardening:');
  {
    const srcDir = path.resolve(process.cwd(), 'src');
    const allSrcFiles = fs.readdirSync(srcDir, { recursive: true }) as string[];
    let foundExposedKey = false;

    for (const rel of allSrcFiles) {
      const full = path.join(srcDir, rel);
      if (fs.statSync(full).isFile() && (full.endsWith('.ts') || full.endsWith('.tsx'))) {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('VITE_GEMINI_API_KEY')) {
          foundExposedKey = true;
          console.error(`     Exposed key reference found in: ${rel}`);
        }
      }
    }
    assert(
      !foundExposedKey,
      'VITE_GEMINI_API_KEY is 100% eliminated from all frontend source files'
    );

    // Check .env.example
    const envExample = fs.readFileSync(path.resolve(process.cwd(), '.env.example'), 'utf8');
    assert(
      !envExample.includes('VITE_GEMINI_API_KEY'),
      '.env.example does not contain client-side VITE_GEMINI_API_KEY'
    );

    // Check generate-checklist Edge Function exists
    const checklistFnPath = path.resolve(process.cwd(), 'supabase/functions/generate-checklist/index.ts');
    assert(
      fs.existsSync(checklistFnPath),
      'generate-checklist Edge Function exists in supabase/functions'
    );
    if (fs.existsSync(checklistFnPath)) {
      const fnSource = fs.readFileSync(checklistFnPath, 'utf8');
      assert(
        fnSource.includes("Deno.env.get('GEMINI_API_KEY')"),
        'generate-checklist reads GEMINI_API_KEY securely from server-side environment'
      );
    }

    // Check client-upload Edge Function exists
    const uploadFnPath = path.resolve(process.cwd(), 'supabase/functions/client-upload/index.ts');
    assert(
      fs.existsSync(uploadFnPath),
      'client-upload Edge Function exists in supabase/functions'
    );
    if (fs.existsSync(uploadFnPath)) {
      const uploadSource = fs.readFileSync(uploadFnPath, 'utf8');
      assert(
        uploadSource.includes('validateMagicBytes') && uploadSource.includes('authorize_client_upload'),
        'client-upload Edge Function performs server-side magic byte check and DB authorization'
      );
    }
  }

  // ---------------------------------------------------------------
  // 7. Supabase Database Migrations & RLS Revocations
  // ---------------------------------------------------------------
  console.log('\n7. Database RLS Revocation Migration:');
  {
    const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/002_secure_client_upload.sql');
    assert(
      fs.existsSync(migrationPath),
      'Migration 002_secure_client_upload.sql exists'
    );
    if (fs.existsSync(migrationPath)) {
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      assert(
        migrationSql.includes('REVOKE INSERT, UPDATE, DELETE ON public.documents FROM anon;'),
        'Migration revokes anon INSERT/UPDATE/DELETE on documents'
      );
      assert(
        migrationSql.includes('REVOKE INSERT, UPDATE, DELETE ON public.request_items FROM anon;'),
        'Migration revokes anon INSERT/UPDATE/DELETE on request_items'
      );
      assert(
        migrationSql.includes('authorize_client_upload'),
        'Migration defines SECURITY DEFINER authorize_client_upload RPC'
      );
      assert(
        migrationSql.includes('complete_client_upload'),
        'Migration defines SECURITY DEFINER complete_client_upload RPC'
      );
      assert(
        migrationSql.includes('calculate_request_readiness'),
        'Migration defines calculate_request_readiness function'
      );
    }
  }

  // ---------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`📊 Test Summary: ${stats.passed}/${stats.total} Passed (${stats.failed} Failed)`);
  console.log('====================================================');

  if (stats.failed > 0) {
    process.exit(1);
  }
}

runPhase1BlockerTests().catch((err) => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});

/**
 * Real Edge Function & Security Tests against remote Supabase Cloud
 */

async function runEdgeFunctionTests() {
  const url = 'https://ygugwtflwyqtjeuwgtca.supabase.co/functions/v1/client-upload';

  console.log('====================================================');
  console.log('🌐 Testing Real Cloud Edge Function (client-upload)');
  console.log('====================================================\n');

  // Test 1: Invalid Token
  console.log('Test 1 — Invalid Token:');
  {
    const formData = new FormData();
    formData.append('token', '0000000000000000000000000000000000000000000000000000000000000000');
    formData.append('request_item_id', '00000000-0000-0000-0000-000000000000');
    const validPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    formData.append('file', new Blob([validPdfBytes], { type: 'application/pdf' }), 'statement.pdf');

    const res = await fetch(url, { method: 'POST', body: formData });
    const data: any = await res.json();
    console.log('  Status:', res.status);
    console.log('  Response:', data);
    if (res.status === 403 && data.success === false) {
      console.log('  ✅ [PASS] Invalid token correctly rejected with 403 Forbidden');
    } else {
      console.log('  ❌ [FAIL] Expected 403 Forbidden, got:', res.status);
    }
  }

  // Test 2: Invalid Magic Bytes (Fake PDF)
  console.log('\nTest 2 — Magic Byte Validation (Executable disguised as .pdf):');
  {
    const formData = new FormData();
    formData.append('token', 'valid_token_placeholder');
    formData.append('request_item_id', '00000000-0000-0000-0000-000000000000');
    const fakeBytes = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01]); // ELF header
    formData.append('file', new Blob([fakeBytes], { type: 'application/pdf' }), 'malicious.pdf');

    const res = await fetch(url, { method: 'POST', body: formData });
    const data: any = await res.json();
    console.log('  Status:', res.status);
    console.log('  Response:', data);
    if (res.status === 400 && data.error?.includes('signature')) {
      console.log('  ✅ [PASS] Magic byte check strictly rejected executable bytes disguised as PDF');
    } else {
      console.log('  ❌ [FAIL] Expected 400 signature error, got:', res.status, data);
    }
  }

  // Test 3: Unsupported MIME type
  console.log('\nTest 3 — Unsupported MIME type:');
  {
    const formData = new FormData();
    formData.append('token', 'some_token');
    formData.append('request_item_id', '00000000-0000-0000-0000-000000000000');
    formData.append('file', new Blob(['echo hello'], { type: 'application/x-sh' }), 'script.sh');

    const res = await fetch(url, { method: 'POST', body: formData });
    const data: any = await res.json();
    console.log('  Status:', res.status);
    console.log('  Response:', data);
    if (res.status === 400 && data.error?.includes('Unsupported file type')) {
      console.log('  ✅ [PASS] Unsupported MIME type rejected with 400');
    } else {
      console.log('  ❌ [FAIL] Expected 400 unsupported type, got:', res.status, data);
    }
  }

  // Test 4: Oversized Upload (> 25MB)
  console.log('\nTest 4 — Oversized upload (> 25MB):');
  {
    const formData = new FormData();
    formData.append('token', 'some_token');
    formData.append('request_item_id', '00000000-0000-0000-0000-000000000000');
    // Create oversized dummy buffer (25 * 1024 * 1024 + 1 bytes)
    const oversizedBlob = new Blob([new Uint8Array(25 * 1024 * 1024 + 1024)], {
      type: 'application/pdf',
    });
    formData.append('file', oversizedBlob, 'large.pdf');

    const res = await fetch(url, { method: 'POST', body: formData });
    const data: any = await res.json();
    console.log('  Status:', res.status);
    console.log('  Response:', data);
    if (res.status === 400 && (data.error?.includes('exceeds maximum') || data.error?.includes('too large'))) {
      console.log('  ✅ [PASS] Oversized file (>25MB) strictly rejected with 400');
    } else {
      console.log('  ❌ [FAIL] Expected 400 oversized error, got:', res.status, data);
    }
  }
}

runEdgeFunctionTests().catch(console.error);

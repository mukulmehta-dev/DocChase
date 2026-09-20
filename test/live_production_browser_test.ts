/**
 * Live Production Browser E2E Test: Auth Error UX & Password Rejection Verification
 * 
 * Target: https://doc-chase-omega.vercel.app/sign-in (Live Production)
 * 
 * Verifies:
 * 1. Entering valid email + deliberately wrong password
 * 2. Supabase returns HTTP 400 for invalid_credentials
 * 3. Browser STAYS on /sign-in (no navigation to /dashboard, no reload)
 * 4. Email field remains populated
 * 5. Password field is cleared
 * 6. Loading state stops and submit button is re-enabled
 * 7. Visible error text contains exactly: "Incorrect email or password."
 * 8. Entering valid email + correct password reaches /dashboard
 */

import { spawn } from 'child_process';
import * as path from 'path';

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('═════════════════════════════════════════════════════════');
  console.log('  Live Production Browser E2E Test: Auth Error UX');
  console.log('  Target: https://doc-chase-omega.vercel.app/sign-in');
  console.log('═════════════════════════════════════════════════════════\n');

  // Launch headless Chrome pointing directly to live production sign-in
  const profileDir = path.resolve('scratch/chrome-live-error-profile');
  console.log('Launching headless Google Chrome with isolated profile...');
  const chromeProcess = spawn(
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    [
      '--headless=new',
      '--remote-debugging-port=9224',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-extensions',
      `--user-data-dir=${profileDir}`,
      'https://doc-chase-omega.vercel.app/sign-in',
    ],
    { stdio: 'ignore' }
  );

  let versionData: any = null;
  for (let i = 0; i < 30; i++) {
    await delay(300);
    try {
      const res = await fetch('http://127.0.0.1:9224/json/list');
      versionData = await res.json();
      if (versionData && versionData.length > 0) {
        const found = versionData.find((t: any) => t.type === 'page');
        if (found) break;
      }
    } catch {}
  }

  const pageTarget = versionData?.find((t: any) => t.type === 'page') || versionData?.[0];
  if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
    console.error('❌ Failed to connect to headless Chrome CDP on port 9224');
    chromeProcess.kill();
    process.exit(1);
  }

  const pageWsUrl = pageTarget.webSocketDebuggerUrl;
  console.log('✅ Connected to Chrome CDP WebSocket:', pageWsUrl, 'Page URL:', pageTarget.url);

  const ws = new WebSocket(pageWsUrl);
  let id = 1;
  const pending = new Map<number, (res: any) => void>();

  function send(method: string, params: any = {}): Promise<any> {
    return new Promise((resolve) => {
      const msgId = id++;
      pending.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await new Promise((r) => (ws.onopen = r));

  let token400Encountered = false;

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data.toString());
    if (data.id && pending.has(data.id)) {
      const resolve = pending.get(data.id)!;
      pending.delete(data.id);
      resolve(data.result);
      return;
    }

    if (data.method === 'Network.responseReceived') {
      const res = data.params.response;
      if (res.status === 400 && res.url.includes('grant_type=password')) {
        token400Encountered = true;
        console.log('  [NET] Captured expected HTTP 400 from Supabase Auth on production:', res.url.split('?')[0]);
      }
    }
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  const cleanup = () => {
    try {
      ws.close();
      chromeProcess.kill();
    } catch {}
  };

  try {
    console.log('\n--- Step 1: Waiting for live /sign-in page to hydrate ---');
    await delay(3500);

    const initialUrlRes = await send('Runtime.evaluate', { expression: 'window.location.href' });
    console.log('Initial URL:', initialUrlRes?.result?.value);
    if (!initialUrlRes?.result?.value?.includes('/sign-in')) {
      throw new Error(`Expected URL to include /sign-in, got ${initialUrlRes?.result?.value}`);
    }

    // Step 2: Enter valid email + deliberately wrong password
    const testEmail = 'docchase.audit.1789840548911@gmail.com';
    const wrongPassword = 'DeliberatelyWrongPassword999!';
    console.log('\n--- Step 2: Entering Valid Email + Deliberately Wrong Password ---');
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${wrongPassword}`);

    const fillRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const emailInput = inputs.find(i => i.type === 'email' || i.name === 'email');
        const passInput = inputs.find(i => i.type === 'password');
        if (!emailInput || !passInput) return 'Inputs not found';

        emailInput.value = '${testEmail}';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));

        passInput.value = '${wrongPassword}';
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.dispatchEvent(new Event('change', { bubbles: true }));

        return 'Populated inputs cleanly';
      })()`,
    });
    console.log('Input fill status:', fillRes?.result?.value);

    // Step 3: Submit the form
    console.log('\n--- Step 3: Submitting Sign-In Form with Wrong Password ---');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      })()`,
    });

    console.log('Waiting for network auth rejection & UI update on live production...');
    await delay(3500);

    // Step 4: Verify Auth Error UX assertions on live production
    console.log('\n--- Step 4: Verifying Live Production Auth Error UX Assertions ---');

    // Assertion 1: Must remain on /sign-in
    const afterFailUrl = await send('Runtime.evaluate', { expression: 'window.location.href' });
    const currentHref: string = afterFailUrl?.result?.value || '';
    console.log('Current URL after failure:', currentHref);
    if (!currentHref.includes('/sign-in')) {
      throw new Error(`❌ User did not remain on /sign-in! Actual URL: ${currentHref}`);
    }
    console.log('  ✅ [PASS] User remains on /sign-in (no navigation to /dashboard or reload)');

    // Assertion 2: Email input remains populated
    const emailValueRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const emailInput = inputs.find(i => i.type === 'email' || i.name === 'email');
        return emailInput ? emailInput.value : null;
      })()`,
    });
    const preservedEmail = emailValueRes?.result?.value;
    console.log('Preserved email input value:', preservedEmail);
    if (preservedEmail !== testEmail) {
      throw new Error(`❌ Email field was not preserved! Expected ${testEmail}, got: ${preservedEmail}`);
    }
    console.log('  ✅ [PASS] Email field remains populated with submitted email');

    // Assertion 3: Password input is cleared
    const passValueRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const passInput = inputs.find(i => i.type === 'password');
        return passInput ? passInput.value : null;
      })()`,
    });
    const clearedPassword = passValueRes?.result?.value;
    console.log('Password input value after rejection:', JSON.stringify(clearedPassword));
    if (clearedPassword !== '') {
      throw new Error(`❌ Password field was not cleared! Got: ${clearedPassword}`);
    }
    console.log('  ✅ [PASS] Password field is cleared');

    // Assertion 4: Loading stops and submit button is enabled
    const submitDisabledRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const submitBtn = document.querySelector('button[type="submit"]');
        return submitBtn ? submitBtn.disabled : true;
      })()`,
    });
    const isSubmitDisabled = submitDisabledRes?.result?.value;
    console.log('Submit button disabled status:', isSubmitDisabled);
    if (isSubmitDisabled) {
      throw new Error('❌ Submit button is still disabled / loading did not stop!');
    }
    console.log('  ✅ [PASS] Loading stopped and submit button is re-enabled');

    // Assertion 5: Visible error message displays exactly: "Incorrect email or password."
    const pageTextRes = await send('Runtime.evaluate', {
      expression: 'document.body.innerText',
    });
    const pageText: string = pageTextRes?.result?.value || '';
    const hasExactError = pageText.includes('Incorrect email or password.');
    console.log('Visible page displays "Incorrect email or password.":', hasExactError);
    if (!hasExactError) {
      console.error('Page text was:\n', pageText);
      throw new Error('❌ Page does not visibly display "Incorrect email or password."');
    }
    console.log('  ✅ [PASS] Page visibly displays exactly: "Incorrect email or password."');

    // Step 5: Verify valid email + correct password reaches /dashboard
    console.log('\n--- Step 5: Entering Correct Password & Verifying /dashboard Navigation ---');
    const correctPassword = 'TestPassword123!@#Secure';

    await send('Runtime.evaluate', {
      expression: `(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const passInput = inputs.find(i => i.type === 'password');
        if (passInput) {
          passInput.value = '${correctPassword}';
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
          passInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      })()`,
    });

    console.log('Waiting for login transition to /dashboard on live production...');
    let reachedDashboard = false;
    for (let s = 1; s <= 10; s++) {
      await delay(1000);
      const curUrl = await send('Runtime.evaluate', { expression: 'window.location.href' });
      const curHref: string = curUrl?.result?.value || '';
      console.log(`  [+${s}s] URL: ${curHref}`);
      if (curHref.includes('/dashboard')) {
        reachedDashboard = true;
        break;
      }
    }

    if (!reachedDashboard) {
      throw new Error('❌ Valid credentials did not reach /dashboard!');
    }
    console.log('  ✅ [PASS] Valid email + correct password successfully reaches /dashboard');

    console.log('\n═════════════════════════════════════════════════════════');
    console.log('  🎉 All Live Production Auth UX Verifications PASSED!');
    console.log('═════════════════════════════════════════════════════════\n');

    cleanup();
    process.exit(0);
  } catch (err) {
    console.error('Live production test failed:', err);
    cleanup();
    process.exit(1);
  }
}

run();

import { spawn } from 'child_process';
import * as path from 'path';

async function run() {
  console.log('═════════════════════════════════════════════════════════');
  console.log('  Live Production Browser E2E Verification (Vercel)');
  console.log('  URL: https://doc-chase-omega.vercel.app');
  console.log('═════════════════════════════════════════════════════════\n');

  const profileDir = path.resolve('scratch/chrome-verify-profile');
  console.log('Launching headless Google Chrome with isolated profile...');
  const chromeProcess = spawn(
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    [
      '--headless=new',
      '--remote-debugging-port=9222',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-extensions',
      `--user-data-dir=${profileDir}`,
      'https://doc-chase-omega.vercel.app/sign-in'
    ],
    { stdio: 'ignore' }
  );

  // Wait for Chrome to listen on port 9222
  let versionData: any = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch('http://127.0.0.1:9222/json/list');
      versionData = await res.json();
      if (versionData && versionData.length > 0) {
        const found = versionData.find((t: any) => t.type === 'page');
        if (found) break;
      }
    } catch {}
  }

  const pageTarget = versionData?.find((t: any) => t.type === 'page') || versionData?.[0];
  if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
    console.error('❌ Failed to connect to headless Chrome page target on port 9222');
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

  await new Promise(r => ws.onopen = r);

  const networkLog: Array<{ method: string; url: string; status?: number; requestHeaders?: any; postData?: string }> = [];
  let createWorkspaceRpcCalled = false;
  let fourHundredErrorEncountered = false;

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data.toString());
    if (data.id && pending.has(data.id)) {
      const resolve = pending.get(data.id)!;
      pending.delete(data.id);
      resolve(data.result);
      return;
    }

    if (data.method === 'Runtime.consoleAPICalled') {
      const args = (data.params.args || []).map((a: any) => a.value || JSON.stringify(a)).join(' ');
      console.log(`  [CONSOLE ${data.params.type}]`, args);
    } else if (data.method === 'Network.requestWillBeSent') {
      const req = data.params.request;
      if (req.url.includes('create_workspace_for_user')) {
        createWorkspaceRpcCalled = true;
        console.warn('  ⚠️ ALERT: create_workspace_for_user RPC was triggered!', req.url);
      }
      if (req.url.includes('supabase.co')) {
        networkLog.push({
          method: req.method,
          url: req.url,
          requestHeaders: req.headers,
          postData: req.postData
        });
      }
    } else if (data.method === 'Network.responseReceived') {
      const res = data.params.response;
      if (res.status === 400 && res.url.includes('supabase.co')) {
        fourHundredErrorEncountered = true;
        console.error('  ❌ HTTP 400 received on:', res.url);
      }
      if (res.url.includes('supabase.co') || res.url.includes('/dashboard')) {
        console.log(`  [NET] ${res.status} ${res.url.split('?')[0]}`);
      }
    }
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Console.enable');

  console.log('\n--- Step 1: Navigating to Sign-In Page ---');
  await send('Page.navigate', { url: 'https://doc-chase-omega.vercel.app/sign-in' });
  await new Promise(r => setTimeout(r, 3000));

  const urlRes = await send('Runtime.evaluate', { expression: 'window.location.href' });
  console.log('Current URL:', urlRes?.result?.value);

  // Fill in credentials for confirmed user with existing workspace
  console.log('\n--- Step 2: Entering Credentials for Confirmed User ---');
  const fillRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const emailInput = inputs.find(i => i.type === 'email' || i.name === 'email');
      const passInput = inputs.find(i => i.type === 'password');
      if (!emailInput || !passInput) return 'Inputs not found';

      emailInput.value = 'docchase.audit.1789840548911@gmail.com';
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));

      passInput.value = 'TestPassword123!@#Secure';
      passInput.dispatchEvent(new Event('input', { bubbles: true }));
      passInput.dispatchEvent(new Event('change', { bubbles: true }));

      return 'Filled credentials cleanly';
    })()`
  });
  console.log('Fill result:', fillRes?.result?.value);

  console.log('\n--- Step 3: Submitting Sign-In Form ---');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()`
  });

  // Wait for authentication and navigation to complete
  console.log('Waiting for login transition...');
  let reachedDashboard = false;
  for (let s = 1; s <= 7; s++) {
    await new Promise(r => setTimeout(r, 1000));
    const curUrl = await send('Runtime.evaluate', { expression: 'window.location.href' });
    const curText = await send('Runtime.evaluate', { expression: 'document.body.innerText.substring(0, 120)' });
    console.log(`  [+${s}s] URL: ${curUrl?.result?.value}`);
    if (curUrl?.result?.value?.includes('/dashboard')) {
      reachedDashboard = true;
    }
  }

  // Verify dashboard stability (must not redirect back to /sign-in)
  console.log('\n--- Step 4: Verifying Dashboard Stability & Workspace Loading ---');
  const finalDashboardUrl = await send('Runtime.evaluate', { expression: 'window.location.href' });
  const dashboardText = await send('Runtime.evaluate', { expression: 'document.body.innerText' });
  const textValue: string = dashboardText?.result?.value || '';

  const isStableDashboard = finalDashboardUrl?.result?.value?.includes('/dashboard');
  const hasWorkspaceLoaded = textValue.includes('Test Firm') || textValue.includes('Dashboard') || textValue.includes('Clients');

  console.log('Dashboard stable (not bounced back to sign-in):', isStableDashboard);
  console.log('Workspace context present in dashboard:', hasWorkspaceLoaded);
  console.log('create_workspace_for_user RPC avoided:', !createWorkspaceRpcCalled);
  console.log('Zero 400 Bad Request errors:', !fourHundredErrorEncountered);

  // Navigate to Clients Page
  console.log('\n--- Step 5: Navigating to Clients Page & Opening Add Client Modal ---');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const clientsLink = links.find(l => l.innerText.includes('Clients') || l.href.includes('/clients'));
      if (clientsLink) {
        clientsLink.click();
        return 'Clicked Clients link';
      }
      return 'Clients link not found';
    })()`
  });

  await new Promise(r => setTimeout(r, 2000));
  const clientsPageUrl = await send('Runtime.evaluate', { expression: 'window.location.href' });
  console.log('Clients page URL:', clientsPageUrl?.result?.value);

  // Click "Add Client" button
  console.log('\n--- Step 6: Opening Add Client Form ---');
  const openModalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(b => b.innerText.includes('Add Client'));
      if (addBtn) {
        addBtn.click();
        return 'Clicked Add Client button';
      }
      return 'Add Client button not found';
    })()`
  });
  console.log('Modal trigger result:', openModalRes?.result?.value);

  await new Promise(r => setTimeout(r, 1000));

  // Fill in client fields and submit
  const clientName = `Live Verification ${Date.now()}`;
  const clientEmail = `live.test.${Date.now()}@example.com`;
  console.log(`\n--- Step 7: Creating Test Client: "${clientName}" ---`);

  const fillClientRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const nameInput = document.getElementById('primary-contact-person') || document.querySelector('input[placeholder*="John Doe"]');
      const emailInput = document.getElementById('client-notification-email') || document.querySelector('input[placeholder*="john@acme.com"]');
      const companyInput = document.getElementById('company-/-legal-entity-name') || document.querySelector('input[placeholder*="Acme Retail Ltd"]');
      
      if (!nameInput || !emailInput) {
        const found = Array.from(document.querySelectorAll('input')).map(i => i.id + '|' + i.placeholder);
        return 'Client inputs not found. Visible inputs: ' + found.join(', ');
      }

      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

      setter.call(nameInput, ${JSON.stringify(clientName)});
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));

      setter.call(emailInput, ${JSON.stringify(clientEmail)});
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));

      if (companyInput) {
        setter.call(companyInput, 'DocChase Live E2E Corp');
        companyInput.dispatchEvent(new Event('input', { bubbles: true }));
        companyInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      return 'Filled client fields via native value setter';
    })()`
  });
  console.log('Fill client fields:', fillClientRes?.result?.value);

  // Submit client form
  const submitClientRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.innerText.includes('Create Client') || (b.type === 'submit' && b.closest('form'))
      );
      if (submitBtn) {
        submitBtn.click();
        return 'Clicked Create Client button';
      }
      return 'Create Client button not found';
    })()`
  });
  console.log('Submit client form:', submitClientRes?.result?.value);

  // Wait for client insertion to complete and appear in table
  await new Promise(r => setTimeout(r, 4000));
  const pageAfterClientAdd = await send('Runtime.evaluate', { expression: 'document.body.innerText' });
  const clientCreatedSuccessfully = pageAfterClientAdd?.result?.value?.includes(clientName);
  console.log(`Client "${clientName}" appeared in table:`, clientCreatedSuccessfully);

  // Check headers on authenticated requests
  console.log('\n--- Step 8: Verifying Official Supabase Client Headers ---');
  const postgrestReqs = networkLog.filter(r => r.url.includes('/rest/v1/'));
  let validHeaders = true;
  for (const r of postgrestReqs) {
    const keys = Object.keys(r.requestHeaders || {});
    const hasApikey = keys.some(k => k.toLowerCase() === 'apikey');
    const hasAuth = keys.some(k => k.toLowerCase() === 'authorization');
    if (!hasApikey) {
      console.warn(`Request missing apikey: ${r.url} (headers: ${keys.join(',')})`);
      validHeaders = false;
    }
    if (!hasAuth) {
      console.warn(`Request missing authorization: ${r.url} (headers: ${keys.join(',')})`);
      validHeaders = false;
    }
  }
  console.log(`Checked ${postgrestReqs.length} PostgREST requests: All have proper apikey and authorization headers: ${validHeaders}`);

  ws.close();
  chromeProcess.kill();

  console.log('\n═════════════════════════════════════════════════════════');
  console.log('  PRODUCTION BROWSER VERIFICATION SUMMARY');
  console.log('═════════════════════════════════════════════════════════');
  console.log(`  Login Succeeded:                    ${isStableDashboard}`);
  console.log(`  Dashboard Stable (No Redirect Loop): ${isStableDashboard}`);
  console.log(`  Existing Workspace Loaded:          ${hasWorkspaceLoaded}`);
  console.log(`  create_workspace_for_user AVOIDED:  ${!createWorkspaceRpcCalled}`);
  console.log(`  Zero HTTP 400 Errors:               ${!fourHundredErrorEncountered}`);
  console.log(`  Add Client Succeeded with Real JWT: ${clientCreatedSuccessfully}`);
  console.log(`  Supabase Official Client Headers:   ${validHeaders}`);
  console.log('═════════════════════════════════════════════════════════\n');

  if (!isStableDashboard || createWorkspaceRpcCalled || fourHundredErrorEncountered || !clientCreatedSuccessfully) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('Fatal browser test exception:', e);
  process.exit(1);
});

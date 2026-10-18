const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// Load environment variables from apps/web/.env.local
const envPath = path.resolve(__dirname, '../apps/web/.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

const axePath = path.resolve(
  __dirname,
  '../node_modules/.pnpm/axe-core@4.14.0/node_modules/axe-core/axe.min.js'
);
const axeSource = fs.readFileSync(axePath, 'utf-8');

const ARTIFACT_DIR = '/home/hafeez/.gemini/antigravity-ide/brain/7a6f0603-60b8-4038-9437-551c60e429ac';

async function runBrowserContrastAudit() {
  console.log('======================================================================');
  console.log('REAL CHROMIUM BROWSER CONTRAST & WCAG 2.1 AA AUDIT (Item 1 & Item 4)');
  console.log('Browser: /snap/bin/chromium (Headless)');
  console.log('Axe Core: v4.14.0');
  console.log('======================================================================\n');

  const browser = await chromium.launch({
    executablePath: '/snap/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: 'light', // Test light theme first per build plan rule
  });

  const page = await context.newPage();

  // Step 1: Log in via /login to obtain real authenticated session cookies
  console.log('[1/12] Authenticating via /login with test account...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

  await page.fill('input[type="email"]', 'tewdg203@gmail.com');
  await page.fill('input[type="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');

  // Wait for redirect to /dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  console.log('  -> Authenticated successfully. Session active.\n');

  // List of all pages to audit
  const pagesToAudit = [
    { name: 'Landing / Home', path: '/', isProtected: false },
    { name: 'Login Page', path: '/login', isProtected: false },
    { name: 'Signup Page', path: '/signup', isProtected: false },
    { name: 'Privacy Policy', path: '/privacy', isProtected: false },
    { name: 'Dashboard Overview', path: '/dashboard', isProtected: true },
    { name: 'Analytics & Benchmarks', path: '/analytics', isProtected: true },
    { name: 'Recommendations Studio', path: '/recommendations', isProtected: true },
    { name: 'Content Calendar', path: '/calendar', isProtected: true },
    { name: 'Notifications Center', path: '/notifications', isProtected: true },
    { name: 'Settings & Integrations', path: '/settings', isProtected: true },
    { name: 'Onboarding Tour', path: '/onboarding', isProtected: true },
    { name: 'Admin Portal', path: '/admin', isProtected: true },
  ];

  const auditResults = [];

  for (let i = 0; i < pagesToAudit.length; i++) {
    const item = pagesToAudit[i];
    const url = `http://localhost:3000${item.path}`;
    const slug = item.path === '/' ? 'home' : item.path.replace(/^\//, '').replace(/\//g, '_');

    console.log(`[${i + 1}/${pagesToAudit.length}] Auditing ${item.name} (${item.path})...`);

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000); // Allow react hydration and transitions

      // Screenshot capture
      const screenshotName = `phase15_browser_${slug}.png`;
      const screenshotPath = path.join(ARTIFACT_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      // Inject and execute axe-core
      await page.evaluate(axeSource);

      const axeResult = await page.evaluate(async () => {
        // @ts-ignore
        const results = await window.axe.run(document, {
          runOnly: {
            type: 'rule',
            values: ['color-contrast'],
          },
        });
        return {
          violations: results.violations || [],
          passes: results.passes || [],
        };
      });

      // Sample contrast checks on prominent elements
      const sampleContrasts = await page.evaluate(() => {
        function getContrast(el) {
          if (!el) return null;
          const style = window.getComputedStyle(el);
          return {
            color: style.color,
            bgColor: style.backgroundColor,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
          };
        }

        const h1 = document.querySelector('h1');
        const p = document.querySelector('p');
        const btn = document.querySelector('button, .btn-outline, .btn-solid');

        return {
          h1: getContrast(h1),
          p: getContrast(p),
          btn: getContrast(btn),
        };
      });

      const violationCount = axeResult.violations.length;
      const passCount = axeResult.passes.length;

      const violationDetails = axeResult.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.map((n) => ({
          target: n.target.join(' > '),
          failureSummary: n.failureSummary,
        })),
      }));

      auditResults.push({
        name: item.name,
        path: item.path,
        url,
        violations: violationCount,
        passes: passCount,
        violationDetails,
        sampleContrasts,
        screenshot: screenshotName,
      });

      console.log(`  -> Violations: ${violationCount} | Passes: ${passCount} | Screenshot: ${screenshotName}`);
      if (violationCount > 0) {
        console.log(`     VIOLATION DETAILS:`, JSON.stringify(violationDetails, null, 2));
      }
    } catch (err) {
      console.error(`  -> Failed to audit ${item.path}:`, err.message);
      auditResults.push({
        name: item.name,
        path: item.path,
        url,
        error: err.message,
        violations: -1,
      });
    }
  }

  await browser.close();

  // Print Summary Table
  console.log('\n======================================================================');
  console.log('RAW CHROMIUM CONTRAST AUDIT RESULTS TABLE (WCAG 2.1 AA)');
  console.log('======================================================================');
  console.log('| Page | Route | Contrast Violations | WCAG AA Status | Screenshot Artifact |');
  console.log('| :--- | :--- | :---: | :---: | :--- |');
  for (const r of auditResults) {
    const status = r.violations === 0 ? 'PASS (0 violations)' : `FAIL (${r.violations} violations)`;
    console.log(`| ${r.name} | \`${r.path}\` | **${r.violations}** | **${status}** | \`${r.screenshot || 'none'}\` |`);
  }
  console.log('======================================================================\n');

  // Save audit log to file
  const logPath = path.join(ARTIFACT_DIR, 'phase15_chromium_contrast_audit.json');
  fs.writeFileSync(logPath, JSON.stringify(auditResults, null, 2));
  console.log(`Audit details saved to: ${logPath}`);
}

runBrowserContrastAudit().catch((err) => {
  console.error('Audit runner error:', err);
  process.exit(1);
});

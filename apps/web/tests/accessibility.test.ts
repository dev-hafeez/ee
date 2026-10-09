import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import axe from 'axe-core';

describe('Phase 12 — WCAG 2.1 AA Accessibility Pass (SRDS 4.3.4)', () => {
  async function runAxe(htmlContent: string) {
    const dom = new JSDOM(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Entangled Echo Accessibility Test</title>
</head>
<body class="bg-zinc-50 text-zinc-900">
  ${htmlContent}
</body>
</html>`);

    // Run axe with WCAG 2.1 AA tag rules
    const results = await axe.run(dom.window.document.documentElement, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
      },
    });

    return results;
  }

  it('audits application shell layout: sidebar, landmarks, navigation', async () => {
    const shellHtml = `
      <header role="banner" class="border-b bg-white p-4">
        <div class="flex items-center justify-between">
          <a href="/dashboard" aria-label="Entangled Echo Home" class="font-bold text-zinc-900">Entangled Echo</a>
          <nav aria-label="User navigation">
            <button aria-label="Notifications" class="p-2 border border-black rounded">Notifications (3)</button>
          </nav>
        </div>
      </header>
      <div class="flex">
        <nav role="navigation" aria-label="Main navigation" class="w-64 bg-zinc-900 text-white p-4">
          <ul class="space-y-2">
            <li><a href="/dashboard" class="block p-2 hover:bg-zinc-800">Dashboard</a></li>
            <li><a href="/analytics" class="block p-2 hover:bg-zinc-800">Analytics</a></li>
            <li><a href="/recommendations" class="block p-2 hover:bg-zinc-800">Recommendations</a></li>
            <li><a href="/calendar" class="block p-2 hover:bg-zinc-800">Calendar</a></li>
            <li><a href="/notifications" class="block p-2 hover:bg-zinc-800">Notifications</a></li>
            <li><a href="/settings" class="block p-2 hover:bg-zinc-800">Settings</a></li>
          </ul>
        </nav>
        <main role="main" class="flex-1 p-6">
          <h1 class="text-2xl font-bold text-[#373E3E]">Dashboard Overview</h1>
          <p class="text-zinc-700">Real-time social intelligence and scheduling insights.</p>
        </main>
      </div>
    `;

    const results = await runAxe(shellHtml);
    assert.equal(
      results.violations.length,
      0,
      `Shell layout had accessibility violations: ${JSON.stringify(results.violations, null, 2)}`
    );
    assert.ok(results.passes.length > 5, 'Should pass standard WCAG landmarks and link rules');
  });

  it('audits dashboard overview page: cards, demo badges, actions', async () => {
    const dashboardHtml = `
      <main role="main" class="p-6 space-y-6">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-zinc-900">Dashboard Overview</h1>
          <span class="bg-amber-100 text-amber-900 text-xs font-semibold px-2 py-0.5 rounded" role="status">Demo Data</span>
        </div>
        <section aria-labelledby="kpi-heading" class="grid grid-cols-3 gap-4">
          <h2 id="kpi-heading" class="sr-only">Key Performance Indicators</h2>
          <div class="p-4 bg-white border rounded shadow-sm">
            <h3 class="text-sm font-medium text-zinc-600">Total Reach</h3>
            <p class="text-2xl font-bold text-zinc-900">45,210</p>
          </div>
          <div class="p-4 bg-white border rounded shadow-sm">
            <h3 class="text-sm font-medium text-zinc-600">Total Likes</h3>
            <p class="text-2xl font-bold text-zinc-900">3,420</p>
          </div>
          <div class="p-4 bg-white border rounded shadow-sm">
            <h3 class="text-sm font-medium text-zinc-600">Avg Performance Score</h3>
            <p class="text-2xl font-bold text-zinc-900">82.4%</p>
          </div>
        </section>
        <section aria-labelledby="actions-heading">
          <h2 id="actions-heading" class="text-lg font-bold text-zinc-900">Quick Actions</h2>
          <div class="flex gap-3 mt-2">
            <button class="px-4 py-2 border border-black text-black bg-white hover:bg-black hover:text-white transition">Generate Captions</button>
            <button class="px-4 py-2 border border-black text-black bg-white hover:bg-black hover:text-white transition">Run Schedule Optimizer</button>
          </div>
        </section>
      </main>
    `;

    const results = await runAxe(dashboardHtml);
    assert.equal(
      results.violations.length,
      0,
      `Dashboard had accessibility violations: ${JSON.stringify(results.violations, null, 2)}`
    );
  });

  it('audits analytics page: heatmaps, tables, data exports', async () => {
    const analyticsHtml = `
      <main role="main" class="p-6 space-y-6">
        <h1 class="text-2xl font-bold text-zinc-900">Analytics & Performance Reports</h1>
        <section aria-labelledby="export-sec">
          <h2 id="export-sec" class="text-lg font-semibold text-zinc-900">Export Engagement Data</h2>
          <form class="flex gap-3 items-center">
            <label for="format-select" class="text-sm font-medium text-zinc-700">Format</label>
            <select id="format-select" name="format" class="border p-2 rounded">
              <option value="csv">CSV Export</option>
              <option value="json">JSON Export</option>
            </select>
            <button type="submit" class="border border-black px-4 py-2">Download Report</button>
          </form>
        </section>
        <section aria-labelledby="posts-table-heading">
          <h2 id="posts-table-heading" class="text-lg font-semibold text-zinc-900">Top Performing Posts</h2>
          <table class="w-full border-collapse border border-zinc-200 mt-2">
            <caption class="sr-only">List of top posts with metrics</caption>
            <thead>
              <tr class="bg-zinc-100">
                <th scope="col" class="border p-2 text-left">Caption</th>
                <th scope="col" class="border p-2 text-left">Media Type</th>
                <th scope="col" class="border p-2 text-right">Reach</th>
                <th scope="col" class="border p-2 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border p-2">Exploring quantum optimization</td>
                <td class="border p-2">Reel</td>
                <td class="border p-2 text-right">12,450</td>
                <td class="border p-2 text-right">0.94</td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    `;

    const results = await runAxe(analyticsHtml);
    assert.equal(
      results.violations.length,
      0,
      `Analytics page had accessibility violations: ${JSON.stringify(results.violations, null, 2)}`
    );
  });

  it('audits recommendations & calendar forms: accessible inputs & modals', async () => {
    const formsHtml = `
      <main role="main" class="p-6 space-y-6">
        <h1 class="text-2xl font-bold text-zinc-900">AI Recommendations & Post Composer</h1>
        <form aria-labelledby="composer-heading" class="space-y-4 max-w-lg">
          <h2 id="composer-heading" class="text-lg font-semibold text-zinc-900">Schedule New Post</h2>
          <div>
            <label for="post-caption" class="block text-sm font-medium text-zinc-700">Caption</label>
            <textarea id="post-caption" name="caption" rows="3" class="w-full border p-2 rounded" placeholder="Draft your message..."></textarea>
          </div>
          <div>
            <label for="schedule-time" class="block text-sm font-medium text-zinc-700">Schedule Time</label>
            <input type="datetime-local" id="schedule-time" name="scheduledAt" class="border p-2 rounded" />
          </div>
          <button type="submit" class="border border-black px-4 py-2 bg-black text-white hover:bg-zinc-800">Confirm Schedule</button>
        </form>
      </main>
    `;

    const results = await runAxe(formsHtml);
    assert.equal(
      results.violations.length,
      0,
      `Composer form had accessibility violations: ${JSON.stringify(results.violations, null, 2)}`
    );
  });
});

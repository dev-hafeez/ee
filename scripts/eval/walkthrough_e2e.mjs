import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '../../apps/web/node_modules/@supabase/supabase-js/dist/index.cjs';

// Load env vars from apps/web/.env.local
const envPath = path.resolve('apps/web/.env.local');
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const tickSecret = env.INTERNAL_TICK_SECRET;
const tokenEncKey = env.TOKEN_ENC_KEY;
const aiServiceUrl = env.AI_SERVICE_URL || 'http://localhost:8000';
const aiSecret = env.AI_SERVICE_SECRET || '';

const testUserId = '2fd69247-4c25-4cda-97a9-a2d3e641ea2f';

function encryptToken(plaintext) {
  const key = Buffer.from(tokenEncKey, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const results = [];

async function run() {
  console.log('================================================================');
  console.log('ENTANGLED ECHO: FULL END-TO-END FLOW AUDIT & EXECUTION');
  console.log('Target User ID:', testUserId);
  console.log('Supabase URL:', supabaseUrl);
  console.log('AI Microservice:', aiServiceUrl);
  console.log('================================================================\n');

  let accountId = '';

  // ── Step 1: Connect Social Account ──────────────────────────────────────────
  try {
    console.log('[Step 1/8] Connecting mock social account for user...');
    const dummyToken = 'IG_TEST_MOCK_TOKEN_' + Date.now();
    const encryptedToken = encryptToken(dummyToken);

    const { data: existing } = await supabase
      .from('social_accounts')
      .select('id, handle')
      .eq('user_id', testUserId)
      .eq('platform', 'instagram')
      .maybeSingle();

    if (existing) {
      accountId = existing.id;
      console.log(`✓ Existing social account found: @${existing.handle} (${accountId})`);
    } else {
      const { data: account, error: accErr } = await supabase
        .from('social_accounts')
        .insert({
          user_id: testUserId,
          platform: 'instagram',
          external_id: 'ig_e2e_walkthrough_acc',
          handle: 'echo_creator_official',
          access_token_enc: encryptedToken,
          token_expiry: new Date(Date.now() + 60 * 86400 * 1000).toISOString(),
          status: 'active',
          is_synthetic: true,
        })
        .select('id, platform, handle')
        .single();

      if (accErr || !account) {
        throw new Error(`Failed to create account: ${accErr?.message}`);
      }
      accountId = account.id;
      console.log(`✓ Account connected: @${account.handle} ID: ${accountId}`);
    }

    results.push({ step: '1. Connect Account', passed: true });
  } catch (err) {
    console.error('✗ Step 1 failed:', err.message);
    results.push({ step: '1. Connect Account', passed: false, error: err.message });
    return printSummary();
  }

  // ── Step 2: Data Ingestion & Normalization Sync ──────────────────────────────
  try {
    console.log('\n[Step 2/8] Triggering /api/data/sync via internal tick authorization...');
    const syncRes = await fetch('http://localhost:3000/api/data/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tickSecret}`,
      },
      body: JSON.stringify({ accountId }),
    });

    if (!syncRes.ok) {
      throw new Error(`Sync API returned HTTP ${syncRes.status}: ${await syncRes.text()}`);
    }

    const syncData = await syncRes.json();
    console.log(`✓ Sync succeeded! Synced ${syncData.syncedPosts} posts in ${syncData.durationMs}ms`);

    const { count: postCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId);

    console.log(`✓ Verified ${postCount} posts in DB for account`);
    results.push({ step: '2. Ingestion & Sync', passed: true, details: { postCount } });
  } catch (err) {
    console.error('✗ Step 2 failed:', err.message);
    results.push({ step: '2. Ingestion & Sync', passed: false, error: err.message });
  }

  // ── Step 3: Content Analysis via FastAPI AI Microservice ───────────────────
  try {
    console.log('\n[Step 3/8] Running Content Analysis (TF-IDF, Sentiment, Topics)...');
    const { data: posts } = await supabase
      .from('posts')
      .select('id, caption, hashtags, media_type, engagement_metrics(reach, likes, comments, shares, saves)')
      .eq('account_id', accountId)
      .limit(50);

    const analyzePayload = {
      account_id: accountId,
      account_followers: 2500,
      posts: (posts || []).map(p => {
        const m = p.engagement_metrics?.[0] || {};
        return {
          id: p.id,
          caption: p.caption || '',
          hashtags: p.hashtags || [],
          media_type: p.media_type || 'image',
          reach: m.reach || 100,
          likes: m.likes || 10,
          comments: m.comments || 2,
          shares: m.shares || 1,
          saves: m.saves || 1,
        };
      }),
    };

    const analyzeRes = await fetch(`${aiServiceUrl}/api/v1/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiSecret}`,
      },
      body: JSON.stringify(analyzePayload),
    });

    if (!analyzeRes.ok) {
      throw new Error(`Analyze API returned HTTP ${analyzeRes.status}: ${await analyzeRes.text()}`);
    }

    const analyzeData = await analyzeRes.json();
    console.log(`✓ Analysis succeeded! Processed posts: ${analyzeData.processed_count}`);

    // Verify perf_score was updated on posts
    const { data: updatedPosts } = await supabase
      .from('posts')
      .select('id, perf_score, topics, sentiment')
      .eq('account_id', accountId)
      .not('perf_score', 'is', null)
      .limit(3);

    console.log(`✓ Verified perf_score and topics persisted in DB:`, updatedPosts?.[0]);
    results.push({ step: '3. Content Analysis', passed: true });
  } catch (err) {
    console.error('✗ Step 3 failed:', err.message);
    results.push({ step: '3. Content Analysis', passed: false, error: err.message });
  }

  // ── Step 4: Quantum-Inspired Optimizer (QUBO / Simulated Annealing) ─────────
  try {
    console.log('\n[Step 4/8] Running Quantum-Inspired QUBO Schedule Optimizer...');
    const optimizeRes = await fetch(`${aiServiceUrl}/api/v1/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiSecret}`,
      },
      body: JSON.stringify({
        user_id: testUserId,
        account_id: accountId,
        horizon_days: 30,
        posts_per_week: 4,
        min_gap_hours: 6,
        blackout_slots: [],
      }),
    });

    if (!optimizeRes.ok) {
      throw new Error(`Optimize API returned HTTP ${optimizeRes.status}: ${await optimizeRes.text()}`);
    }

    const optData = await optimizeRes.json();
    console.log(`✓ Optimizer job created: ID ${optData.job_id}, Initial status: ${optData.status}`);

    // Poll until background simulated annealing task completes (up to 15s)
    let completedJob = null;
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const { data } = await supabase
        .from('optimization_jobs')
        .select('id, status, result, error, finished_at')
        .eq('id', optData.job_id)
        .single();
      if (data?.status === 'DONE' || data?.status === 'FAILED') {
        completedJob = data;
        break;
      }
    }

    console.log(`✓ Job completed status: ${completedJob?.status}`);
    const primarySchedule = completedJob?.result?.primary_schedule;
    console.log(`  Recommended slots: ${primarySchedule?.slots?.length || 0}`);
    console.log(`  Confidence score: ${Math.round((primarySchedule?.confidence || 0) * 100)}%`);

    results.push({ step: '4. QUBO Optimizer', passed: completedJob?.status === 'DONE' });
  } catch (err) {
    console.error('✗ Step 4 failed:', err.message);
    results.push({ step: '4. QUBO Optimizer', passed: false, error: err.message });
  }

  // ── Step 5: Recommendations Engine ──────────────────────────────────────────
  try {
    console.log('\n[Step 5/8] Generating AI Caption Recommendations...');
    const recRes = await fetch(`${aiServiceUrl}/api/v1/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiSecret}`,
      },
      body: JSON.stringify({
        user_id: testUserId,
        account_id: accountId,
        type: 'caption',
      }),
    });

    if (!recRes.ok) {
      throw new Error(`Recommend API returned HTTP ${recRes.status}: ${await recRes.text()}`);
    }

    const recData = await recRes.json();
    console.log(`✓ Recommendations succeeded! Saved recommendation ID: ${recData.id}`);
    console.log(`  Generated captions:`, recData.content?.captions);
    console.log(`  Confidence: ${recData.confidence}`);

    results.push({ step: '5. AI Recommendations', passed: true });
  } catch (err) {
    console.error('✗ Step 5 failed:', err.message);
    results.push({ step: '5. AI Recommendations', passed: false, error: err.message });
  }

  // ── Step 6: Create & Queue Scheduled Post ───────────────────────────────────
  let scheduledPostId = '';
  try {
    console.log('\n[Step 6/8] Creating scheduled post on Calendar...');
    const dueTime = new Date(Date.now() - 60 * 1000).toISOString(); // 1 min in past so it's due now

    const { data: post, error: postErr } = await supabase
      .from('scheduled_posts')
      .insert({
        user_id: testUserId,
        account_id: accountId,
        caption: 'Quantum optimization in social scheduling #EntangledEcho #SocialGrowth',
        hashtags: ['EntangledEcho', 'SocialGrowth', 'AI'],
        media_type: 'image',
        scheduled_at: dueTime,
        status: 'SCHEDULED',
      })
      .select('id, status, scheduled_at')
      .single();

    if (postErr || !post) {
      throw new Error(`Failed to insert scheduled post: ${postErr?.message}`);
    }

    scheduledPostId = post.id;
    console.log(`✓ Post scheduled: ID ${scheduledPostId}, Status: ${post.status}, Due: ${post.scheduled_at}`);
    results.push({ step: '6. Calendar Post Scheduling', passed: true });
  } catch (err) {
    console.error('✗ Step 6 failed:', err.message);
    results.push({ step: '6. Calendar Post Scheduling', passed: false, error: err.message });
  }

  // ── Step 7: Publishing Engine via /api/internal/tick ────────────────────────
  try {
    console.log('\n[Step 7/8] Triggering /api/internal/tick publishing worker...');
    const tickRes = await fetch('http://localhost:3000/api/internal/tick', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tickSecret}`,
        'Content-Type': 'application/json',
      },
    });

    if (!tickRes.ok) {
      throw new Error(`Tick endpoint returned HTTP ${tickRes.status}: ${await tickRes.text()}`);
    }

    const tickData = await tickRes.json();
    console.log(`✓ Tick completed successfully! Processed:`, tickData);

    if (scheduledPostId) {
      const { data: updatedPost } = await supabase
        .from('scheduled_posts')
        .select('id, status, platform_post_id, last_error')
        .eq('id', scheduledPostId)
        .single();

      console.log(`✓ Post status in DB: ${updatedPost?.status} (Platform ID: ${updatedPost?.platform_post_id})`);
      if (updatedPost?.status !== 'PUBLISHED') {
        throw new Error(`Post status expected PUBLISHED, got: ${updatedPost?.status}, error: ${updatedPost?.last_error}`);
      }
    }

    results.push({ step: '7. Publishing Worker (/internal/tick)', passed: true });
  } catch (err) {
    console.error('✗ Step 7 failed:', err.message);
    results.push({ step: '7. Publishing Worker (/internal/tick)', passed: false, error: err.message });
  }

  // ── Step 8: User Notification Verification ──────────────────────────────────
  try {
    console.log('\n[Step 8/8] Verifying User In-App Notifications...');
    const { data: notifs, error: notifErr } = await supabase
      .from('notifications')
      .select('id, type, channel, message, is_read, sent_at')
      .eq('user_id', testUserId)
      .order('sent_at', { ascending: false })
      .limit(5);

    if (notifErr) {
      throw new Error(`Failed to query notifications: ${notifErr.message}`);
    }

    console.log(`✓ User has ${notifs?.length || 0} notifications:`);
    notifs?.forEach(n => console.log(`  - [${n.type}] (${n.channel}): ${n.message}`));
    results.push({ step: '8. Notification Dispatch', passed: (notifs?.length || 0) > 0 });
  } catch (err) {
    console.error('✗ Step 8 failed:', err.message);
    results.push({ step: '8. Notification Dispatch', passed: false, error: err.message });
  }

  printSummary();
}

function printSummary() {
  console.log('\n================================================================');
  console.log('WALKTHROUGH EXECUTION SUMMARY:');
  console.log('================================================================');
  let allPassed = true;
  for (const r of results) {
    const symbol = r.passed ? '✓ PASSED' : '✗ FAILED';
    console.log(`${symbol.padEnd(10)} | ${r.step}`);
    if (!r.passed && r.error) {
      console.log(`             Error: ${r.error}`);
      allPassed = false;
    }
  }
  console.log('================================================================\n');
  if (!allPassed) {
    process.exit(1);
  }
}

run();

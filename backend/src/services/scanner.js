const supabase = require('../db/supabase');
const { classifyPost } = require('./classifier');
const { sendAutoDM } = require('./messenger');
 
const SCAN_INTERVAL = 60 * 1000;
 
async function searchRedditViaApify(keyword, city) {
  const searchQuery = city ? `${keyword} ${city}` : keyword;
  const token = process.env.APIFY_TOKEN;
 
  console.log(`Searching Reddit via Apify for: "${searchQuery}"`);
 
  // Step 1: Start the run
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/scraper-engine~reddit-posts-search-scraper/runs?token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: [searchQuery],
        sortOrder: 'new',
        maxPosts: 15,
      }),
    }
  );
 
  if (!runRes.ok) {
    console.error(`Apify start run failed: ${runRes.status}`);
    return [];
  }
 
  const runData = await runRes.json();
  const runId = runData?.data?.id;
  const datasetId = runData?.data?.defaultDatasetId;
 
  if (!runId) {
    console.error('No run ID returned from Apify');
    return [];
  }
 
  console.log(`Apify run started: ${runId}`);
 
  // Step 2: Poll for completion (max 90 seconds)
  for (let i = 0; i < 18; i++) {
    await new Promise(r => setTimeout(r, 5000));
 
    const statusRes = await fetch(
      `https://api.apify.com/v2/acts/scraper-engine~reddit-posts-search-scraper/runs/${runId}?token=${token}`
    );
    const statusData = await statusRes.json();
    const status = statusData?.data?.status;
 
    console.log(`Apify run ${runId} status: ${status}`);
 
    if (status === 'SUCCEEDED') {
      // Step 3: Get results
      const resultsRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&limit=15`
      );
      const results = await resultsRes.json();
      console.log(`Apify returned ${results.length} posts for "${searchQuery}"`);
      return results;
    }
 
    if (status === 'FAILED' || status === 'TIMED-OUT' || status === 'ABORTED') {
      console.error(`Apify run ${runId} ended with status: ${status}`);
      return [];
    }
  }
 
  console.error(`Apify run ${runId} timed out after 90 seconds`);
  return [];
}
 
function startScanner() {
  console.log('Scanner service initialized. Scanning every 60 seconds.');
 
  setInterval(async () => {
    try {
      console.log('Running scheduled scan...');
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*');
 
      if (error) {
        console.error('Error fetching clients for scan:', error.message);
        return;
      }
 
      if (!clients || clients.length === 0) {
        console.log('No clients to scan for.');
        return;
      }
 
      for (const client of clients) {
        await scanForClient(client);
      }
 
      console.log('Scheduled scan complete.');
    } catch (error) {
      console.error('Scanner error:', error.message);
    }
  }, SCAN_INTERVAL);
}
 
async function scanForClient(client) {
  if (!client.keywords || client.keywords.length === 0) {
    console.log(`Skipping client ${client.id}: no keywords configured.`);
    return;
  }
 
  console.log(`Scanning for client ${client.id} with ${client.keywords.length} keywords...`);
 
  for (const keyword of client.keywords) {
    try {
      const posts = await searchRedditViaApify(keyword, client.city);
 
      for (const post of posts) {
        const postId = post.post_id || post.id;
        if (!postId) continue;
 
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('client_id', client.id)
          .eq('reddit_post_id', postId)
          .maybeSingle();
 
        if (existing) continue;
 
        const classification = await classifyPost(
          post.title || '',
          post.body || '',
          client.keywords
        );
 
        const { error: insertError } = await supabase
          .from('leads')
          .insert({
            client_id: client.id,
            reddit_post_id: postId,
            reddit_author: post.author,
            subreddit: post.subreddit,
            post_title: post.title,
            post_text: (post.body || '').substring(0, 5000),
            post_url: post.permalink
              ? `https://reddit.com${post.permalink}`
              : `https://reddit.com`,
            audience_type: classification.audience_type,
            intent_score: classification.intent_score,
            urgency: classification.urgency,
            matched_keyword: keyword,
          });
 
        if (insertError) {
          if (!insertError.message.includes('duplicate')) {
            console.error('Error inserting lead:', insertError.message);
          }
          continue;
        }
 
        console.log(`New lead: "${post.title}" (score: ${classification.intent_score})`);
      }
    } catch (error) {
      console.error(`Error scanning keyword "${keyword}":`, error.message);
    }
  }
}
 
async function scanNow(clientId) {
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();
 
  if (error || !client) {
    throw new Error('Client not found');
  }
 
  await scanForClient(client);
  return { message: 'Scan completed' };
}
 
module.exports = { startScanner, scanForClient, scanNow };

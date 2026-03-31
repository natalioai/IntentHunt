const supabase = require('../db/supabase');
const { classifyPost } = require('./classifier');
const { sendAutoDM } = require('./messenger');
 
const SCAN_INTERVAL = 61 * 1000;
const APIFY_TOKEN = process.env.APIFY_TOKEN || 'apify_api_dcvgMZzi1AfrP3GSaaWoaslS2IytIs3Iugzc';
 
async function searchRedditApify(keyword, city) {
  const searchQuery = city ? `${keyword} ${city}` : keyword;
  console.log(`Searching Reddit via Apify for: "${searchQuery}"`);
 
  try {
    // Start the Apify actor run
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/scraper-engine~reddit-posts-search-scraper/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQuery: searchQuery,
          maxItems: 25,
          sort: 'new',
          time: 'week',
        }),
      }
    );
 
    if (!runResponse.ok) {
      console.error(`Apify run failed: ${runResponse.status}`);
      return [];
    }
 
    const runData = await runResponse.json();
    const runId = runData?.data?.id;
    if (!runId) {
      console.error('No run ID returned from Apify');
      return [];
    }
 
    console.log(`Apify run started: ${runId}`);
 
    // Wait for run to complete (poll every 3 seconds, max 60 seconds)
    let status = 'RUNNING';
    let attempts = 0;
    while (status === 'RUNNING' && attempts < 20) {
      await new Promise(r => setTimeout(r, 3000));
      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
      );
      const statusData = await statusResponse.json();
      status = statusData?.data?.status;
      attempts++;
      console.log(`Apify run status: ${status} (attempt ${attempts})`);
    }
 
    if (status !== 'SUCCEEDED') {
      console.error(`Apify run did not succeed: ${status}`);
      return [];
    }
 
    // Get results
    const datasetId = runData?.data?.defaultDatasetId;
    const resultsResponse = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
    );
 
    if (!resultsResponse.ok) {
      console.error(`Failed to fetch Apify results: ${resultsResponse.status}`);
      return [];
    }
 
    const results = await resultsResponse.json();
    console.log(`Apify returned ${results.length} posts for "${searchQuery}"`);
    return results;
 
  } catch (err) {
    console.error(`Apify search error: ${err.message}`);
    return [];
  }
}
 
async function scanForClient(client) {
  const keywords = client.target_keywords || client.keywords || [];
 
  if (!keywords.length) {
    console.log(`Skipping client ${client.id}: no keywords configured.`);
    return;
  }
 
  console.log(`Scanning for client ${client.id} with ${keywords.length} keywords...`);
 
  for (const keyword of keywords) {
    try {
      const posts = await searchRedditApify(keyword, client.city);
 
      for (const post of posts) {
        // Normalize Apify result fields
        const postData = {
          id: post.id || post.postId || Math.random().toString(36).substr(2, 9),
          title: post.title || post.postTitle || '',
          selftext: post.text || post.body || post.selftext || '',
          author: post.username || post.author || 'unknown',
          subreddit: post.community || post.subreddit || 'unknown',
          url: post.url || post.postUrl || '',
        };
 
        if (!postData.title) continue;
 
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('client_id', client.id)
          .eq('post_id', postData.id)
          .maybeSingle();
 
        if (existing) continue;
 
        const classification = await classifyPost(
          postData.title,
          postData.selftext,
          keywords
        );
 
        if (classification.audience_type === 'Noise' || classification.intent_score < 30) {
          continue;
        }
 
        const { data: newLead, error: insertError } = await supabase
          .from('leads')
          .insert({
            client_id: client.id,
            post_id: postData.id,
            post_title: postData.title,
            post_content: postData.selftext?.substring(0, 2000) || '',
            author: postData.author,
            subreddit: postData.subreddit,
            url: postData.url,
            intent_score: classification.intent_score,
            category: classification.audience_type,
            status: 'new',
            source: 'reddit',
            contact_info: {
              urgency: classification.urgency,
              matched_keyword: keyword,
              reasoning: classification.reasoning,
            },
          })
          .select()
          .single();
 
        if (insertError) {
          if (!insertError.message?.includes('duplicate') && insertError.code !== '23505') {
            console.error('Error inserting lead:', insertError.message);
          }
          continue;
        }
 
        console.log(`New lead: "${postData.title?.slice(0, 60)}" (score: ${classification.intent_score})`);
 
        if (
          classification.audience_type !== 'Noise' &&
          classification.intent_score >= (client.auto_dm_threshold || 70) &&
          client.auto_dm_enabled &&
          newLead
        ) {
          await sendAutoDM(client, newLead);
        }
      }
 
    } catch (err) {
      console.error(`Error scanning keyword "${keyword}": ${err.message}`);
    }
  }
}
 
async function runScan() {
  try {
    console.log('Running scheduled scan...');
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .eq('is_active', true);
 
    if (error) {
      console.error('Error fetching clients for scan:', error.message);
      return;
    }
 
    if (!clients?.length) {
      console.log('No active clients to scan for.');
      return;
    }
 
    for (const client of clients) {
      await scanForClient(client);
    }
 
    console.log('Scan complete.');
  } catch (err) {
    console.error('Scanner error:', err.message);
  }
}
 
async function scanNow(clientId) {
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();
 
  if (error || !client) throw new Error('Client not found');
 
  await scanForClient(client);
  return { message: 'Scan completed' };
}
 
function startScanner() {
  console.log('Scanner service initialized. Scanning every 60 seconds.');
  runScan();
  setInterval(runScan, SCAN_INTERVAL);
}
 
module.exports = { startScanner, scanForClient, scanNow };

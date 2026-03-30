
Copy

const supabase = require('../db/supabase');
const { classifyPost } = require('./classifier');
const { sendAutoDM } = require('./messenger');
 
const SCAN_INTERVAL = 60 * 1000;
 
async function searchRedditRSS(keyword, city) {
  const searchQuery = city ? `${keyword} ${city}` : keyword;
  const encoded = encodeURIComponent(searchQuery);
  
  // Try multiple Reddit endpoints to avoid blocks
  const urls = [
    `https://www.reddit.com/search.json?q=${encoded}&sort=new&limit=25&t=week`,
    `https://old.reddit.com/search.json?q=${encoded}&sort=new&limit=25&t=week`,
  ];
 
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': process.env.REDDIT_USER_AGENT || 'Mozilla/5.0 (compatible; IntentHunt/1.0)',
          'Accept': 'application/json',
        },
      });
 
      if (response.ok) {
        const data = await response.json();
        const posts = data?.data?.children || [];
        if (posts.length > 0) {
          console.log(`Found ${posts.length} posts for "${keyword}" via ${url}`);
          return posts.map(p => p.data);
        }
      } else {
        console.log(`${url} returned ${response.status}, trying next...`);
      }
    } catch (err) {
      console.log(`Fetch error for ${url}: ${err.message}`);
    }
  }
 
  // Fallback: use Pushshift (alternative Reddit archive)
  try {
    const psUrl = `https://api.pushshift.io/reddit/search/submission/?q=${encoded}&sort=desc&size=25`;
    const psResponse = await fetch(psUrl, {
      headers: { 'User-Agent': 'IntentHunt/1.0' }
    });
    if (psResponse.ok) {
      const psData = await psResponse.json();
      const posts = psData?.data || [];
      console.log(`Pushshift found ${posts.length} posts for "${keyword}"`);
      return posts.map(p => ({
        id: p.id,
        title: p.title,
        selftext: p.selftext || '',
        author: p.author,
        subreddit: p.subreddit,
        permalink: `/r/${p.subreddit}/comments/${p.id}/`,
        score: p.score || 0,
      }));
    }
  } catch (err) {
    console.log(`Pushshift error: ${err.message}`);
  }
 
  console.log(`No results found for "${keyword}" from any source.`);
  return [];
}
 
async function scanForClient(client) {
  const keywords = client.target_keywords || client.keywords || [];
  
  if (!keywords.length) {
    console.log(`Skipping client ${client.id}: no keywords configured.`);
    return;
  }
 
  console.log(`Scanning for client ${client.id} with keywords: ${keywords.join(', ')}`);
 
  for (const keyword of keywords) {
    try {
      const posts = await searchRedditRSS(keyword, client.city);
 
      for (const postData of posts) {
        // Check if lead already exists
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('client_id', client.id)
          .eq('post_id', postData.id)
          .maybeSingle();
 
        if (existing) continue;
 
        // Classify the post
        const classification = await classifyPost(
          postData.title,
          postData.selftext,
          keywords
        );
 
        if (classification.audience_type === 'Noise' || classification.intent_score < 30) {
          continue;
        }
 
        // Insert lead
        const { data: newLead, error: insertError } = await supabase
          .from('leads')
          .insert({
            client_id: client.id,
            post_id: postData.id,
            post_title: postData.title,
            post_content: postData.selftext?.substring(0, 2000) || '',
            author: postData.author,
            subreddit: postData.subreddit,
            url: `https://reddit.com${postData.permalink}`,
            intent_score: classification.intent_score,
            category: classification.audience_type,
            status: 'new',
            source: 'reddit',
            contact_info: {
              urgency: classification.urgency,
              matched_keyword: classification.matched_keyword,
              reasoning: classification.reasoning,
            },
          })
          .select()
          .single();
 
        if (insertError) {
          if (!insertError.message?.includes('duplicate') && !insertError.code === '23505') {
            console.error('Error inserting lead:', insertError.message);
          }
          continue;
        }
 
        console.log(`✅ New lead: "${postData.title?.slice(0, 60)}" (score: ${classification.intent_score}, type: ${classification.audience_type})`);
 
        // Auto-DM if enabled
        if (
          classification.audience_type !== 'Noise' &&
          classification.intent_score >= (client.auto_dm_threshold || 70) &&
          client.auto_dm_enabled &&
          newLead
        ) {
          await sendAutoDM(client, newLead);
        }
      }
 
      // Rate limit between keywords
      await new Promise(r => setTimeout(r, 3000));
 
    } catch (err) {
      console.error(`Error scanning keyword "${keyword}":`, err.message);
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

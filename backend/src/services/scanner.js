const supabase = require('../db/supabase');
const { classifyPost } = require('./classifier');
const { sendAutoDM } = require('./messenger');
 
const SCAN_INTERVAL = 60 * 1000;
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '884af8f64d4b45c28716ef4d13252c3d';
 
async function searchReddit(keyword, city) {
  const searchQuery = city ? `${keyword} ${city}` : keyword;
  const encoded = encodeURIComponent(searchQuery);
  const redditUrl = `https://www.reddit.com/search.json?q=${encoded}&sort=new&limit=25&t=week`;
  const scraperUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(redditUrl)}`;
 
  try {
    console.log(`Searching Reddit for: "${searchQuery}"`);
    const response = await fetch(scraperUrl);
 
    if (!response.ok) {
      console.error(`ScraperAPI returned ${response.status} for "${keyword}"`);
      return [];
    }
 
    const data = await response.json();
    const posts = data?.data?.children || [];
    console.log(`Found ${posts.length} posts for "${keyword}"`);
    return posts.map(p => p.data);
  } catch (err) {
    console.error(`Search error for "${keyword}": ${err.message}`);
    return [];
  }
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
      const posts = await searchReddit(keyword, client.city);
 
      for (const postData of posts) {
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
          if (!insertError.message?.includes('duplicate') && insertError.code !== '23505') {
            console.error('Error inserting lead:', insertError.message);
          }
          continue;
        }
 
        console.log(`New lead: "${postData.title?.slice(0, 60)}" (score: ${classification.intent_score}, type: ${classification.audience_type})`);
 
        if (
          classification.audience_type !== 'Noise' &&
          classification.intent_score >= (client.auto_dm_threshold || 70) &&
          client.auto_dm_enabled &&
          newLead
        ) {
          await sendAutoDM(client, newLead);
        }
      }
 
      await new Promise(r => setTimeout(r, 2000));
 
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

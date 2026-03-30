const supabase = require('../db/supabase');
const { classifyPost } = require('./classifier');
const { sendAutoDM } = require('./messenger');

const SCAN_INTERVAL = 60 * 1000;

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
      const searchQuery = client.city
        ? `${keyword} ${client.city}`
        : keyword;

      const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(searchQuery)}&sort=new&limit=10&t=day`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': process.env.REDDIT_USER_AGENT || 'IntentHunt/1.0 (by /u/intenthunt)',
        },
      });

      if (!response.ok) {
        console.error(`Reddit search failed for "${keyword}": ${response.status}`);
        continue;
      }

      const data = await response.json();
      const posts = data?.data?.children || [];

      console.log(`Found ${posts.length} posts for keyword "${keyword}"`);

      for (const post of posts) {
        const postData = post.data;

        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('client_id', client.id)
          .eq('reddit_post_id', postData.id)
          .single();

        if (existing) {
          continue;
        }

        const classification = await classifyPost(
          postData.title,
          postData.selftext,
          client.keywords
        );

        const { data: newLead, error: insertError } = await supabase
          .from('leads')
          .insert({
            client_id: client.id,
            reddit_post_id: postData.id,
            reddit_author: postData.author,
            subreddit: postData.subreddit,
            post_title: postData.title,
            post_text: postData.selftext?.substring(0, 5000) || '',
            post_url: `https://reddit.com${postData.permalink}`,
            audience_type: classification.audience_type,
            intent_score: classification.intent_score,
            urgency: classification.urgency,
            matched_keyword: classification.matched_keyword,
          })
          .select()
          .single();

        if (insertError) {
          if (!insertError.message.includes('duplicate')) {
            console.error('Error inserting lead:', insertError.message);
          }
          continue;
        }

        console.log(`New lead: "${postData.title}" (score: ${classification.intent_score}, type: ${classification.audience_type})`);

        if (
          classification.audience_type !== 'Noise' &&
          classification.intent_score >= (client.auto_dm_threshold || 70) &&
          client.auto_dm_enabled &&
          newLead
        ) {
          console.log(`Auto-DM triggered for lead ${newLead.id}`);
          await sendAutoDM(client, newLead);
        }
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

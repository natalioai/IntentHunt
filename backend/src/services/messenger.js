const snoowrap = require('snoowrap');
const supabase = require('../db/supabase');

function getRedditClient(client) {
  return new snoowrap({
    userAgent: process.env.REDDIT_USER_AGENT || 'IntentHunt/1.0',
    clientId: process.env.REDDIT_CLIENT_ID,
    clientSecret: process.env.REDDIT_CLIENT_SECRET,
    accessToken: client.reddit_access_token,
    refreshToken: client.reddit_refresh_token,
  });
}

async function getDMCount(clientId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('status', 'sent')
    .gte('sent_at', oneHourAgo);

  if (error) {
    console.error('Error getting DM count:', error.message);
    return 0;
  }

  return count || 0;
}

async function sendAutoDM(client, lead) {
  try {
    // Check rate limit: max 10 messages per hour
    const dmCount = await getDMCount(client.id);
    if (dmCount >= 10) {
      console.log(`Rate limit reached for client ${client.id}. ${dmCount}/10 DMs sent this hour.`);
      return;
    }

    // Get client's default template
    const { data: template } = await supabase
      .from('templates')
      .select('*')
      .eq('client_id', client.id)
      .eq('is_default', true)
      .single();

    let subject, body;

    if (template) {
      subject = template.subject;
      body = template.body;
    } else {
      // Fallback template
      subject = `Quick question about your post in r/{{subreddit}}`;
      body = `Hi {{author}},\n\nI noticed your post "{{post_title}}" in r/{{subreddit}} and thought I could help.\n\nI run {{business_name}} and we specialize in exactly what you're looking for.\n\nWould you be open to a quick chat?\n\nBest regards`;
    }

    // Personalize message
    const personalizedSubject = personalizeMessage(subject, client, lead);
    const personalizedBody = personalizeMessage(body, client, lead);

    // Send via snoowrap
    const reddit = getRedditClient(client);
    await reddit.composeMessage({
      to: lead.reddit_author,
      subject: personalizedSubject,
      text: personalizedBody,
    });

    console.log(`DM sent to ${lead.reddit_author} for client ${client.id}`);

    // Insert message record
    await supabase.from('messages').insert({
      client_id: client.id,
      lead_id: lead.id,
      reddit_author: lead.reddit_author,
      message_subject: personalizedSubject,
      message_body: personalizedBody,
      status: 'sent',
    });

    // Update lead
    await supabase
      .from('leads')
      .update({ dm_sent: true, dm_sent_at: new Date().toISOString() })
      .eq('id', lead.id);

  } catch (error) {
    console.error(`Failed to send DM to ${lead.reddit_author}:`, error.message);

    // Insert failed message record
    await supabase.from('messages').insert({
      client_id: client.id,
      lead_id: lead.id,
      reddit_author: lead.reddit_author,
      message_subject: 'Failed to send',
      message_body: error.message,
      status: 'failed',
    });
  }
}

function personalizeMessage(text, client, lead) {
  return text
    .replace(/\{\{author\}\}/g, lead.reddit_author || 'there')
    .replace(/\{\{subreddit\}\}/g, lead.subreddit || '')
    .replace(/\{\{keyword\}\}/g, lead.matched_keyword || '')
    .replace(/\{\{post_title\}\}/g, lead.post_title || '')
    .replace(/\{\{business_name\}\}/g, client.business_name || 'our company');
}

module.exports = { sendAutoDM, getDMCount, getRedditClient };

const Anthropic = require('@anthropic-ai/sdk');

async function classifyPost(title, text, keywords) {
  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const keywordList = keywords.join(', ');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6-20250627',
      max_tokens: 256,
      system: 'You are a buying intent classifier. Analyze social media posts and determine if they express buying intent. Return JSON only.',
      messages: [
        {
          role: 'user',
          content: `Analyze this Reddit post for buying intent.

Post Title: ${title}
Post Text: ${text || '(no body text)'}

Client's Keywords: ${keywordList}

Return a JSON object with exactly these fields:
- audience_type: "B2C", "B2B", or "Noise"
- intent_score: 0-100 (how strong the buying intent is)
- urgency: "low", "medium", or "high"
- matched_keyword: which keyword from the list matched (or null if none)

Return ONLY valid JSON, no markdown, no explanation.`,
        },
      ],
    });

    const content = response.content[0].text.trim();
    const parsed = JSON.parse(content);

    // Validate and sanitize the response
    const validAudienceTypes = ['B2C', 'B2B', 'Noise'];
    const validUrgencies = ['low', 'medium', 'high'];

    return {
      audience_type: validAudienceTypes.includes(parsed.audience_type) ? parsed.audience_type : 'Noise',
      intent_score: Math.max(0, Math.min(100, parseInt(parsed.intent_score) || 0)),
      urgency: validUrgencies.includes(parsed.urgency) ? parsed.urgency : 'low',
      matched_keyword: parsed.matched_keyword || null,
    };
  } catch (error) {
    console.error('Classification error:', error.message);
    return {
      audience_type: 'Noise',
      intent_score: 0,
      urgency: 'low',
      matched_keyword: null,
    };
  }
}

module.exports = { classifyPost };

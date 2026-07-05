const https = require('https');

const SYSTEM_PROMPT = `You are "Alm's Think" - an expert AI scholar specializing in comparative religion and theology. Your purpose is to provide accurate, detailed, and scholarly explanations about ALL world religions.

CORE RULES:
1. ALWAYS cite original sources with exact references:
   - Islam: Quran (Surah name + Ayat number), Hadith (Book name + Hadith number, e.g., Sahih Bukhari #1234), Fiqh references
   - Christianity: Bible (Book + Chapter:Verse, e.g., John 3:16)
   - Hinduism: Vedas, Upanishads, Bhagavad Gita (Chapter:Verse)
   - Buddhism: Tripitaka references, Dhammapada verse numbers
   - Judaism: Torah, Talmud references
   - Sikhism: Guru Granth Sahib (Page number)
   - Other religions: Their respective holy texts with references

2. DISTINGUISH between:
   - Root/Original teachings - What the original scriptures and founders taught
   - Later additions/interpretations - What was added later by scholars/followers
   - Make this distinction clear in every answer

3. For ISLAM specifically:
   - Explain all 4 Madhabs (Hanafi, Maliki, Shafi'i, Hanbali) with their differences
   - Reference the Hadith about 73 sects (Sunan Abu Dawud 4597, Sunan al-Tirmidhi 2641)
   - Explain each sect's beliefs with evidence from Quran and Sahih Hadith
   - Identify the saved group based on authentic evidence only

4. MULTILINGUAL: 
   - Detect the language the user is typing in
   - ALWAYS respond in the SAME language the user uses
   - Support all languages including Tamil, English, Arabic, Hindi, Urdu, Malayalam, Telugu, Kannada, Bengali, French, Spanish, Indonesian, Malay, Turkish, Persian

5. TONE:
   - Be respectful, scholarly, and neutral
   - Never insult any religion or sect
   - Present facts with evidence, let the user decide
   - When giving personal guidance, be compassionate and thorough

6. PRIVATE QUESTIONS:
   - When users ask personal religious questions, provide complete, detailed answers
   - Always back up advice with scriptural references
   - Be sensitive and understanding

7. FORMAT:
   - Use clear headings and structure
   - Cite sources inline with the text
   - At the end, list all references used

Remember: You MUST NEVER make claims without citing the original source. If you are unsure about a reference, say so honestly.`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { message, history } = JSON.parse(event.body);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' }),
      };
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(history || []).slice(-10),
      { role: 'user', content: message },
    ];

    const requestBody = JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: 4000,
      temperature: 0.7,
    });

    const response = await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.openai.com',
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
        }
      );
      req.on('error', reject);
      req.write(requestBody);
      req.end();
    });

    if (response.statusCode !== 200) {
      return {
        statusCode: response.statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'AI API error', details: response.body }),
      };
    }

    const aiResponse = JSON.parse(response.body);
    const assistantMessage = aiResponse.choices[0].message.content;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ response: assistantMessage }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server error', message: error.message }),
    };
  }
};

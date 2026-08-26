require('dotenv').config();
const OpenAI = require('openai');

async function testMinimalMindRouter() {
  const apiKey = process.env.MINDROUTER_API_KEY;
  const baseURL = process.env.MINDROUTER_BASE_URL || 'https://api.mindrouter.io/v1';
  const model = process.env.MINDROUTER_MODEL || 'openai/gpt-5.6-luna';

  console.log('--- AUDIT KONFIGURASI MINDROUTER ---');
  console.log('MINDROUTER_BASE_URL:', baseURL);
  console.log('MINDROUTER_MODEL:', model);
  console.log('MINDROUTER_API_KEY (length):', apiKey ? apiKey.length : 0);
  console.log('MINDROUTER_API_KEY (preview):', apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'MISSING');

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
  });

  try {
    console.log('\nMengirim request minimal chat.completions.create()...');
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'user', content: 'Reply with exactly: OK' }
      ],
    });

    console.log('\n--- SUCCESS ---');
    console.log('Response Status: OK');
    console.log('Response Message:', response.choices[0]?.message?.content);
    console.log('Full Choice:', JSON.stringify(response.choices[0], null, 2));
  } catch (error) {
    console.log('\n--- ERROR DETAILS ---');
    console.log('Error Name:', error.name);
    console.log('Error Message:', error.message);
    console.log('Error Status:', error.status || error.statusCode);
    console.log('Error Code:', error.code);
    console.log('Error Type:', error.type);
    console.log('Error Headers:', error.headers);
    if (error.response) {
      console.log('Error Response Data:', error.response.data);
    }
  }
}

testMinimalMindRouter();

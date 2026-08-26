require('dotenv').config();

async function checkModels() {
  const apiKey = process.env.MINDROUTER_API_KEY;
  const baseURL = (process.env.MINDROUTER_BASE_URL || 'https://api.mindrouter.io/v1').replace(/\/+$/, '');
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  try {
    const res = await fetch(`${baseURL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': userAgent,
      },
    });
    const json = await res.json();
    console.log('Available models:', json.data ? json.data.map(m => m.id) : json);
  } catch (err) {
    console.log('Error listing models:', err.message);
  }
}

checkModels();

require('dotenv').config();

async function testTemperature() {
  const apiKey = process.env.MINDROUTER_API_KEY;
  const baseURL = process.env.MINDROUTER_BASE_URL || 'https://api.mindrouter.io/v1';
  const model = process.env.MINDROUTER_MODEL || 'openai/gpt-5.6-luna';

  const temps = [undefined, 1, 0.7, 0.5, 0.1, 0];

  for (const temp of temps) {
    console.log(`\n--- Testing temperature: ${temp} ---`);
    try {
      const bodyObj = {
        model,
        messages: [{ role: 'user', content: 'Say hi' }],
      };
      if (temp !== undefined) {
        bodyObj.temperature = temp;
      }

      const res = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyObj),
      });

      console.log(`Temp ${temp} -> Status:`, res.status, res.statusText);
      const text = await res.text();
      if (res.status === 200) {
        const json = JSON.parse(text);
        console.log('Result:', json.choices[0]?.message?.content);
      } else {
        console.log('Error Body:', text.slice(0, 150));
      }
    } catch (err) {
      console.log(`Temp ${temp} Error:`, err.message);
    }
  }
}

testTemperature();

export default async function handler(req, res) {
  const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // 1. OPTIONS: Always Allow (CORS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!SCRIPT_URL) {
    return res.status(500).json({ result: 'error', msg: 'Server Configuration Error: GOOGLE_SCRIPT_URL is missing.' });
  }

  // [Security Logic] Public vs Private Separation
  const isPublic = req.query.type === 'public';

  if (!isPublic) {
    const serverPassword = process.env.ADMIN_PASSWORD;
    const clientPassword = req.headers['x-admin-password'];

    if (serverPassword && clientPassword !== serverPassword) {
      return res.status(401).json({ result: 'error', msg: 'Unauthorized: Incorrect or Missing Admin Password' });
    }
  }

  try {
    // Construct Target URL with Query Params (Forwarding type, action, etc.)
    const targetUrl = new URL(SCRIPT_URL);
    Object.keys(req.query).forEach(key => {
      targetUrl.searchParams.append(key, req.query[key]);
    });

    const options = {
      method: req.method,
      headers: {}
    };

    // [New Code] Security Check for POST requests
    if (req.method === 'POST') {
      // Vercel parses x-www-form-urlencoded body into an object automatically.
      // Vercel parses x-www-form-urlencoded body into an object automatically.
      // We convert it back to URLSearchParams to forward it to Google Apps Script.
      // Note: If the client sends JSON, req.body is a JSON object. 
      // The original frontend code uses URLSearchParams which sends x-www-form-urlencoded.
      // We assume x-www-form-urlencoded here based on the user's existing frontend code.

      const formBody = new URLSearchParams(req.body);
      options.body = formBody;
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    // Call Google Apps Script
    const googleResponse = await fetch(targetUrl.toString(), options);

    const text = await googleResponse.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON from Google Script:", text);
      return res.status(502).json({ result: 'error', msg: 'Invalid response from backend', raw: text });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ result: 'error', msg: error.message });
  }
}

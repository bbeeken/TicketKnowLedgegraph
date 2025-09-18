import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { ticketId, attachmentId } = req.query;
  if (!ticketId || !attachmentId) {
    return res.status(400).json({ error: 'Missing ticketId or attachmentId' });
  }

  // Get the user's access token from cookies or session (client will send it)
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  // Compose the backend API URL
  const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api'}/tickets/${ticketId}/attachments/${attachmentId}/download`;

  // Proxy the request with the Authorization header
  const backendRes = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': authHeader as string,
      // Accept all content types
    },
  });

  if (!backendRes.ok) {
    const text = await backendRes.text();
    return res.status(backendRes.status).send(text);
  }

  // Copy headers (content-type, etc.)
  backendRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'content-encoding') return; // avoid double encoding
    res.setHeader(key, value);
  });

  // Stream the response using Web Streams API
  const body = backendRes.body;
  if (body) {
    const reader = body.getReader();
    res.statusCode = 200;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) res.write(Buffer.from(value));
    }
    res.end();
  } else {
    res.status(500).send('No content');
  }
}

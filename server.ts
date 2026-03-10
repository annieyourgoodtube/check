import express from 'express';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // OAuth Configuration
  const getOauth2Client = (req: express.Request) => {
    // Determine the base URL dynamically or use APP_URL
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    // Ensure no trailing slash for the base URL before appending path
    const redirectUri = `${baseUrl.replace(/\/$/, '')}/auth/callback`;
    
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
  };

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/proxy-sheet', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Missing URL parameter' });
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const text = await response.text();
      res.send(text);
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).json({ error: 'Failed to fetch sheet data' });
    }
  });

  app.get('/api/auth/url', (req, res) => {
    try {
      const oauth2Client = getOauth2Client(req);
      const scopes = [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly'
      ];

      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
      });

      res.json({ url });
    } catch (error) {
      console.error('Error generating auth URL:', error);
      res.status(500).json({ error: 'Failed to generate auth URL' });
    }
  });

  app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
    const { code } = req.query;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).send('Missing authorization code');
    }

    try {
      const oauth2Client = getOauth2Client(req);
      const { tokens } = await oauth2Client.getToken(code);
      
      // Send success message to parent window and close popup
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  tokens: ${JSON.stringify(tokens)} 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      res.status(500).send('Authentication failed');
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);

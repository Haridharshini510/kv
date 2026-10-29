const { Router } = require('express');

const router = Router();

// Default PIN if not set in environment (for development)
const APP_PIN = process.env.APP_PIN || '1234';
const APP_TOKEN = process.env.APP_TOKEN || 'kadaivoice-dev-token';

// POST /api/v1/auth/login — verify PIN and return a session token
router.post('/login', (req, res) => {
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ error: 'PIN is required' });
  }

  // Convert both to strings and trim for comparison
  const pinStr = String(pin).trim();
  const expectedPin = String(APP_PIN).trim();

  if (pinStr !== expectedPin) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }

  res.json({ token: APP_TOKEN });
});

module.exports = router;

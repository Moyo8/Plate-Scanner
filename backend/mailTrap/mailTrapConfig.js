const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { MailtrapClient } = require('mailtrap');

const TOKEN = process.env.MAILTRAP_TOKEN || '';
if (!TOKEN) {
  console.warn('Warning: MAILTRAP_TOKEN not set in environment; emails will be skipped (dev mode).');
}

let client = null;
if (TOKEN) {
  client = new MailtrapClient({ token: TOKEN });
}

const DEFAULT_SENDER = {
  email: process.env.MAILTRAP_SENDER_EMAIL || 'hello@demomailtrap.co',
  name: process.env.MAILTRAP_SENDER_NAME || 'PlateScanner',
};

/**
 * sendMail helper
 * @param {{to: Array<{email:string}>, subject: string, text?: string, html?: string}} options
 */
async function sendMail({ to, subject, text, html, from } = {}) {
  if (!to || !Array.isArray(to) || to.length === 0) {
    throw new Error('sendMail requires `to` array with at least one recipient');
  }

  const payload = {
    from: from || DEFAULT_SENDER,
    to,
    subject,
    text,
    html,
  };
  if (!client) {
    console.log('mailTrap: skipping send (no MAILTRAP_TOKEN). payload:', { to, subject });
    return Promise.resolve({ skipped: true });
  }

  return client.send(payload);
}

module.exports = { sendMail };
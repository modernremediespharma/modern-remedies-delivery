const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, type, patientName, driverName, stopsAway, eta } = req.body;

  if (!to || !type) {
    return res.status(400).json({ error: 'Missing required fields: to, type' });
  }

  // Build message based on notification type
  let message = '';

  if (type === 'out_for_delivery') {
    message = `Hi ${patientName || 'there'}! This is Modern Remedies Pharmacy. Your prescription delivery is on its way today with ${driverName || 'your driver'}. We'll text you when you're 2 stops away. Track your delivery: https://modern-remedies-delivery.vercel.app/track.html`;
  } else if (type === 'two_stops_away') {
    message = `Modern Remedies: Your delivery is 2 stops away — estimated arrival in about ${eta || '15-20 minutes'}. Please be available or leave instructions at: https://modern-remedies-delivery.vercel.app/track.html`;
  } else if (type === 'next_stop') {
    message = `Modern Remedies: ${driverName || 'Your driver'} is making their next stop and will be at your door very soon! Track here: https://modern-remedies-delivery.vercel.app/track.html`;
  } else if (type === 'delivered') {
    message = `Modern Remedies: Your prescription has been delivered! If you have any questions please call us at (718) 222-1865. Thank you!`;
  } else if (type === 'missed_delivery') {
    message = `Modern Remedies: We attempted to deliver your prescription but couldn't reach you. Please reschedule or leave instructions at: https://modern-remedies-delivery.vercel.app/track.html — or call us at (718) 222-1865.`;
  } else if (type === 'reschedule_confirm') {
    message = `Modern Remedies: Your delivery has been rescheduled for tomorrow. We'll text you when it's on its way. Questions? Call (718) 222-1865.`;
  } else if (type === 'custom') {
    message = req.body.message;
  } else {
    return res.status(400).json({ error: 'Invalid notification type' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Could not build message' });
  }

  // Send SMS via Twilio
  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const body = new URLSearchParams({
      To: to,
      From: fromNumber,
      Body: message
    });

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json({ 
        success: true, 
        sid: data.sid,
        message: `SMS sent to ${to}` 
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        error: data.message || 'Failed to send SMS' 
      });
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

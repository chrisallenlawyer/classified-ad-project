// Vercel Serverless Function for sending emails
// ES Module version for compatibility with "type": "module"

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📧 Email function called');
    console.log('📧 Request method:', req.method);
    console.log('📧 Request body type:', typeof req.body);
    console.log('📧 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📧 API Key available:', !!process.env.RESEND_API_KEY);
    console.log('📧 API Key prefix:', process.env.RESEND_API_KEY?.substring(0, 10));
    
    // Handle both old and new request formats
    const { to, name, subject, html, text, from, replyTo, emailType } = req.body;
    
    if (!to) {
      console.log('📧 Error: No email address provided');
      return res.status(400).json({ error: 'Email address is required' });
    }

    // Check for API key in different possible locations
    const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    
    if (!apiKey) {
      console.log('📧 Error: No API key found');
      console.log('📧 Available env vars:', Object.keys(process.env).filter(k => k.includes('RESEND')));
      return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
    }
    
    // Validate API key format
    if (!apiKey.startsWith('re_')) {
      console.log('📧 Error: Invalid API key format');
      return res.status(500).json({ error: 'Invalid RESEND_API_KEY format' });
    }

    // Try to import and use Resend
    console.log('📧 Importing Resend...');
    let Resend;
    try {
      const resendModule = await import('resend');
      Resend = resendModule.Resend;
      console.log('📧 Resend imported successfully');
    } catch (importError) {
      console.error('📧 Failed to import Resend:', importError);
      return res.status(500).json({ error: 'Resend package not available: ' + importError.message });
    }
    
    console.log('📧 Creating Resend instance...');
    const resend = new Resend(apiKey);

    console.log('📧 Sending email to:', to, 'Type:', emailType || 'test');

    // Use provided email content or fallback to default test email
    const emailData = {
      from: from || 'notifications@bamaclassifieds.com',
      to: to,
      replyTo: replyTo || 'support@bamaclassifieds.com',
      subject: subject || 'Welcome to Bama Classifieds!',
      html: html || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3B82F6, #1D4ED8); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Bama Classifieds!</h1>
          </div>
          
          <div style="padding: 40px 20px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${name || 'there'}!</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Thank you for testing our email service! This confirms that email notifications are working correctly.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://bamaclassifieds.com/create" 
                 style="background: #3B82F6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Create Your First Listing
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 40px;">
              Need help? Contact us at <a href="mailto:support@bamaclassifieds.com" style="color: #3B82F6;">support@bamaclassifieds.com</a>
            </p>
          </div>
          
          <div style="background: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>© 2025 Bama Classifieds. All rights reserved.</p>
          </div>
        </div>
      `,
      text: text || `Welcome to Bama Classifieds!

Hi ${name || 'there'}!

Thank you for testing our email service! This confirms that email notifications are working correctly.

Get started: https://bamaclassifieds.com/create

Need help? Contact us at support@bamaclassifieds.com

© 2025 Bama Classifieds. All rights reserved.
Visit: https://bamaclassifieds.com`
    };

    console.log('📧 Email data being sent:', JSON.stringify(emailData, null, 2));
    
    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      console.error('📧 Resend error details:', {
        error,
        errorType: typeof error,
        errorKeys: Object.keys(error || {}),
        fullError: JSON.stringify(error, null, 2)
      });
      return res.status(400).json({ error: error.message || error });
    }

    console.log('📧 Email sent successfully:', data);
    res.json({ success: true, data });

  } catch (error) {
    console.error('📧 Email service error:', error);
    res.status(500).json({ error: 'Failed to send email: ' + error.message });
  }
}

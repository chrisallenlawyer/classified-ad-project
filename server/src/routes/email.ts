import { Router } from 'express';
import { Resend } from 'resend';

const router = Router();

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
const EMAIL_CONFIG = {
  from: 'onboarding@resend.dev', // Use Resend's default domain for testing
  replyTo: 'support@bamaclassifieds.com'
};

// Send test email endpoint
router.post('/test', async (req, res) => {
  try {
    const { to, name } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    console.log('📧 Sending test email to:', to);
    console.log('📧 API Key available:', !!process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: 'Welcome to Bama Classifieds!',
      html: `
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
              <a href="https://bamaclassifieds.com" 
                 style="background: #3B82F6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Visit Bama Classifieds
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 40px;">
              This is a test email from the Bama Classifieds email service.
            </p>
          </div>
          
          <div style="background: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>© 2025 Bama Classifieds. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `Welcome to Bama Classifieds!

Hi ${name || 'there'}!

Thank you for testing our email service! This confirms that email notifications are working correctly.

Visit: https://bamaclassifieds.com

This is a test email from the Bama Classifieds email service.

© 2025 Bama Classifieds`
    });

    if (error) {
      console.error('📧 Resend error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('📧 Email sent successfully:', data);
    res.json({ success: true, data });

  } catch (error) {
    console.error('📧 Email service error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Send email endpoint (matches frontend expectation)
router.post('/send', async (req, res) => {
  try {
    const { to, subject, html, text, from, replyTo, emailType, name } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    console.log('📧 Sending email to:', to, 'Type:', emailType || 'generic');
    console.log('📧 API Key available:', !!process.env.RESEND_API_KEY);

    if (!process.env.RESEND_API_KEY) {
      console.error('📧 No RESEND_API_KEY found in environment');
      return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
    }

    const emailData = {
      from: from || EMAIL_CONFIG.from,
      to: to,
      replyTo: replyTo || EMAIL_CONFIG.replyTo,
      subject: subject || 'Email from Bama Classifieds',
      html: html || `<p>Hello ${name || 'there'}!</p><p>This is a test email from Bama Classifieds.</p>`,
      text: text || `Hello ${name || 'there'}! This is a test email from Bama Classifieds.`
    };

    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      console.error('📧 Resend error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('📧 Email sent successfully:', data);
    res.json({ success: true, data });

  } catch (error) {
    console.error('📧 Email service error:', error);
    res.status(500).json({ error: 'Failed to send email: ' + error.message });
  }
});

export default router;

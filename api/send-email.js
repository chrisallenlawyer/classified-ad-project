// Vercel Serverless Function for sending emails
// This will work with your current Vercel deployment

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
    const { to, name, type = 'welcome' } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    console.log('📧 Sending email to:', to, 'Type:', type);
    console.log('📧 API Key available:', !!process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: 'notifications@bamaclassifieds.com',
      to: to,
      replyTo: 'support@bamaclassifieds.com',
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
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
              You can now:
            </p>
            
            <ul style="color: #4b5563; line-height: 1.8; margin-bottom: 30px;">
              <li>🏷️ Create and manage your listings</li>
              <li>🔍 Search for items in your area</li>
              <li>💬 Message other users safely</li>
              <li>⭐ Save your favorite listings</li>
              <li>📊 Track your listing performance</li>
            </ul>
            
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
            <p>
              <a href="https://bamaclassifieds.com" style="color: #3B82F6;">Visit Website</a> | 
              <a href="https://bamaclassifieds.com/dashboard" style="color: #3B82F6;">My Dashboard</a>
            </p>
          </div>
        </div>
      `,
      text: `Welcome to Bama Classifieds!

Hi ${name || 'there'}!

Thank you for testing our email service! This confirms that email notifications are working correctly.

You can now:
- Create and manage your listings
- Search for items in your area  
- Message other users safely
- Save your favorite listings
- Track your listing performance

Get started: https://bamaclassifieds.com/create

Need help? Contact us at support@bamaclassifieds.com

© 2025 Bama Classifieds. All rights reserved.
Visit: https://bamaclassifieds.com`
    });

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
}

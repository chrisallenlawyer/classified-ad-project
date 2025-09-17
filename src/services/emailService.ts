import { Resend } from 'resend';

// Initialize Resend with API key (you'll need to add this to your environment variables)
const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

// Email configuration
const EMAIL_CONFIG = {
  from: 'onboarding@resend.dev', // Use Resend's default domain for testing
  replyTo: 'support@bamaclassifieds.com',
  domain: 'bamaclassifieds.com'
};

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Email service class
export class EmailService {
  
  // Send a generic email
  static async sendEmail(template: EmailTemplate): Promise<boolean> {
    try {
      console.log('📧 Attempting to send email with config:', {
        from: EMAIL_CONFIG.from,
        to: template.to,
        replyTo: EMAIL_CONFIG.replyTo,
        subject: template.subject,
        hasApiKey: !!import.meta.env.VITE_RESEND_API_KEY,
        apiKeyPrefix: import.meta.env.VITE_RESEND_API_KEY?.substring(0, 10) + '...'
      });

      const { data, error } = await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to: template.to,
        replyTo: EMAIL_CONFIG.replyTo,
        subject: template.subject,
        html: template.html,
        text: template.text
      });

      if (error) {
        console.error('📧 Resend API error:', {
          error,
          errorMessage: error.message,
          errorName: error.name
        });
        return false;
      }

      console.log('📧 Email sent successfully:', data);
      return true;
    } catch (error) {
      console.error('📧 Email service error:', {
        error,
        errorMessage: (error as Error).message,
        errorStack: (error as Error).stack
      });
      return false;
    }
  }

  // Welcome email for new users
  static async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    const template: EmailTemplate = {
      to: userEmail,
      subject: 'Welcome to Bama Classifieds!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3B82F6, #1D4ED8); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Bama Classifieds!</h1>
          </div>
          
          <div style="padding: 40px 20px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${userName}!</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Thank you for joining Bama Classifieds, Alabama's premier marketplace for buying and selling locally.
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

Hi ${userName}!

Thank you for joining Bama Classifieds, Alabama's premier marketplace for buying and selling locally.

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
    };

    return this.sendEmail(template);
  }

  // Message notification email
  static async sendMessageNotification(
    userEmail: string, 
    userName: string, 
    senderName: string, 
    listingTitle: string, 
    messagePreview: string,
    listingId: string
  ): Promise<boolean> {
    const template: EmailTemplate = {
      to: userEmail,
      subject: `New message about "${listingTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #3B82F6; padding: 30px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Message Received</h1>
          </div>
          
          <div style="padding: 30px 20px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${userName}!</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              You received a new message from <strong>${senderName}</strong> about your listing:
            </p>
            
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin: 0 0 10px 0; font-size: 18px;">${listingTitle}</h3>
              <p style="color: #6b7280; margin: 0; font-style: italic;">"${messagePreview.substring(0, 150)}${messagePreview.length > 150 ? '...' : ''}"</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://bamaclassifieds.com/dashboard?tab=messages" 
                 style="background: #3B82F6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                View Message
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              You can manage your email preferences in your <a href="https://bamaclassifieds.com/dashboard" style="color: #3B82F6;">dashboard</a>.
            </p>
          </div>
          
          <div style="background: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>© 2025 Bama Classifieds. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `New Message Received

Hi ${userName}!

You received a new message from ${senderName} about your listing: "${listingTitle}"

Message: "${messagePreview.substring(0, 150)}${messagePreview.length > 150 ? '...' : ''}"

View your messages: https://bamaclassifieds.com/dashboard?tab=messages

Manage email preferences: https://bamaclassifieds.com/dashboard

© 2025 Bama Classifieds`
    };

    return this.sendEmail(template);
  }

  // Subscription confirmation email
  static async sendSubscriptionEmail(
    userEmail: string, 
    userName: string, 
    planName: string, 
    amount: number,
    action: 'upgraded' | 'downgraded' | 'cancelled'
  ): Promise<boolean> {
    const actionText = action === 'upgraded' ? 'upgraded to' : action === 'downgraded' ? 'downgraded to' : 'cancelled';
    
    const template: EmailTemplate = {
      to: userEmail,
      subject: `Subscription ${action}: ${planName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #3B82F6; padding: 30px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Subscription ${action.charAt(0).toUpperCase() + action.slice(1)}</h1>
          </div>
          
          <div style="padding: 30px 20px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${userName}!</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Your subscription has been successfully ${actionText} <strong>${planName}</strong>.
            </p>
            
            ${action !== 'cancelled' ? `
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 10px 0;">Plan Details</h3>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Plan:</strong> ${planName}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Amount:</strong> $${amount}/month</p>
              </div>
            ` : `
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                You will continue to have access to your current plan benefits until the end of your billing period.
              </p>
            `}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://bamaclassifieds.com/subscription" 
                 style="background: #3B82F6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Manage Subscription
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Questions? Contact us at <a href="mailto:support@bamaclassifieds.com" style="color: #3B82F6;">support@bamaclassifieds.com</a>
            </p>
          </div>
          
          <div style="background: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>© 2025 Bama Classifieds. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `Subscription ${action.charAt(0).toUpperCase() + action.slice(1)}

Hi ${userName}!

Your subscription has been successfully ${actionText} ${planName}.

${action !== 'cancelled' ? `Plan: ${planName} - $${amount}/month` : 'You will continue to have access until the end of your billing period.'}

Manage your subscription: https://bamaclassifieds.com/subscription

Questions? Contact: support@bamaclassifieds.com

© 2025 Bama Classifieds`
    };

    return this.sendEmail(template);
  }
}

// Export individual functions for easier use
export const sendWelcomeEmail = EmailService.sendWelcomeEmail.bind(EmailService);
export const sendMessageNotification = EmailService.sendMessageNotification.bind(EmailService);
export const sendSubscriptionEmail = EmailService.sendSubscriptionEmail.bind(EmailService);

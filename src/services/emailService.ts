import { Resend } from 'resend';
import { supabase } from '../lib/supabase';

// Initialize Resend with API key (with fallback for missing key)
const resend = import.meta.env.VITE_RESEND_API_KEY ? 
  new Resend(import.meta.env.VITE_RESEND_API_KEY) : 
  null;

// Email configuration  
const EMAIL_CONFIG = {
  from: import.meta.env.VITE_EMAIL_FROM || 'notifications@bamaclassifieds.com',
  replyTo: import.meta.env.VITE_EMAIL_REPLY_TO || 'support@bamaclassifieds.com',
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
  
  // Check if email service is properly configured
  static isConfigured(): boolean {
    // We're using API proxy, so just check if we have basic config
    return !!(EMAIL_CONFIG.from && EMAIL_CONFIG.replyTo);
  }

  // Log email attempt to Supabase
  static async logEmail(
    recipientEmail: string,
    emailType: string,
    subject: string,
    status: 'success' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('email_logs').insert({
        recipient_email: recipientEmail,
        email_type: emailType,
        subject: subject,
        status: status,
        error_message: errorMessage,
        user_id: user?.id
      });
    } catch (error) {
      console.warn('📧 Failed to log email:', error);
    }
  }

  // Send a generic email with improved error handling
  static async sendEmail(template: EmailTemplate, emailType: string = 'generic'): Promise<boolean> {
    try {
      console.log('📧 Attempting to send email via API proxy:', {
        to: template.to,
        subject: template.subject,
        emailType: emailType
      });

      // Use Vercel serverless function for production deployment
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: template.to,
          subject: template.subject,
          html: template.html,
          text: template.text,
          from: EMAIL_CONFIG.from,
          replyTo: EMAIL_CONFIG.replyTo,
          emailType: emailType
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('📧 Email sent successfully via API:', data);
        await this.logEmail(template.to, emailType, template.subject, 'success');
        return true;
      } else {
        console.error('📧 API error:', data);
        await this.logEmail(template.to, emailType, template.subject, 'failed', data.error || 'API call failed');
        return false;
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error('📧 Email service error:', {
        error,
        errorMessage,
        errorStack: (error as Error).stack
      });
      await this.logEmail(template.to, emailType, template.subject, 'failed', errorMessage);
      return false;
    }
  }

  // Get email template from database
  static async getEmailTemplate(templateName: string): Promise<{subject: string, html: string, text: string} | null> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('subject, html_content, text_content')
        .eq('name', templateName)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.warn(`📧 Template '${templateName}' not found in database, using fallback`);
        return null;
      }

      return {
        subject: data.subject,
        html: data.html_content,
        text: data.text_content || ''
      };
    } catch (error) {
      console.error('📧 Error fetching email template:', error);
      return null;
    }
  }

  // Replace template variables with actual values
  static replaceTemplateVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
  }

  // Check if user has email notifications enabled
  static async checkUserEmailPreferences(userId: string): Promise<boolean> {
    try {
      // For now, we'll use a simple approach since we can't directly query auth.users
      // We'll assume notifications are enabled by default
      // In the future, we can add a user_preferences table

      console.log('📧 Checking email preferences for user:', userId);

      // Default to true (notifications enabled) for now
      // This can be enhanced later with a dedicated user preferences system
      return true;
    } catch (error) {
      console.error('📧 Error checking user email preferences:', error);
      // Default to true if we can't check preferences
      return true;
    }
  }

  // Send support notification to all admins
  static async sendSupportNotificationToAdmins(
    userEmail: string,
    userName: string,
    category: string,
    message: string,
    messageId: string
  ): Promise<boolean> {
    try {
      console.log('📞 Sending support notification to admins:', {
        userEmail,
        userName,
        category,
        messagePreview: message.substring(0, 100)
      });

      // Get list of admin emails (we'll need to implement this)
      const adminEmails = await this.getAdminEmails();
      
      if (!adminEmails.length) {
        console.warn('📞 No admin emails found for support notifications');
        return false;
      }

      const categoryName = category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Send individual emails to each admin (Resend doesn't like comma-separated emails)
      const emailPromises = adminEmails.map(async (adminEmail) => {
        const template: EmailTemplate = {
          to: adminEmail,
          subject: `🎧 New Support Request: ${categoryName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎧 New Support Request</h1>
              <p style="color: #E0E7FF; margin: 10px 0 0 0; font-size: 16px;">A user needs assistance</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #1F2937; margin: 0 0 15px 0; font-size: 18px;">Support Request Details</h2>
                
                <div style="margin-bottom: 15px;">
                  <strong style="color: #374151;">Category:</strong> 
                  <span style="background: #3B82F6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px;">
                    ${categoryName}
                  </span>
                </div>
                
                <div style="margin-bottom: 15px;">
                  <strong style="color: #374151;">From:</strong> ${userName} (${userEmail})
                </div>
                
                <div style="margin-bottom: 20px;">
                  <strong style="color: #374151;">Message:</strong>
                  <div style="background: #F3F4F6; padding: 15px; border-radius: 6px; margin-top: 8px; border-left: 4px solid #3B82F6;">
                    ${message}
                  </div>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 25px;">
                <a href="https://bamaclassifieds.com/admin" 
                   style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  📧 Respond in Admin Dashboard
                </a>
              </div>
              
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center;">
                <p style="color: #6B7280; font-size: 12px; margin: 0;">
                  This is an automated notification from Bama Classifieds support system.
                </p>
              </div>
            </div>
          </div>
        `,
        text: `
New Support Request - ${categoryName}

From: ${userName} (${userEmail})
Category: ${categoryName}

Message:
${message}

Please respond in the admin dashboard: https://bamaclassifieds.com/admin

This is an automated notification from Bama Classifieds support system.
        `
        };

        return await this.sendEmail(template);
      });

      // Wait for all emails to send
      const results = await Promise.all(emailPromises);
      const successCount = results.filter(result => result).length;
      
      console.log(`📞 Support notifications sent: ${successCount}/${adminEmails.length} admins notified`);
      
      return successCount > 0;
    } catch (error) {
      console.error('📞 Error sending support notification to admins:', error);
      return false;
    }
  }

  // Get list of admin email addresses
  static async getAdminEmails(): Promise<string[]> {
    try {
      // For now, return a hardcoded list of admin emails
      // In the future, this could query the database for users with admin roles
      return [
        'chrisallenlawyer@gmail.com', // Main admin
        'ace3672@hotmail.com',        // Secondary admin (if needed)
        // Add other admin emails here as needed
      ];
    } catch (error) {
      console.error('📞 Error getting admin emails:', error);
      return [];
    }
  }

  // Send guest support notification to admins (no database storage)
  static async sendGuestSupportNotification(
    guestName: string,
    guestEmail: string,
    category: string,
    message: string
  ): Promise<boolean> {
    try {
      console.log('👤 Sending guest support notification to admins:', {
        guestName,
        guestEmail,
        category,
        messagePreview: message.substring(0, 100)
      });

      // Get list of admin emails
      const adminEmails = await this.getAdminEmails();
      
      if (!adminEmails.length) {
        console.warn('👤 No admin emails found for guest support notifications');
        return false;
      }

      const categoryName = category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Send individual emails to each admin
      const emailPromises = adminEmails.map(async (adminEmail) => {
        const template: EmailTemplate = {
          to: adminEmail,
          replyTo: guestEmail, // Important: Set reply-to to guest's email
          subject: `👤 Guest Support Request: ${categoryName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">👤 Guest Support Request</h1>
                <p style="color: #FEF3C7; margin: 10px 0 0 0; font-size: 16px;">From a visitor who needs help</p>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
                  <h2 style="color: #1F2937; margin: 0 0 15px 0; font-size: 18px;">Guest Support Request</h2>
                  
                  <div style="margin-bottom: 15px;">
                    <strong style="color: #374151;">Category:</strong> 
                    <span style="background: #F59E0B; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px;">
                      ${categoryName}
                    </span>
                  </div>
                  
                  <div style="margin-bottom: 15px;">
                    <strong style="color: #374151;">Name:</strong> ${guestName}
                  </div>
                  
                  <div style="margin-bottom: 15px;">
                    <strong style="color: #374151;">Email:</strong> 
                    <a href="mailto:${guestEmail}" style="color: #3B82F6; text-decoration: none;">
                      ${guestEmail}
                    </a>
                  </div>
                  
                  <div style="margin-bottom: 20px;">
                    <strong style="color: #374151;">Message:</strong>
                    <div style="background: #F3F4F6; padding: 15px; border-radius: 6px; margin-top: 8px; border-left: 4px solid #F59E0B;">
                      ${message}
                    </div>
                  </div>
                  
                  <div style="background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 6px;">
                    <p style="color: #92400E; margin: 0; font-size: 14px;">
                      <strong>Note:</strong> This is a guest user who is not logged in. 
                      Reply directly to this email to respond to them.
                    </p>
                  </div>
                </div>
                
                <div style="text-align: center; margin-top: 25px;">
                  <a href="mailto:${guestEmail}?subject=Re: ${categoryName} Support Request" 
                     style="background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    📧 Reply to ${guestName}
                  </a>
                </div>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center;">
                  <p style="color: #6B7280; font-size: 12px; margin: 0;">
                    This is a guest support request from Bama Classifieds. Reply directly to this email.
                  </p>
                </div>
              </div>
            </div>
          `,
          text: `
Guest Support Request - ${categoryName}

Name: ${guestName}
Email: ${guestEmail}
Category: ${categoryName}

Message:
${message}

Note: This is a guest user who is not logged in. Reply directly to this email to respond to them.

Reply to: ${guestEmail}
          `
        };

        return await this.sendEmail(template);
      });

      // Wait for all emails to send
      const results = await Promise.all(emailPromises);
      const successCount = results.filter(result => result).length;
      
      console.log(`👤 Guest support notifications sent: ${successCount}/${adminEmails.length} admins notified`);
      
      return successCount > 0;
    } catch (error) {
      console.error('👤 Error sending guest support notification to admins:', error);
      return false;
    }
  }

  // Send email using database template (with fallback to hardcoded)
  static async sendEmailWithTemplate(
    templateName: string, 
    recipientEmail: string, 
    variables: Record<string, string>,
    fallbackTemplate?: EmailTemplate
  ): Promise<boolean> {
    try {
      // Try to get template from database first
      const dbTemplate = await this.getEmailTemplate(templateName);
      
      let template: EmailTemplate;
      
      if (dbTemplate) {
        // Use database template with variable replacement
        template = {
          to: recipientEmail,
          subject: this.replaceTemplateVariables(dbTemplate.subject, variables),
          html: this.replaceTemplateVariables(dbTemplate.html, variables),
          text: this.replaceTemplateVariables(dbTemplate.text, variables)
        };
      } else if (fallbackTemplate) {
        // Use fallback template if database template not found
        template = fallbackTemplate;
      } else {
        console.error(`📧 No template found for '${templateName}' and no fallback provided`);
        return false;
      }

      return await this.sendEmail(template, templateName);
    } catch (error) {
      console.error('📧 Error sending email with template:', error);
      return false;
    }
  }

  // Queue email for later processing (fallback for when direct sending fails)
  static async queueEmail(
    recipientEmail: string,
    emailType: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('email_queue').insert({
        recipient_email: recipientEmail,
        email_type: emailType,
        subject: subject,
        html_content: htmlContent,
        text_content: textContent,
        metadata: metadata,
        user_id: user?.id
      });

      if (error) {
        console.error('📧 Failed to queue email:', error);
        return false;
      }

      console.log('📧 Email queued successfully');
      return true;
    } catch (error) {
      console.error('📧 Error queueing email:', error);
      return false;
    }
  }

  // Welcome email for new users (now uses database templates)
  static async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    // Try database template first, with hardcoded fallback
    const fallbackTemplate: EmailTemplate = {
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
            
            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #92400E; margin: 0; line-height: 1.6;">
                <strong>📧 Important:</strong> You will receive a separate email from Bama Classifieds with a verification link. 
                Please click that link to verify your email address before you can create listings.
              </p>
            </div>
            
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
      text: `Welcome to Bama Classifieds!

Hi ${userName}!

Thank you for joining Bama Classifieds, Alabama's premier marketplace for buying and selling locally.

📧 IMPORTANT: You will receive a separate email from Bama Classifieds with a verification link. Please click that link to verify your email address before you can create listings.

Get started: https://bamaclassifieds.com/create

© 2025 Bama Classifieds. All rights reserved.`
    };

    return await this.sendEmailWithTemplate(
      'welcome',
      userEmail,
      { userName },
      fallbackTemplate
    );
  }

  // Message notification email (now uses database templates)
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

    return await this.sendEmailWithTemplate(
      'message_notification',
      userEmail,
      { 
        userName,
        senderName,
        listingTitle,
        messagePreview,
        listingId
      },
      template
    );
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

    // Try to send directly, queue as fallback
    const success = await this.sendEmail(template, 'subscription');
    
    if (!success) {
      console.log('📧 Direct send failed, queueing subscription email...');
      return await this.queueEmail(
        userEmail,
        'subscription',
        template.subject,
        template.html,
        template.text,
        { 
          user_name: userName,
          plan_name: planName,
          amount: amount,
          action: action
        }
      );
    }
    
    return success;
  }

  // Email confirmation for signup (replaces Supabase default)  
  static async sendSignupConfirmationEmail(userEmail: string, userName: string, confirmationUrl: string): Promise<boolean> {
    const template: EmailTemplate = {
      to: userEmail,
      subject: 'Confirm Your Bama Classifieds Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3B82F6, #1D4ED8); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Bama Classifieds!</h1>
          </div>
          
          <div style="padding: 40px 20px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${userName}!</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Thank you for joining Bama Classifieds! To complete your registration and start buying and selling, please confirm your email address.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationUrl}" 
                 style="background: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Confirm Email Address
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              If you didn't create this account, you can safely ignore this email.
            </p>
            
            <p style="color: #6b7280; font-size: 14px;">
              Need help? Contact us at <a href="mailto:support@bamaclassifieds.com" style="color: #3B82F6;">support@bamaclassifieds.com</a>
            </p>
          </div>
          
          <div style="background: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>© 2025 Bama Classifieds. All rights reserved.</p>
            <p>
              <a href="https://bamaclassifieds.com" style="color: #3B82F6;">Visit Website</a>
            </p>
          </div>
        </div>
      `,
      text: `Welcome to Bama Classifieds!

Hi ${userName}!

Thank you for joining Bama Classifieds! To complete your registration and start buying and selling, please confirm your email address.

Confirm your email: ${confirmationUrl}

If you didn't create this account, you can safely ignore this email.

Need help? Contact us at support@bamaclassifieds.com

© 2025 Bama Classifieds. All rights reserved.
Visit: https://bamaclassifieds.com`
    };

    // Try to send directly, queue as fallback
    const success = await this.sendEmail(template, 'signup_confirmation');
    
    if (!success) {
      console.log('📧 Direct send failed, queueing signup confirmation email...');
      return await this.queueEmail(
        userEmail,
        'signup_confirmation',
        'Confirm Your Bama Classifieds Account',
        template.html,
        template.text,
        { user_name: userName, confirmation_url: confirmationUrl }
      );
    }
    
    return success;
  }

  // Password reset email (replaces Supabase default)
  static async sendPasswordResetEmail(userEmail: string, userName: string, resetUrl: string): Promise<boolean> {
    const template: EmailTemplate = {
      to: userEmail,
      subject: 'Reset Your Bama Classifieds Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3B82F6, #1D4ED8); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
          </div>
          
          <div style="padding: 40px 20px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${userName}!</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password for your Bama Classifieds account.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #EF4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This link will expire in 1 hour for security reasons.
            </p>
            
            <p style="color: #6b7280; font-size: 14px;">
              If you didn't request this password reset, you can safely ignore this email.
            </p>
            
            <p style="color: #6b7280; font-size: 14px;">
              Need help? Contact us at <a href="mailto:support@bamaclassifieds.com" style="color: #3B82F6;">support@bamaclassifieds.com</a>
            </p>
          </div>
          
          <div style="background: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>© 2025 Bama Classifieds. All rights reserved.</p>
            <p>
              <a href="https://bamaclassifieds.com" style="color: #3B82F6;">Visit Website</a>
            </p>
          </div>
        </div>
      `,
      text: `Password Reset - Bama Classifieds

Hi ${userName}!

We received a request to reset your password for your Bama Classifieds account.

Reset your password: ${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email.

Need help? Contact us at support@bamaclassifieds.com

© 2025 Bama Classifieds. All rights reserved.
Visit: https://bamaclassifieds.com`
    };

    // Try to send directly, queue as fallback
    const success = await this.sendEmail(template, 'password_reset');
    
    if (!success) {
      console.log('📧 Direct send failed, queueing password reset email...');
      return await this.queueEmail(
        userEmail,
        'password_reset',
        'Reset Your Bama Classifieds Password',
        template.html,
        template.text,
        { user_name: userName, reset_url: resetUrl }
      );
    }
    
    return success;
  }
}

// Export individual functions for easier use
export const sendWelcomeEmail = EmailService.sendWelcomeEmail.bind(EmailService);
export const sendMessageNotification = EmailService.sendMessageNotification.bind(EmailService);
export const sendSubscriptionEmail = EmailService.sendSubscriptionEmail.bind(EmailService);
export const sendSignupConfirmationEmail = EmailService.sendSignupConfirmationEmail.bind(EmailService);
export const sendPasswordResetEmail = EmailService.sendPasswordResetEmail.bind(EmailService);

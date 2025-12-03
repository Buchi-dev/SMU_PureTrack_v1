/**
 * Email Service
 * 
 * Handles email notifications for alerts with:
 * - Batch processing (10 emails at a time)
 * - Retry logic with exponential backoff
 * - Rate limiting for 20 admins/staff
 * - Email queue management
 * 
 * @module utils/email.service
 */

import nodemailer, { Transporter } from 'nodemailer';
import { userService } from '@feature/users';
import { IAlertDocument } from '@feature/alerts/alert.types';
import logger from '@utils/logger.util';

/**
 * Email configuration
 */
const EMAIL_CONFIG = {
  BATCH_SIZE: 10,
  RETRY_ATTEMPTS: 3,
  INITIAL_RETRY_DELAY: 1000, // 1 second
  MAX_RETRY_DELAY: 30000, // 30 seconds
  RETRY_MULTIPLIER: 2,
  POOL_SIZE: 5,
};

/**
 * Email queue item
 */
interface EmailQueueItem {
  to: string;
  subject: string;
  html: string;
  retries: number;
  lastAttempt?: Date;
}

/**
 * Email Service Class
 */
class EmailService {
  private transporter: Transporter | null = null;
  private emailQueue: EmailQueueItem[] = [];
  private isProcessing = false;

  /**
   * Initialize email transporter
   */
  public async initialize(): Promise<void> {
    // Get email config from environment
    const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const emailPort = parseInt(process.env.EMAIL_PORT || '587');
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;

    if (!emailUser || !emailPassword) {
      logger.warn('⚠️  Email: Credentials not configured, email service disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailPort === 465,
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
      pool: true,
      maxConnections: EMAIL_CONFIG.POOL_SIZE,
      maxMessages: 100,
    });

    // Verify connection
    try {
      await this.transporter.verify();
      logger.info('✅ Email: Service initialized successfully');
    } catch (error) {
      logger.error('❌ Email: Failed to initialize service:', error);
      this.transporter = null;
    }
  }

  /**
   * Send alert notification to staff
   */
  public async sendAlertNotification(alert: IAlertDocument): Promise<void> {
    if (!this.transporter) {
      logger.warn('⚠️  Email: Service not initialized, skipping notification');
      return;
    }

    try {
      // Get active staff with email notifications enabled
      const staff = await userService.getActiveStaffForNotifications();

      if (staff.length === 0) {
        logger.info('📧 Email: No staff members with notifications enabled');
        return;
      }

      // Create email for each staff member
      const emails = staff
        .filter((user) => user.email && user.notificationPreferences?.emailNotifications)
        .map((user) => ({
          to: user.email,
          subject: this.getAlertEmailSubject(alert),
          html: this.getAlertEmailTemplate(alert),
          retries: 0,
        }));

      // Add to queue
      this.emailQueue.push(...emails);
      logger.info(`📧 Email: Queued ${emails.length} alert notifications`);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    } catch (error) {
      logger.error('❌ Email: Failed to queue alert notification:', error);
    }
  }

  /**
   * Process email queue with batch processing
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.emailQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.emailQueue.length > 0) {
      // Get batch
      const batch = this.emailQueue.splice(0, EMAIL_CONFIG.BATCH_SIZE);

      // Send batch
      await Promise.allSettled(
        batch.map((email) => this.sendEmail(email))
      );

      // Small delay between batches to respect rate limits
      if (this.emailQueue.length > 0) {
        await this.delay(1000);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Send individual email with retry logic
   */
  private async sendEmail(item: EmailQueueItem): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: item.to,
        subject: item.subject,
        html: item.html,
      });

      logger.info(`✅ Email: Sent to ${item.to}`);
    } catch (error) {
      logger.error(`❌ Email: Failed to send to ${item.to}:`, error);

      // Retry logic
      if (item.retries < EMAIL_CONFIG.RETRY_ATTEMPTS) {
        item.retries++;
        item.lastAttempt = new Date();

        // Calculate retry delay with exponential backoff
        const retryDelay = Math.min(
          EMAIL_CONFIG.INITIAL_RETRY_DELAY * Math.pow(EMAIL_CONFIG.RETRY_MULTIPLIER, item.retries - 1),
          EMAIL_CONFIG.MAX_RETRY_DELAY
        );

        logger.info(`🔄 Email: Retrying ${item.to} in ${retryDelay}ms (attempt ${item.retries}/${EMAIL_CONFIG.RETRY_ATTEMPTS})`);

        // Re-queue with delay
        setTimeout(() => {
          this.emailQueue.push(item);
          if (!this.isProcessing) {
            this.processQueue();
          }
        }, retryDelay);
      } else {
        logger.error(`❌ Email: Max retries exceeded for ${item.to}`);
      }
    }
  }

  /**
   * Generate email subject for alert
   */
  private getAlertEmailSubject(alert: IAlertDocument): string {
    const severityEmoji: Record<string, string> = {
      CRITICAL: '🚨',
      HIGH: '⚠️',
      MEDIUM: '⚡',
      LOW: 'ℹ️',
    };

    return `${severityEmoji[alert.severity] || '⚠️'} Water Quality Alert - ${alert.severity.toUpperCase()} ${alert.parameter}`;
  }

  /**
   * Generate HTML email template for alert
   */
  private getAlertEmailTemplate(alert: IAlertDocument): string {
    const severityColor: Record<string, string> = {
      CRITICAL: '#dc2626',
      HIGH: '#ea580c',
      MEDIUM: '#f59e0b',
      LOW: '#3b82f6',
    };

    const color = severityColor[alert.severity] || '#6b7280';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
            .alert-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .label { font-weight: bold; color: #6b7280; }
            .value { color: #111827; margin-bottom: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
            .button { background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">🚨 Water Quality Alert</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">${alert.severity.toUpperCase()} Severity</p>
            </div>
            <div class="content">
              <div class="alert-info">
                <div class="value">
                  <span class="label">Parameter:</span> ${alert.parameter.toUpperCase()}
                </div>
                <div class="value">
                  <span class="label">Current Value:</span> ${alert.currentValue}
                </div>
                <div class="value">
                  <span class="label">Threshold:</span> ${alert.threshold}
                </div>
                <div class="value">
                  <span class="label">Device ID:</span> ${alert.deviceId}
                </div>
                <div class="value">
                  <span class="label">Detected At:</span> ${new Date(alert.createdAt).toLocaleString()}
                </div>
                ${alert.occurrenceCount > 1 ? `
                <div class="value">
                  <span class="label">Occurrences:</span> ${alert.occurrenceCount}
                </div>
                ` : ''}
              </div>
              <p><strong>Message:</strong> ${alert.message}</p>
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/alerts/${alert._id}" class="button">
                View Alert Details
              </a>
            </div>
            <div class="footer">
              <p>Water Quality Monitoring System</p>
              <p>This is an automated notification. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get queue status
   */
  public getQueueStatus(): { queueLength: number; isProcessing: boolean } {
    return {
      queueLength: this.emailQueue.length,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Close email service
   */
  public async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      logger.info('👋 Email: Service closed');
    }
  }
}

// Export singleton instance
export default new EmailService();


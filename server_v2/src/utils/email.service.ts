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
import userService from '@feature/users/user.service';
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
      // Get device details for location information (optional, to avoid circular dependencies)
      let deviceDetails = null;
      try {
        const { default: deviceService } = await import('@feature/devices/device.service');
        deviceDetails = await deviceService.getDeviceById(alert.deviceId);
      } catch (error) {
        logger.warn(`⚠️  Email: Could not fetch device details for ${alert.deviceId}`);
      }

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
          html: this.getAlertEmailTemplate(alert, deviceDetails),
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
      Critical: '🚨',
      Warning: '⚠️',
      Advisory: 'ℹ️',
    };

    return `${severityEmoji[alert.severity] || '⚠️'} Water Quality Alert - ${alert.severity.toUpperCase()} ${alert.parameter} - ${alert.deviceName}`;
  }

  /**
   * Generate HTML email template for alert with comprehensive information
   */
  private getAlertEmailTemplate(alert: IAlertDocument, deviceDetails: any = null): string {
    const severityColor: Record<string, string> = {
      Critical: '#dc2626',
      Warning: '#f59e0b',
      Advisory: '#3b82f6',
    };

    const color = severityColor[alert.severity] || '#6b7280';
    
    // Get parameter standards and health information
    const parameterInfo = this.getParameterStandards(alert.parameter);
    const healthImpact = this.getHealthImpact(alert.parameter, alert.severity);
    const recommendations = this.getRecommendedActions(alert.parameter, alert.severity);
    
    // Get location information
    const location = this.getLocationInfo(deviceDetails);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }
            .container { max-width: 650px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: ${color}; color: white; padding: 30px 25px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .header p { margin: 8px 0 0 0; font-size: 16px; opacity: 0.95; }
            .content { padding: 25px; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
            .info-grid { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; }
            .info-row:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
            .label { font-weight: 600; color: #6b7280; font-size: 14px; }
            .value { color: #111827; font-weight: 500; font-size: 14px; text-align: right; }
            .value-highlight { color: ${color}; font-weight: 700; font-size: 16px; }
            .alert-box { background: #fef2f2; border-left: 4px solid ${color}; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .alert-box p { margin: 5px 0; }
            .standards-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .standards-table th, .standards-table td { text-align: left; padding: 10px; border-bottom: 1px solid #e5e7eb; }
            .standards-table th { background: #f9fafb; font-weight: 600; color: #6b7280; font-size: 13px; }
            .standards-table td { font-size: 14px; }
            .health-impact { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .recommendations { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .recommendations ul { margin: 8px 0; padding-left: 20px; }
            .recommendations li { margin-bottom: 6px; }
            .button { background: ${color}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 20px; font-weight: 600; text-align: center; }
            .button:hover { opacity: 0.9; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
            .footer p { margin: 5px 0; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
            .badge-critical { background: #fee2e2; color: #dc2626; }
            .badge-warning { background: #fef3c7; color: #d97706; }
            .badge-advisory { background: #dbeafe; color: #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <h1>🚨 Water Quality Alert</h1>
              <p><span class="badge badge-${alert.severity.toLowerCase()}">${alert.severity.toUpperCase()} SEVERITY</span></p>
            </div>

            <!-- Content -->
            <div class="content">
              <!-- Alert Summary -->
              <div class="section">
                <div class="section-title">📊 Alert Summary</div>
                <div class="info-grid">
                  <div class="info-row">
                    <span class="label">Parameter Affected</span>
                    <span class="value value-highlight">${alert.parameter.toUpperCase()}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Current Reading</span>
                    <span class="value value-highlight">${this.formatValue(alert.parameter, alert.currentValue)}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Safe Threshold</span>
                    <span class="value">${this.formatValue(alert.parameter, alert.threshold)}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Deviation</span>
                    <span class="value">${this.calculateDeviation(alert.currentValue, alert.threshold)}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Detected At</span>
                    <span class="value">${new Date(alert.timestamp).toLocaleString('en-US', { 
                      dateStyle: 'medium', 
                      timeStyle: 'short' 
                    })}</span>
                  </div>
                  ${alert.occurrenceCount > 1 ? `
                  <div class="info-row">
                    <span class="label">Repeated Occurrences</span>
                    <span class="value value-highlight">${alert.occurrenceCount} times</span>
                  </div>
                  ` : ''}
                </div>
              </div>

              <!-- Location Information -->
              <div class="section">
                <div class="section-title">📍 Device & Location</div>
                <div class="info-grid">
                  <div class="info-row">
                    <span class="label">Device Name</span>
                    <span class="value">${alert.deviceName || 'Unknown Device'}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Device ID</span>
                    <span class="value">${alert.deviceId}</span>
                  </div>
                  ${location.building ? `
                  <div class="info-row">
                    <span class="label">Building</span>
                    <span class="value">${location.building}</span>
                  </div>
                  ` : ''}
                  ${location.floor ? `
                  <div class="info-row">
                    <span class="label">Floor/Area</span>
                    <span class="value">${location.floor}</span>
                  </div>
                  ` : ''}
                  ${location.location ? `
                  <div class="info-row">
                    <span class="label">Location</span>
                    <span class="value">${location.location}</span>
                  </div>
                  ` : ''}
                  ${location.notes ? `
                  <div class="info-row">
                    <span class="label">Notes</span>
                    <span class="value">${location.notes}</span>
                  </div>
                  ` : ''}
                </div>
              </div>

              <!-- Water Quality Standards -->
              <div class="section">
                <div class="section-title">📋 ${alert.parameter.toUpperCase()} Standards & Guidelines</div>
                ${parameterInfo}
              </div>

              <!-- Health Impact -->
              <div class="section">
                <div class="section-title">⚕️ Health & Safety Impact</div>
                <div class="health-impact">
                  ${healthImpact}
                </div>
              </div>

              <!-- Recommended Actions -->
              <div class="section">
                <div class="section-title">✅ Recommended Actions</div>
                <div class="recommendations">
                  ${recommendations}
                </div>
              </div>

              <!-- Action Button -->
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/admin/alerts" class="button">
                  View Full Alert Dashboard →
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p><strong>SMU PureTrack</strong> - Water Quality Monitoring System</p>
              <p>This is an automated alert notification. Please take immediate action if this is a critical alert.</p>
              <p style="margin-top: 10px; font-size: 11px;">If you believe this alert was sent in error, please contact the system administrator.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Format sensor value with units
   */
  private formatValue(parameter: string, value: number): string {
    switch (parameter.toUpperCase()) {
      case 'PH':
        return `${value.toFixed(2)} pH`;
      case 'TURBIDITY':
        return `${value.toFixed(2)} NTU`;
      case 'TDS':
        return `${value.toFixed(0)} ppm`;
      default:
        return value.toFixed(2);
    }
  }

  /**
   * Calculate deviation percentage
   */
  private calculateDeviation(current: number, threshold: number): string {
    const deviation = ((Math.abs(current - threshold) / threshold) * 100).toFixed(1);
    const direction = current > threshold ? 'above' : 'below';
    return `${deviation}% ${direction} threshold`;
  }

  /**
   * Get location information from device details
   */
  private getLocationInfo(deviceDetails: any): any {
    if (!deviceDetails) {
      return { location: 'Location not configured' };
    }

    return {
      building: deviceDetails.metadata?.location?.building || '',
      floor: deviceDetails.metadata?.location?.floor || '',
      location: deviceDetails.location || '',
      notes: deviceDetails.metadata?.location?.notes || '',
    };
  }

  /**
   * Get parameter standards and guidelines
   */
  private getParameterStandards(parameter: string): string {
    switch (parameter.toUpperCase()) {
      case 'PH':
        return `
          <table class="standards-table">
            <thead>
              <tr>
                <th>Classification</th>
                <th>Range</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Ideal Range</strong></td>
                <td>7.0 - 7.5 pH</td>
                <td>WHO Guidelines</td>
              </tr>
              <tr>
                <td><strong>Acceptable Range</strong></td>
                <td>6.5 - 8.5 pH</td>
                <td>WHO/EPA Standards</td>
              </tr>
              <tr>
                <td><strong>Critical Threshold</strong></td>
                <td>&lt; 6.0 or &gt; 9.0 pH</td>
                <td>Health Alert Level</td>
              </tr>
            </tbody>
          </table>
          <p style="margin-top: 10px; font-size: 13px; color: #6b7280;"><em>pH measures the acidity or alkalinity of water on a scale of 0-14, where 7 is neutral.</em></p>
        `;
      
      case 'TURBIDITY':
        return `
          <table class="standards-table">
            <thead>
              <tr>
                <th>Classification</th>
                <th>Level</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Ideal Level</strong></td>
                <td>&lt; 1 NTU</td>
                <td>WHO Guidelines</td>
              </tr>
              <tr>
                <td><strong>Acceptable Level</strong></td>
                <td>&lt; 5 NTU</td>
                <td>EPA Standards</td>
              </tr>
              <tr>
                <td><strong>Critical Threshold</strong></td>
                <td>&gt; 10 NTU</td>
                <td>Health Alert Level</td>
              </tr>
            </tbody>
          </table>
          <p style="margin-top: 10px; font-size: 13px; color: #6b7280;"><em>NTU (Nephelometric Turbidity Units) measures cloudiness or haziness of water caused by particles.</em></p>
        `;
      
      case 'TDS':
        return `
          <table class="standards-table">
            <thead>
              <tr>
                <th>Classification</th>
                <th>Level</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Excellent</strong></td>
                <td>&lt; 300 ppm</td>
                <td>WHO Guidelines</td>
              </tr>
              <tr>
                <td><strong>Good</strong></td>
                <td>300 - 500 ppm</td>
                <td>EPA Standards</td>
              </tr>
              <tr>
                <td><strong>Fair</strong></td>
                <td>500 - 900 ppm</td>
                <td>Acceptable with caution</td>
              </tr>
              <tr>
                <td><strong>Poor</strong></td>
                <td>900 - 1200 ppm</td>
                <td>Not recommended</td>
              </tr>
              <tr>
                <td><strong>Unacceptable</strong></td>
                <td>&gt; 1200 ppm</td>
                <td>Unsafe for consumption</td>
              </tr>
            </tbody>
          </table>
          <p style="margin-top: 10px; font-size: 13px; color: #6b7280;"><em>TDS (Total Dissolved Solids) measures concentration of dissolved substances in water, expressed in parts per million (ppm).</em></p>
        `;
      
      default:
        return '<p>Standard information not available for this parameter.</p>';
    }
  }

  /**
   * Get health impact information based on parameter and severity
   */
  private getHealthImpact(parameter: string, severity: string): string {
    const impacts: Record<string, Record<string, string>> = {
      PH: {
        Critical: `
          <p><strong>⚠️ Severe Health Risk:</strong></p>
          <ul style="margin: 8px 0; padding-left: 20px;">
            <li><strong>Highly Acidic (pH &lt; 6.0):</strong> Can cause eye and skin irritation, corrode pipes releasing toxic metals like lead and copper into water.</li>
            <li><strong>Highly Alkaline (pH &gt; 9.0):</strong> May cause bitter taste, skin and eye irritation, and can interfere with disinfection processes.</li>
            <li><strong>Immediate Concerns:</strong> Potential metallic taste, gastrointestinal discomfort, and risk of heavy metal exposure.</li>
          </ul>
        `,
        Warning: `
          <p><strong>⚡ Moderate Health Concern:</strong></p>
          <ul style="margin: 8px 0; padding-left: 20px;">
            <li>pH levels outside 6.5-8.5 range may affect water taste and odor</li>
            <li>Can reduce effectiveness of chlorine disinfection</li>
            <li>May cause mild digestive discomfort in sensitive individuals</li>
            <li>Long-term exposure can lead to pipe corrosion</li>
          </ul>
        `,
        Advisory: `
          <p><strong>ℹ️ Minor Deviation:</strong></p>
          <p>pH levels are slightly outside optimal range but pose minimal immediate health risk. Monitor for trends.</p>
        `,
      },
      TURBIDITY: {
        Critical: `
          <p><strong>⚠️ Severe Health Risk:</strong></p>
          <ul style="margin: 8px 0; padding-left: 20px;">
            <li><strong>Disease Risk:</strong> High turbidity can harbor harmful microorganisms including bacteria, viruses, and parasites.</li>
            <li><strong>Contamination:</strong> Particles may contain toxic chemicals, heavy metals, or pathogenic organisms.</li>
            <li><strong>Treatment Interference:</strong> Reduces effectiveness of disinfection processes, allowing pathogens to survive.</li>
            <li><strong>Gastrointestinal Illness:</strong> Increased risk of waterborne diseases like cholera, typhoid, and dysentery.</li>
          </ul>
        `,
        Warning: `
          <p><strong>⚡ Moderate Health Concern:</strong></p>
          <ul style="margin: 8px 0; padding-left: 20px;">
            <li>Elevated particle concentration may indicate contamination</li>
            <li>Can interfere with UV and chlorine disinfection</li>
            <li>May harbor microorganisms that cause illness</li>
            <li>Affects aesthetic quality (cloudy appearance, unpleasant taste)</li>
          </ul>
        `,
        Advisory: `
          <p><strong>ℹ️ Minor Elevation:</strong></p>
          <p>Slightly elevated turbidity detected. While not immediately dangerous, continued monitoring is recommended to prevent escalation.</p>
        `,
      },
      TDS: {
        Critical: `
          <p><strong>⚠️ Severe Health Risk:</strong></p>
          <ul style="margin: 8px 0; padding-left: 20px;">
            <li><strong>Excessive Minerals:</strong> Very high TDS (&gt;1000 ppm) may contain harmful levels of minerals like arsenic, lead, or nitrates.</li>
            <li><strong>Kidney Stress:</strong> Excessive dissolved solids can strain kidneys and cause dehydration.</li>
            <li><strong>Cardiovascular Risk:</strong> High sodium content may affect blood pressure in sensitive individuals.</li>
            <li><strong>Gastrointestinal Issues:</strong> Can cause diarrhea and stomach discomfort, especially in children.</li>
            <li><strong>Unfit for Consumption:</strong> Water may be unpalatable and pose health risks.</li>
          </ul>
        `,
        Warning: `
          <p><strong>⚡ Moderate Health Concern:</strong></p>
          <ul style="margin: 8px 0; padding-left: 20px;">
            <li>Elevated TDS (500-1000 ppm) may indicate increased mineral content</li>
            <li>Can affect taste (salty or bitter) and reduce palatability</li>
            <li>May cause scaling in pipes and appliances</li>
            <li>Not ideal for long-term consumption, especially for vulnerable groups</li>
          </ul>
        `,
        Advisory: `
          <p><strong>ℹ️ Slightly Elevated:</strong></p>
          <p>TDS levels are approaching upper acceptable limits. Monitor closely to prevent further increase. Generally safe but may affect taste.</p>
        `,
      },
    };

    return impacts[parameter.toUpperCase()]?.[severity] || '<p>Health impact information not available.</p>';
  }

  /**
   * Get recommended actions based on parameter and severity
   */
  private getRecommendedActions(parameter: string, severity: string): string {
    const actions: Record<string, Record<string, string>> = {
      PH: {
        Critical: `
          <p><strong>🚨 IMMEDIATE ACTION REQUIRED:</strong></p>
          <ul>
            <li><strong>Stop Water Use:</strong> Immediately discontinue use for drinking, cooking, or bathing</li>
            <li><strong>Notify Users:</strong> Alert all building occupants of potential water quality issue</li>
            <li><strong>Contact Authorities:</strong> Inform facilities management and local water authority</li>
            <li><strong>Investigate Source:</strong> Check for chemical contamination, pipe corrosion, or treatment system failure</li>
            <li><strong>Flush System:</strong> If source is isolated, flush pipes thoroughly before resuming use</li>
            <li><strong>Retest Water:</strong> Conduct follow-up testing to confirm pH returns to safe range</li>
            <li><strong>Document Incident:</strong> Record timeline, readings, and actions taken</li>
          </ul>
          <p style="margin-top: 10px;"><em><strong>Timeline:</strong> Address within 1 hour. Do not delay.</em></p>
        `,
        Warning: `
          <p><strong>⚡ PROMPT ACTION NEEDED:</strong></p>
          <ul>
            <li>Investigate cause of pH deviation (treatment system, contamination, etc.)</li>
            <li>Increase monitoring frequency to every 2-4 hours</li>
            <li>Check water treatment system and chemical dosing</li>
            <li>Inspect pipes for signs of corrosion</li>
            <li>Consider temporary alternative water sources if trend continues</li>
            <li>Notify maintenance team for system inspection</li>
          </ul>
          <p style="margin-top: 10px;"><em><strong>Timeline:</strong> Investigate within 4 hours, resolve within 24 hours.</em></p>
        `,
        Advisory: `
          <p><strong>ℹ️ MONITORING RECOMMENDED:</strong></p>
          <ul>
            <li>Continue regular monitoring schedule</li>
            <li>Check for trends over next 24-48 hours</li>
            <li>Review water treatment logs for recent changes</li>
            <li>No immediate action required unless trend worsens</li>
          </ul>
        `,
      },
      TURBIDITY: {
        Critical: `
          <p><strong>🚨 IMMEDIATE ACTION REQUIRED:</strong></p>
          <ul>
            <li><strong>Issue Water Advisory:</strong> Immediately notify all users - DO NOT use for drinking or cooking</li>
            <li><strong>Provide Alternative Water:</strong> Arrange bottled water distribution</li>
            <li><strong>Inspect Water Source:</strong> Check intake points for sediment, algae, or contamination</li>
            <li><strong>Check Filtration:</strong> Inspect and replace filters if necessary</li>
            <li><strong>Flush Distribution System:</strong> Open hydrants to flush out sediment (if source is clear)</li>
            <li><strong>Increase Disinfection:</strong> Verify chlorine levels are adequate given high turbidity</li>
            <li><strong>Lab Testing:</strong> Send samples for microbiological analysis</li>
            <li><strong>System Inspection:</strong> Check for pipe breaks, backflow, or cross-contamination</li>
          </ul>
          <p style="margin-top: 10px;"><em><strong>Timeline:</strong> Immediate action. Issue advisory within 30 minutes.</em></p>
        `,
        Warning: `
          <p><strong>⚡ PROMPT ACTION NEEDED:</strong></p>
          <ul>
            <li>Increase monitoring frequency to every 2 hours</li>
            <li>Inspect filtration system and clean/replace filters</li>
            <li>Check for recent maintenance activities that may have stirred up sediment</li>
            <li>Flush low-flow areas of distribution system</li>
            <li>Verify disinfection system is operating properly</li>
            <li>Consider boil water advisory if turbidity continues to rise</li>
          </ul>
          <p style="margin-top: 10px;"><em><strong>Timeline:</strong> Investigate within 2 hours, resolve within 12 hours.</em></p>
        `,
        Advisory: `
          <p><strong>ℹ️ MONITORING RECOMMENDED:</strong></p>
          <ul>
            <li>Check for seasonal factors (rain, runoff) that may cause temporary elevation</li>
            <li>Monitor trend over next 6-12 hours</li>
            <li>Inspect filtration system during next maintenance window</li>
            <li>Document reading for trend analysis</li>
          </ul>
        `,
      },
      TDS: {
        Critical: `
          <p><strong>🚨 IMMEDIATE ACTION REQUIRED:</strong></p>
          <ul>
            <li><strong>Stop Drinking Water Use:</strong> Advise against consumption until resolved</li>
            <li><strong>Identify Contamination Source:</strong> Check for saltwater intrusion, chemical spills, or sewage backflow</li>
            <li><strong>Lab Analysis:</strong> Send samples for comprehensive dissolved solids analysis (identify specific contaminants)</li>
            <li><strong>Check Treatment System:</strong> Inspect RO system, ion exchange, or distillation units</li>
            <li><strong>Provide Safe Water:</strong> Arrange alternative water supply for drinking and cooking</li>
            <li><strong>Inspect Infrastructure:</strong> Check for pipe corrosion or mineral buildup</li>
            <li><strong>Contact Water Treatment Specialist:</strong> May require professional intervention</li>
            <li><strong>Regulatory Notification:</strong> If contamination is suspected, notify health authorities</li>
          </ul>
          <p style="margin-top: 10px;"><em><strong>Timeline:</strong> Act within 1 hour. Critical safety issue.</em></p>
        `,
        Warning: `
          <p><strong>⚡ PROMPT ACTION NEEDED:</strong></p>
          <ul>
            <li>Increase testing frequency to identify trend</li>
            <li>Check for recent changes in water source or treatment</li>
            <li>Inspect treatment system (softener, RO unit) for proper operation</li>
            <li>Consider installing or upgrading filtration if TDS remains elevated</li>
            <li>Test for specific dissolved substances (minerals, salts, metals)</li>
            <li>Review with water quality consultant if levels persist</li>
          </ul>
          <p style="margin-top: 10px;"><em><strong>Timeline:</strong> Investigate within 4 hours, plan remediation within 48 hours.</em></p>
        `,
        Advisory: `
          <p><strong>ℹ️ MONITORING RECOMMENDED:</strong></p>
          <ul>
            <li>Monitor trend over next 24-48 hours</li>
            <li>Review water treatment system maintenance schedule</li>
            <li>Consider upgrading filtration if TDS continues to climb</li>
            <li>Document for future reference</li>
          </ul>
        `,
      },
    };

    return actions[parameter.toUpperCase()]?.[severity] || '<p>Recommended actions not available.</p>';
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


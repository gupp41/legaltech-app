/**
 * Email Service for Team Invitations
 * 
 * This service handles sending team invitation emails.
 * Currently supports console logging for development.
 * 
 * To enable actual email sending, configure one of these services:
 * - Resend (recommended): https://resend.com
 * - SendGrid: https://sendgrid.com
 * - Nodemailer with SMTP
 */

interface EmailInvitationData {
  recipientEmail: string
  inviterName: string
  teamName: string
  invitationLink: string
  expiresAt: string
}

export class EmailService {
  private static instance: EmailService
  private isEmailEnabled: boolean

  private constructor() {
    // Check if email service is configured
    this.isEmailEnabled = !!(
      process.env.RESEND_API_KEY || 
      process.env.SENDGRID_API_KEY || 
      process.env.SMTP_HOST
    )
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  /**
   * Send team invitation email
   */
  async sendTeamInvitation(data: EmailInvitationData): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isEmailEnabled) {
        // Development mode - log to console
        console.log('\n📧 TEAM INVITATION EMAIL (Development Mode)')
        console.log('=====================================')
        console.log(`To: ${data.recipientEmail}`)
        console.log(`From: ${data.inviterName}`)
        console.log(`Subject: You're invited to join ${data.teamName}`)
        console.log('')
        console.log(`Hi there!`)
        console.log('')
        console.log(`${data.inviterName} has invited you to join the team "${data.teamName}" on our legal document analysis platform.`)
        console.log('')
        console.log('Click the link below to accept the invitation:')
        console.log(data.invitationLink)
        console.log('')
        console.log(`This invitation expires on ${new Date(data.expiresAt).toLocaleDateString()}.`)
        console.log('')
        console.log('If you have any questions, please contact the team administrator.')
        console.log('')
        console.log('Best regards,')
        console.log('The LegalTech Team')
        console.log('=====================================\n')
        
        return { success: true }
      }

      // TODO: Implement actual email sending
      // This would use Resend, SendGrid, or Nodemailer
      console.log('Email service not yet implemented for production')
      return { success: false, error: 'Email service not configured' }

    } catch (error) {
      console.error('Error sending team invitation email:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Check if email service is available
   */
  isAvailable(): boolean {
    return this.isEmailEnabled
  }

  /**
   * Get email service status
   */
  getStatus(): { enabled: boolean; service?: string } {
    if (process.env.RESEND_API_KEY) {
      return { enabled: true, service: 'Resend' }
    }
    if (process.env.SENDGRID_API_KEY) {
      return { enabled: true, service: 'SendGrid' }
    }
    if (process.env.SMTP_HOST) {
      return { enabled: true, service: 'SMTP' }
    }
    return { enabled: false }
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance()

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  sendEmail(options: SendEmailOptions): Promise<{ id: string; status: 'sent' | 'mocked' }>;
}

export class MockEmailProvider implements EmailProvider {
  async sendEmail(options: SendEmailOptions): Promise<{ id: string; status: 'mocked' }> {
    console.log(`[MockEmailProvider] To: ${options.to} | Subject: ${options.subject}`);
    return {
      id: `mock_email_${Date.now()}`,
      status: 'mocked',
    };
  }
}

export class ResendEmailProvider implements EmailProvider {
  private apiKey: string;
  private from: string;

  constructor(apiKey?: string, from?: string) {
    this.apiKey = apiKey || process.env.EMAIL_API_KEY || '';
    this.from = from || process.env.EMAIL_FROM || 'noreply@entangledecho.com';
  }

  async sendEmail(options: SendEmailOptions): Promise<{ id: string; status: 'sent' | 'mocked' }> {
    if (!this.apiKey) {
      console.warn('[ResendEmailProvider] No EMAIL_API_KEY set; falling back to mock send.');
      return new MockEmailProvider().sendEmail(options);
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!res.ok) {
      throw new Error(`Resend email failed: ${await res.text()}`);
    }

    const data = await res.json();
    return { id: data.id, status: 'sent' };
  }
}

export function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER || 'mock';
  if (provider === 'resend') {
    return new ResendEmailProvider();
  }
  return new MockEmailProvider();
}

/**
 * Renders weekly summary digest HTML
 */
export function renderWeeklyDigestHtml(data: {
  displayName: string;
  totalReach: number;
  totalLikes: number;
  topPostCaption: string;
  recommendedSlots: string[];
}): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #373E3E;">
      <h1 style="color: #373E3E; border-bottom: 2px solid #373E3E; padding-bottom: 8px;">Entangled Echo Weekly Digest</h1>
      <p>Hello ${data.displayName}, here is your engagement overview for the past 7 days:</p>
      
      <div style="display: flex; gap: 16px; margin: 24px 0;">
        <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; flex: 1;">
          <div style="font-size: 12px; color: #71717a;">TOTAL REACH</div>
          <div style="font-size: 24px; font-weight: bold; margin-top: 4px;">${data.totalReach.toLocaleString()}</div>
        </div>
        <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; flex: 1;">
          <div style="font-size: 12px; color: #71717a;">TOTAL LIKES</div>
          <div style="font-size: 24px; font-weight: bold; margin-top: 4px;">${data.totalLikes.toLocaleString()}</div>
        </div>
      </div>

      <h3>🌟 Top Performing Post</h3>
      <p style="background: #fafafa; border-left: 4px solid #373E3E; padding: 12px; font-style: italic;">
        "${data.topPostCaption}"
      </p>

      <h3>⚡ Recommended Schedule For Next Week</h3>
      <ul>
        ${data.recommendedSlots.map((s) => `<li>${s}</li>`).join('')}
      </ul>

      <p style="font-size: 12px; color: #a1a1aa; margin-top: 32px;">
        You can adjust your email preferences anytime in your Entangled Echo Settings.
      </p>
    </div>
  `;
}

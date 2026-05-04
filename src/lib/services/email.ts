import nodemailer from 'nodemailer'

// Create transporter from env config
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendOTPEmail(email: string, otp: string, name?: string): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // In development without SMTP configured, just log the OTP
    console.log(`\n📧 OTP for ${email}: ${otp}\n`)
    return
  }

  const transporter = createTransporter()

  // Verify connection before sending
  try {
    await transporter.verify()
  } catch (err: any) {
    console.error('SMTP connection failed:', err.message)
    throw new Error(`SMTP connection failed: ${err.message}`)
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#0d1117;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="480" cellpadding="0" cellspacing="0" style="background:#161c24;border:1px solid #252e3a;border-radius:12px;overflow:hidden;">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#f5a623,#e8891a);padding:32px;text-align:center;">
                  <div style="display:inline-block;background:rgba(0,0,0,0.2);border-radius:12px;padding:12px 20px;margin-bottom:12px;">
                    <span style="font-size:24px;font-weight:900;color:#000;letter-spacing:2px;">VC</span>
                  </div>
                  <h1 style="margin:0;color:#000;font-size:22px;font-weight:700;">VoltCore ERP</h1>
                  <p style="margin:6px 0 0;color:rgba(0,0,0,0.7);font-size:14px;">Password Reset Request</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:36px 32px;">
                  <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;">
                    Hi ${name || 'there'},
                  </p>
                  <p style="margin:0 0 24px;color:#8899aa;font-size:14px;line-height:1.6;">
                    We received a request to reset your password. Use the OTP below to proceed. 
                    This code expires in <strong style="color:#f5a623;">10 minutes</strong>.
                  </p>
                  <!-- OTP Box -->
                  <div style="background:#0d1117;border:2px solid #f5a623;border-radius:12px;padding:28px;text-align:center;margin:0 0 24px;">
                    <p style="margin:0 0 8px;color:#5a6878;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Your OTP Code</p>
                    <p style="margin:0;color:#f5a623;font-size:42px;font-weight:900;letter-spacing:12px;">${otp}</p>
                  </div>
                  <p style="margin:0 0 8px;color:#5a6878;font-size:13px;">
                    ⚠️ If you didn't request this, you can safely ignore this email. Your password will not change.
                  </p>
                  <p style="margin:0;color:#5a6878;font-size:13px;">
                    For security, never share this OTP with anyone.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding:20px 32px;border-top:1px solid #252e3a;text-align:center;">
                  <p style="margin:0;color:#5a6878;font-size:12px;">
                    © 2025 VoltCore Engineering Pvt. Ltd. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `VoltCore ERP <${process.env.SMTP_USER}>`,
    to: email,
    subject: `${otp} — Your VoltCore ERP Password Reset OTP`,
    html,
    text: `Your VoltCore ERP password reset OTP is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, ignore this email.`,
  })
}

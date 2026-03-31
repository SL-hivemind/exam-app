import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging

logger = logging.getLogger(__name__)

SMTP_EMAIL = os.environ.get('SMTP_EMAIL', '')
SMTP_APP_PASSWORD = os.environ.get('SMTP_APP_PASSWORD', '')
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))


def send_otp_email(to_email, otp_code, username):
    """Send a 6-digit OTP to the user's registered email via Gmail SMTP."""
    if not SMTP_EMAIL or not SMTP_APP_PASSWORD:
        logger.error("SMTP credentials not configured in .env")
        raise RuntimeError("Email service is not configured. Contact the administrator.")

    subject = "SL Exams — Password Reset OTP"
    html_body = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto;
                padding: 32px; background: #f8fafc; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px;
                        background: linear-gradient(135deg, #2563eb, #3b82f6);
                        line-height: 48px; color: #fff; font-weight: 800; font-size: 20px;">
                SL
            </div>
        </div>
        <h2 style="text-align: center; color: #0f172a; margin-bottom: 8px;">
            Password Reset Request
        </h2>
        <p style="text-align: center; color: #64748b; font-size: 14px; margin-bottom: 24px;">
            Hi <strong>{username}</strong>, use the OTP below to reset your password.
        </p>
        <div style="text-align: center; background: #fff; border: 2px dashed #3b82f6;
                    border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #2563eb;">
                {otp_code}
            </span>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px;">
            This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="text-align: center; color: #94a3b8; font-size: 11px;">
            If you didn't request this, please ignore this email.
        </p>
    </div>
    """

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f"SL Exams <{SMTP_EMAIL}>"
    msg['To'] = to_email

    plain = f"Your OTP for password reset is: {otp_code}\nValid for 5 minutes.\n— SL Exams"
    msg.attach(MIMEText(plain, 'plain'))
    msg.attach(MIMEText(html_body, 'html'))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_APP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        logger.info(f"OTP email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email to {to_email}: {e}")
        raise RuntimeError(f"Failed to send email: {str(e)}")

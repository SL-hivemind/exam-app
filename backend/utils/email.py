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

    subject = "SL Exams \u2014 Password Reset OTP"
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

    plain = f"Your OTP for password reset is: {otp_code}\nValid for 5 minutes.\n\u2014 SL Exams"
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


def send_welcome_email(to_email, username, password, role):
    """Send a welcome email with credentials to newly registered staff."""
    if not SMTP_EMAIL or not SMTP_APP_PASSWORD:
        logger.error("SMTP credentials not configured in .env")
        return False

    role_formatted = role.replace('_', ' ').title()
    subject = f"Welcome to SL Exams \u2014 Your {role_formatted} Account Details"
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
            Welcome to SL Exams
        </h2>
        <p style="text-align: center; color: #64748b; font-size: 14px; margin-bottom: 24px;">
            Hi <strong>{username}</strong>, you have been added as a <strong>{role_formatted}</strong>. Here are your login credentials:
        </p>
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0; color: #334155; font-size: 14px;">
                <strong>Username:</strong> {username}
            </p>
            <p style="margin: 0; color: #334155; font-size: 14px;">
                <strong>Password:</strong> {password}
            </p>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://exams.theslpl.in/" style="display: inline-block; background: #2563eb; color: #fff;
                      text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Login to Your Account
            </a>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px;">
            Please log in and change your password to something secure as soon as possible.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="text-align: center; color: #94a3b8; font-size: 11px;">
            This is an automated email. Please do not reply.
        </p>
    </div>
    """

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f"SL Exams <{SMTP_EMAIL}>"
    msg['To'] = to_email

    plain = f"Welcome to SL Exams!\nYou have been added as a {role_formatted}.\nUsername: {username}\nPassword: {password}\nPlease log in and change your password."
    msg.attach(MIMEText(plain, 'plain'))
    msg.attach(MIMEText(html_body, 'html'))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_APP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        logger.info(f"Welcome email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send welcome email to {to_email}: {e}")
        return False


def send_student_welcome_email(to_email, username, password):
    """Send a welcome email to a newly created student with login credentials."""
    if not SMTP_EMAIL or not SMTP_APP_PASSWORD:
        logger.error("SMTP credentials not configured in .env")
        return False

    subject = "Saarada Learknowations \u2014 Your Account Details"
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
            Welcome to Saarada Learknowations
        </h2>
        <p style="text-align: center; color: #64748b; font-size: 14px; margin-bottom: 24px;">
            Hi <strong>{username}</strong>, your account has been created. Here are your login credentials:
        </p>
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0; color: #334155; font-size: 14px;">
                <strong>Username:</strong> {username}
            </p>
            <p style="margin: 0; color: #334155; font-size: 14px;">
                <strong>Password:</strong> {password}
            </p>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://exams.theslpl.in/" style="display: inline-block; background: #2563eb; color: #fff;
                      text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Login to Your Account
            </a>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px;">
            Please keep your credentials safe. You will be notified when exams are assigned to you.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="text-align: center; color: #94a3b8; font-size: 11px;">
            This is an automated email from Saarada Learknowations. Please do not reply.
        </p>
    </div>
    """

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f"Saarada Learknowations <{SMTP_EMAIL}>"
    msg['To'] = to_email

    plain = (
        f"Welcome to Saarada Learknowations!\n"
        f"Hi {username}, your account has been created.\n"
        f"Username: {username}\n"
        f"Password: {password}\n"
        f"Login: https://exams.theslpl.in/"
    )
    msg.attach(MIMEText(plain, 'plain'))
    msg.attach(MIMEText(html_body, 'html'))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_APP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        logger.info(f"Student welcome email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send student welcome email to {to_email}: {e}")
        return False


def send_exam_notification_email(to_email, username, exam_title, exam_description, duration_minutes):
    """Send an exam assignment notification to a student with instructions."""
    if not SMTP_EMAIL or not SMTP_APP_PASSWORD:
        logger.error("SMTP credentials not configured in .env")
        return False

    desc_html = f'<p style="color: #64748b; font-size: 13px; margin: 0;">{exam_description}</p>' if exam_description else ''

    subject = f"Saarada Learknowations \u2014 Exam Assigned: {exam_title}"
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
            Exam Assigned
        </h2>
        <p style="text-align: center; color: #64748b; font-size: 14px; margin-bottom: 24px;">
            Hi <strong>{username}</strong>, you have been assigned a new exam on Saarada Learknowations.
        </p>

        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 16px;">{exam_title}</h3>
            {desc_html}
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f1f5f9;">
                <span style="display: inline-block; background: #eff6ff; color: #2563eb; padding: 4px 12px;
                             border-radius: 6px; font-size: 13px; font-weight: 600;">
                    Duration: {duration_minutes} minutes
                </span>
            </div>
        </div>

        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0 0 4px 0; color: #92400e; font-weight: 700; font-size: 13px;">Important Instructions:</p>
            <ul style="margin: 8px 0 0 0; padding-left: 18px; color: #78350f; font-size: 13px; line-height: 1.8;">
                <li>Do <strong>not switch tabs</strong> during the exam.</li>
                <li>Do <strong>not close the browser</strong> before your duration ends.</li>
                <li>If you get disconnected, please <strong>re-login</strong> and continue — your timer will still be running.</li>
                <li>For any further problems, contact: <strong>040 45632683</strong></li>
            </ul>
        </div>

        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0; color: #334155; font-size: 14px;">
                <strong>Your Username:</strong> {username}
            </p>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://exams.theslpl.in/" style="display: inline-block; background: #2563eb; color: #fff;
                      text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Login &amp; Start Exam
            </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="text-align: center; color: #94a3b8; font-size: 11px;">
            This is an automated email from Saarada Learknowations. Please do not reply.
        </p>
    </div>
    """

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f"Saarada Learknowations <{SMTP_EMAIL}>"
    msg['To'] = to_email

    plain = (
        f"Exam Assigned: {exam_title}\n"
        f"Hi {username}, you have been assigned a new exam.\n"
        f"Duration: {duration_minutes} minutes\n\n"
        f"Instructions:\n"
        f"- Do not switch tabs during the exam.\n"
        f"- Do not close the browser before your duration ends.\n"
        f"- If disconnected, re-login and continue.\n"
        f"- For problems, contact: 040 45632683\n\n"
        f"Login: https://exams.theslpl.in/"
    )
    msg.attach(MIMEText(plain, 'plain'))
    msg.attach(MIMEText(html_body, 'html'))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_APP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        logger.info(f"Exam notification email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send exam notification to {to_email}: {e}")
        return False

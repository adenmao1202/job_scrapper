# Email Notifications Setup Guide



## ✅ Gmail App Password Setup

To enable email notifications, follow these steps:

### 1. Enable 2-Factor Authentication
- Go to [Google Account Security](https://myaccount.google.com/security)
- Enable 2-factor authentication if not already enabled

### 2. Generate App Password
- Go to [App Passwords](https://myaccount.google.com/apppasswords)
- Select app: "Mail"
- Select device: "Other" → Type "Job Scraper"
- Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### 3. Update .env File
```env
ENABLE_NOTIFICATIONS=true
SMTP_USER=luizmao1202@gmail.com
SMTP_PASS=abcdefghijklmnop
```
*Replace `abcdefghijklmnop` with your actual app password (no spaces)*

## 📧 Email Features

When configured, you'll receive emails after each job collection with:
- Number of new jobs found
- Total jobs in database
- Direct link to your Google Sheet
- Next collection time
- Professional HTML formatting

## ✉️ Test Email Setup

After configuration, the system will automatically send test emails when jobs are collected. You should receive your first email within 2 hours (next scheduled run).

## 🔒 Security Best Practices

- ✅ Use App Passwords (not regular passwords)
- ✅ Keep `.env` file private (never commit to git)
- ✅ Use different app passwords for different applications
- ✅ Revoke app passwords you no longer use

## 🚫 Common Issues

**Issue**: "Authentication failed"
**Solution**: Make sure you're using an App Password, not your regular Gmail password

**Issue**: "No email received"
**Solution**: Check spam folder and verify SMTP settings

**Issue**: "Connection timeout"
**Solution**: Check if your network blocks SMTP ports (587/465)
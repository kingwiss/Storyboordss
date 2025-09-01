# SMTP Configuration for Password Reset Emails

This application now supports real email delivery using Gmail SMTP for password reset functionality.

## Gmail SMTP Setup Instructions

### Prerequisites
1. A Gmail account
2. Two-factor authentication enabled on your Gmail account

### Step-by-Step Configuration

1. **Enable 2-Factor Authentication**
   - Go to your Google Account settings
   - Navigate to Security > 2-Step Verification
   - Follow the instructions to enable 2FA

2. **Generate App Password**
   - Visit: https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Other" as the device and enter "Node.js App"
   - Copy the generated 16-character app password

3. **Update Environment Variables**
   - Open the `.env` file in the backend directory
   - Replace the placeholder values:
     ```
     EMAIL_USER=your-gmail@gmail.com
     EMAIL_PASS=your-16-character-app-password
     EMAIL_FROM=your-gmail@gmail.com
     ```

4. **Restart the Server**
   - Stop the current server (Ctrl+C)
   - Run `npm start` again

### Testing the Configuration

1. Open the application in your browser
2. Click "Forgot Password" on the login form
3. Enter a valid email address that exists in your user database
4. Check your Gmail inbox for the password reset email

### Troubleshooting

- **"Invalid login" error**: Make sure you're using an App Password, not your regular Gmail password
- **"Authentication failed" error**: Verify that 2FA is enabled and the App Password is correct
- **No email received**: Check your spam folder and verify the email address exists in the database

### Alternative SMTP Providers

You can also use other SMTP providers by updating the `.env` file:

**Outlook/Hotmail:**
```
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

**Yahoo Mail:**
```
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

### Security Notes

- Never commit your `.env` file to version control
- Use App Passwords instead of regular passwords
- Consider using environment-specific configurations for production
- The current configuration uses `rejectUnauthorized: false` for development - review this for production use
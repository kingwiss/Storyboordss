# Password Reset Setup Guide

## Overview

This guide explains how to set up and configure the password reset functionality in the Cerebray application. The password reset flow uses SendGrid for sending emails with reset links to users.

## Prerequisites

1. A SendGrid account with API access
2. A verified sender email in SendGrid
3. A dynamic template created in SendGrid for password reset emails

## Configuration Steps

### 1. Set up SendGrid API

1. Create a SendGrid account if you don't have one already
2. Create an API key with mail sending permissions
3. Create a dynamic template for password reset emails with the following variables:
   - `name`: User's name (derived from email)
   - `reset_url`: URL for password reset
   - `account_name`: Application name
   - `support_email`: Support email address

### 2. Configure Environment Variables

Add the following environment variables to your `.env` file:

```
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_TEMPLATE_ID=your-sendgrid-template-id
SENDGRID_FROM_EMAIL=noreply@cerebray.com
```

### 3. Password Reset Flow

The password reset flow consists of the following steps:

1. User clicks "Forgot Password" on the login form
2. User enters their email address
3. System generates a secure reset token and stores it in the database
4. System sends an email with a reset link containing the token
5. User clicks the link and is taken to the reset password page
6. User enters a new password
7. System verifies the token and updates the user's password
8. User is redirected to the login page

### 4. Security Considerations

- Reset tokens expire after 1 hour
- Tokens can only be used once
- The system does not reveal whether an email exists in the database
- Passwords must meet minimum security requirements

## Troubleshooting

### Email Not Received

1. Check that the SendGrid API key is correct
2. Verify that the sender email is verified in SendGrid
3. Check the server logs for any SendGrid API errors
4. Check the user's spam folder

### Invalid Token Error

1. The token may have expired (tokens are valid for 1 hour)
2. The token may have already been used
3. The token may be malformed or incorrect

### Password Reset Failed

1. Ensure the new password meets the minimum requirements
2. Check that the token is valid and not expired
3. Check the server logs for any database errors

## Testing

To test the password reset flow:

1. Click "Forgot Password" on the login form
2. Enter a valid email address
3. Check the email for the reset link
4. Click the link and enter a new password
5. Verify that you can log in with the new password
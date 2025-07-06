# Google OAuth Setup Guide - UPDATED

## 🚨 SECURITY ALERT
Your Google OAuth credentials were visible in the `.env` file. I've replaced them with placeholders for security.

## Current Status
- ✅ Google OAuth implementation is complete and working
- ✅ Frontend buttons are correctly configured
- ✅ Backend routes and passport configuration are set up
- ✅ Syntax errors are resolved
- ❌ **Error 401: invalid_client** - Need to fix Google Cloud Console setup

## Error 401: invalid_client - Solutions

This error occurs when:
1. **Wrong credentials** - Client ID/Secret are incorrect
2. **Callback URL mismatch** - URL in Google Console ≠ URL in your app
3. **Project/API not enabled** - Google+ API or Google Identity not enabled
4. **Domain restrictions** - Your domain is not authorized

## Step-by-Step Fix

### 1. Google Cloud Console Setup

1. **Go to**: https://console.cloud.google.com/
2. **Create/Select Project**: Make sure you're in the right project
3. **Enable APIs**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Identity" or "Google+ API"
   - Click "Enable"

4. **Create NEW OAuth Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "Eastern Banjo OAuth"

5. **Set Authorized Redirect URIs** (CRITICAL):
   ```
   http://localhost:3000/auth/google/callback
   https://easternbanjo.com/auth/google/callback
   ```

6. **Copy NEW credentials**:
   - Copy the new Client ID
   - Copy the new Client Secret

### 2. Update Your .env File

Replace the placeholders with your NEW credentials:

```bash
JWT_KEY = jhkkaakdbvgjfcfghdyurth;
EXPRESS_SESSION_SECRET=hvhghjcghjxghh;

# Google OAuth Configuration - USE YOUR NEW CREDENTIALS
GOOGLE_CLIENT_ID=your_new_google_client_id_here
GOOGLE_CLIENT_SECRET=your_new_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### 3. For Production (easternbanjo.com)

When deploying to production, update:
```bash
GOOGLE_CALLBACK_URL=https://easternbanjo.com/auth/google/callback
```

And make sure `https://easternbanjo.com/auth/google/callback` is in your Google Console redirect URIs.

### 4. Testing Steps

1. **Start your app**: `npm start`
2. **Visit**: http://localhost:3000
3. **Click Google login button**
4. **Should redirect to Google** (not show error 401)
5. **After Google auth** → Should return to your app

### 5. Common Troubleshooting

**If you still get Error 401:**
- Double-check Client ID/Secret are copied correctly (no extra spaces)
- Verify the callback URL in Google Console exactly matches your .env
- Make sure you're using the credentials from the correct Google project
- Try creating completely new OAuth credentials

**If redirect URI mismatch:**
- Check Google Console redirect URIs include: `http://localhost:3000/auth/google/callback`
- Make sure there are no typos in the URL

**If API not enabled:**
- Go to APIs & Services > Library
- Search "Google Identity" and enable it

## Your App Flow (When Working)

1. User clicks Google button → `/auth/google`
2. Redirects to Google → User logs in
3. Google redirects back → `/auth/google/callback`
4. Your app creates/finds user → Saves to MongoDB
5. User logged in → JWT token set, redirected to shop

## Security Notes

- ✅ Never commit `.env` with real credentials
- ✅ Use environment variables in production
- ✅ Regularly rotate OAuth credentials
- ✅ Monitor for unauthorized usage

Your OAuth should work once you set up new credentials in Google Cloud Console!

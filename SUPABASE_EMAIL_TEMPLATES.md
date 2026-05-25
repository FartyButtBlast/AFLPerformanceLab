# Supabase Email Templates

## Reset Password

Subject:

```text
Reset your SportzLabs password
```

Template file:

```text
supabase-email-templates/reset-password.html
```

In Supabase:

1. Open the Supabase project.
2. Go to **Authentication**.
3. Open **Email Templates**.
4. Select **Reset Password**.
5. Set the subject to `Reset your SportzLabs password`.
6. Paste the HTML from `supabase-email-templates/reset-password.html`.
7. Save.

The reset link must use Supabase's `{{ .ConfirmationURL }}` variable. Do not replace it with a normal URL.

The logo points to:

```text
https://aflperformance.sportzlabs.com/icons/sportzlabs-logo-black.png
```

Make sure the AFL Performance app has been redeployed after adding `icons/sportzlabs-logo-black.png`, otherwise the email may not load the logo.

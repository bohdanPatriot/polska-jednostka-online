# Security Guidelines - Polish Military Forum

## Overview
This document outlines the security measures implemented in this application and guidelines for maintaining security.

## Authentication & Authorization

### User Roles
- **Role Storage**: Roles are stored in a separate `user_roles` table (NOT on profiles table)
- **Role Validation**: All role checks use the `has_role()` database function with `SECURITY DEFINER`
- **Available Roles**: `admin`, `moderator`, `user`
- **No Client-Side Checks**: All authorization happens server-side via RLS policies

### Password Policy
- **Minimum Length**: 8 characters
- **Complexity**: Must contain uppercase, lowercase, and number
- **Leaked Password Protection**: Enabled (check Supabase Auth settings)
- **Password Reset**: Available via `/password-reset` page

### Session Management
- **JWT-based**: Using Supabase Auth
- **Auto-refresh**: Tokens refresh automatically
- **Session Tracking**: IP and geolocation logged (with privacy controls)
- **Storage**: localStorage (persistent sessions)

## Input Validation

### Client-Side Validation (Zod)
All user inputs are validated using Zod schemas before submission:

#### Auth.tsx
- **Username**: 3-30 chars, alphanumeric + underscore only
- **Email**: Valid email format, max 255 chars
- **Password**: 8-100 chars, must include upper, lower, number

#### BlogEditor.tsx
- **Title**: 1-200 chars
- **Content**: 1-10,000 chars

#### ReportButton.tsx
- **Reason**: Enum validation (spam, harassment, inappropriate, misinformation, other)
- **Description**: Max 1,000 chars (optional)

#### NewThread.tsx
- **Title**: 5-200 chars
- **Content**: 10-10,000 chars
- **Category**: Enum validation (historia, sprzet, taktyka, aktualnosci, offtopic)

### Server-Side Validation
- **RLS Policies**: All database access enforces Row Level Security
- **Database Functions**: Use `SECURITY DEFINER` with `set search_path = public`
- **Edge Functions**: Validate authentication before processing

## Rate Limiting

### Client-Side Rate Limiting (lib/rateLimit.ts)
Provides first-line defense against spam:

- **Reports**: 5 per 15 minutes per user
- **Direct Messages**: 20 per minute per user
- **Poll Votes**: 10 per 5 minutes per user
- **Note**: Server-side RLS is the ultimate security layer

### Implementation
```typescript
import { checkRateLimit } from "@/lib/rateLimit";

const rateLimit = checkRateLimit({
  identifier: `action:${userId}`,
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
});

if (!rateLimit.allowed) {
  // Reject request
}
```

## File Upload Security

### MediaUpload.tsx Validation
- **Max Size**: 50MB per file (down from 100MB)
- **Allowed Types**: 
  - Images: JPEG, PNG, GIF, WebP
  - Video: MP4, WebM
  - Audio: MP3, WAV, OGG
- **Extension Check**: File extension must match MIME type
- **User Folder Isolation**: Files stored in user-specific folders

### Storage Buckets
- **avatars**: Public (profile pictures)
- **post-media**: Public (forum attachments)
- **dm-attachments**: Private (direct message files)
- **signature-images**: Public (user signatures)

### Recommendations
- Consider implementing malware scanning (e.g., VirusTotal API)
- Monitor storage usage per user
- Implement file cleanup for deleted posts/users

## Database Security

### Row Level Security (RLS)
All tables have RLS enabled with appropriate policies:

#### Key Policies
- **Ownership**: Users can only modify their own content
- **Role-Based**: Admins/moderators have elevated permissions
- **Read Access**: Authenticated users can view public content
- **Privacy**: Session data, DMs protected by ownership checks

### Database Functions
```sql
-- Example: has_role function
CREATE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### Audit Logging
All admin actions are logged in `audit_logs` table:
- Role changes
- User bans
- Post/thread moderation
- Includes: admin_id, action_type, target_id, old/new values, reason

## Edge Functions

### track-session
- **Purpose**: Log user login sessions with IP and geolocation
- **Security**: Validates auth before insertion
- **Privacy**: Uses view (`user_session_summary`) to hash IPs for regular users
- **Geolocation**: Dual-fallback system (ipapi.co → ip-api.com)

### delete-user
- **Purpose**: Complete user data deletion
- **Security**: Only callable by user or admin
- **Audit**: Logs deletion action before execution
- **Cascade**: Deletes all related data (posts, messages, sessions, etc.)

## Network Security

### CORS
All edge functions implement proper CORS headers:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

### API Endpoints
- **Authentication**: All requests include JWT token in Authorization header
- **Validation**: User identity validated via `supabase.auth.getUser()`
- **Timeout**: Geolocation requests have 3-second timeout

## Privacy Protection

### User Session Tracking
- **Admin View**: Full IP address and detailed location
- **User View**: Hashed IP (SHA-256) and limited location data
- **Time Limit**: Detailed location only for last 30 days
- **View**: `user_session_summary` implements privacy controls

### Personal Data
- **Email**: Hidden by default (show_email profile setting)
- **Last Online**: Controllable via show_last_online setting
- **IP Addresses**: Hashed for non-admin users
- **Direct Messages**: Only sender/recipient can access

## Security Checklist

### ✅ Implemented
- [x] Role-based access control (separate user_roles table)
- [x] Input validation (Zod schemas)
- [x] Rate limiting (client-side)
- [x] File upload validation (size, type, extension)
- [x] RLS policies on all tables
- [x] Audit logging for admin actions
- [x] Password complexity requirements
- [x] Session tracking with privacy controls
- [x] Enum validation for categories and roles
- [x] Password reset flow
- [x] Geolocation fallback mechanism
- [x] CORS headers on edge functions
- [x] No client-side role checks
- [x] Security definer functions use search_path

### ⚠️ Manual Configuration Required
- [ ] Enable leaked password protection (Supabase Dashboard → Auth → Password Policy)
- [ ] Enable email verification (Supabase Dashboard → Auth → Email Templates)
- [ ] Configure CSP headers (via hosting provider)
- [ ] Enable HSTS (via hosting provider)

### 🔄 Recommended Improvements
- [ ] Implement malware scanning for file uploads
- [ ] Add CAPTCHA for signup/login
- [ ] Implement server-side rate limiting (database-level)
- [ ] Add 2FA support
- [ ] Implement session invalidation on password change
- [ ] Add IP-based brute force protection
- [ ] Conduct penetration testing
- [ ] Implement automated security scanning (OWASP ZAP)

## Incident Response

### In Case of Security Breach
1. **Immediate**: Disable affected user accounts
2. **Audit**: Check `audit_logs` for suspicious activity
3. **Sessions**: Review `user_sessions` for unauthorized access
4. **Notify**: Alert affected users via email
5. **Patch**: Deploy security fix immediately
6. **Document**: Record incident details and response

### Monitoring
- Review audit logs weekly
- Monitor failed login attempts
- Track file upload sizes and frequencies
- Check for unusual API usage patterns

## Reporting Security Issues

If you discover a security vulnerability:
1. **DO NOT** create a public GitHub issue
2. Email security contact directly
3. Include: description, steps to reproduce, potential impact
4. Allow 48 hours for initial response

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [React Security Best Practices](https://react.dev/learn/security)

## Last Updated
2024-11-04 (Phase 1 & 2 Security Improvements)

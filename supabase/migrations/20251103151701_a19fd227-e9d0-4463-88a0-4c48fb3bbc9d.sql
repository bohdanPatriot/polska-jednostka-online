-- Create secure view for user sessions that hashes IP addresses
-- Users can see their session history but with privacy protection
CREATE OR REPLACE VIEW user_session_summary AS
SELECT 
  id,
  user_id,
  encode(digest(ip_address::text, 'sha256'), 'hex') AS ip_hash,
  user_agent,
  country, -- Keep country for general awareness
  created_at,
  -- Only show detailed location for recent sessions (last 30 days)
  CASE 
    WHEN created_at > NOW() - INTERVAL '30 days' THEN city
    ELSE NULL
  END AS city,
  CASE 
    WHEN created_at > NOW() - INTERVAL '30 days' THEN region
    ELSE NULL
  END AS region
FROM user_sessions;

-- Grant access to authenticated users
GRANT SELECT ON user_session_summary TO authenticated;

-- Create RLS policy for the view
ALTER VIEW user_session_summary SET (security_invoker = on);

-- Add comment explaining the security model
COMMENT ON VIEW user_session_summary IS 
'Secure view of user sessions with hashed IP addresses. Shows detailed location only for sessions within last 30 days. Admins should query user_sessions directly for full data.';
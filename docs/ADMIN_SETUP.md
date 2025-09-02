# Admin User Setup

Since authorization is now fully database-driven, admin users must be set up directly in the database.

## Method 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to "Table Editor" 
3. Open the `user_roles` table
4. Find the user by their `user_id` (from the `auth.users` table)
5. Update or insert a record with their `user_id` and desired `role`

## Method 2: Using SQL Console

Run this SQL in your Supabase SQL console:

```sql
-- First, find the user ID from their email
SELECT id, email FROM auth.users WHERE email = 'your-admin-email@domain.com';

-- Then set their role (replace 'USER_ID_HERE' with the actual ID)
INSERT INTO user_roles (user_id, role) 
VALUES ('USER_ID_HERE', 'super_admin') 
ON CONFLICT (user_id) 
DO UPDATE SET role = 'super_admin';
```

## Available Roles

- `player` - Default user (read-only access)
- `captain` - Team management permissions  
- `admin` - Full match and team management
- `super_admin` - All permissions including user management

## Verification

After setting the role:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Log out and log back in
3. The role should be reflected immediately on the dashboard

## Notes

- Roles are cached per session - users must log out/in to see changes
- No-cache headers prevent browser caching of role data
- All role checking is done server-side from the database
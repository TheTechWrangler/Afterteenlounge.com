# Admin V1 Plan

## Admin Pages
- Dashboard
- Homepage
- Calendar
- Users

## User Groups
- Super Admin
- Admin
- Limited Admin

## Core Rule
Only Super Admin can create, assign, promote, demote, or deactivate Admin and Limited Admin accounts.

## Permissions Matrix

### Super Admin
- Access Dashboard
- Manage Homepage
- Manage Calendar
- Manage Users
- Assign user groups

### Admin
- Access Dashboard
- Manage Homepage
- Manage Calendar
- Cannot manage users
- Cannot assign groups

### Limited Admin
- Access Dashboard
- Assigned section only later if needed
- Cannot manage users
- Cannot assign groups

## Notes
- Public users are not part of V1
- User groups exist for admin-side control only
- General content/image management can be expanded later
- Front page development depends first on roles, dashboard, and calendar structure

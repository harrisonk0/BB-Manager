# BB-Manager Product Requirements Document

## Product Vision

BB-Manager is a secure, UK law-compliant web application for managing Boys' Brigade member data, including attendance tracking, weekly marks recording, and member information management. The application enables officers and leaders to efficiently administer their sections while maintaining strict data protection standards for minors' information.

**Core Value**: Secure (UK law compliant) and functional management of boy marks and attendance data.

## Target Users

### Primary Users

1. **Officers**
   - Day-to-day management of member records
   - Entry of weekly attendance and marks
   - View member information and history
   - Operate across both Company and Junior sections

2. **Captains**
   - All Officer capabilities
   - Access to audit logs for accountability
   - Management of section settings (meeting days, etc.)
   - Management of Officer roles
   - Generation of invite codes for new Officers
   - One global Captain (not section-bound)

3. **Admins**
   - All Captain capabilities
   - Revert audit log actions (Admins only)
   - Management of Captain and Officer roles
   - Generation of invite codes for Officers and Captains
   - Admins are provisioned manually (no in-app promotion path)

### Organization Context

The Boys' Brigade is a UK youth organization working with children and young people. This context drives critical compliance requirements:

- **Data Protection**: UK GDPR compliance for processing minors' personal data
- **Consent**: Parental consent requirements for data collection
- **Retention**: Appropriate data retention policies (audit logs: 14 days)
- **Security**: Strict access controls to protect sensitive information

## User Stories

### Member Management

> As an Officer, I want to maintain a roster of members with their squad assignments and school years, so that I can organize the section effectively.

- Create, read, update, and delete member records
- Assign members to squads (1-3 for Company, 1-4 for Junior)
- Track school year (8-14 for Company, P4-P7 for Junior)
- Mark members as squad leaders

### Weekly Marks Entry

> As an Officer, I want to quickly enter attendance and marks for all members on a meeting night, so that I can track participation and performance.

- Enter marks for all members in one session
- Record attendance (present/absent)
- Company Section: enter scores 0-10
- Junior Section: enter uniform score (0-10) and behaviour score (0-5)
- Lock past dates to prevent accidental edits
- Automatic date selection based on section meeting day

### Marks Viewing and History

> As an Officer, I want to view a member's complete marks history, so that I can track their progress over time.

- View all historical marks for a member
- Edit past marks with proper authorization
- Delete incorrect mark entries
- Visual representation of marks trends

### Dashboard and Reporting

> As an Officer, I want to see performance statistics and attendance trends, so that I can identify members needing attention.

- Top 5 members leaderboard
- Squad performance comparison
- Attendance heatmap by squad and date
- Monthly marks breakdown

### Section Management

> As a Captain, I want to configure settings for each section, so that the app reflects our meeting schedule.

- Set meeting day for Company Section
- Set meeting day for Junior Section
- Settings persist per section

### Audit Logging

> As a Captain, I want to see a history of changes made to the data, so that I can maintain accountability and investigate issues.

- View all actions taken by users
- See who made what change and when
- Revert accidental changes (Admin only)
- Audit logs retained for 14 days

### User Management

> As a Captain, I want to invite new officers to use the system, so that our team can collaborate on member management.

- Generate one-time-use invite codes
- Specify default role for invitee
- Codes expire after 7 days
- Revoke invite codes if needed
- Track which codes have been used

> As an Admin, I want to manage user roles, so that I can control access to sensitive features.

- Assign and update Officer roles
- Assign and update Captain roles (Admin only)
- Remove user roles when needed
- Users cannot change their own role

### Authentication

> As a user, I want to sign in securely with my email and password, so that my access is protected.

- Email/password authentication via Better Auth (self-hosted)
- Secure session persistence (HTTP-only cookies)
- Password reset capability
- Sign out functionality

## Key Features

### 1. Two-Section Model

The application manages two distinct sections:

| Aspect | Company Section | Junior Section |
|--------|-----------------|----------------|
| Squads | 1, 2, 3 | 1, 2, 3, 4 |
| School Years | 8, 9, 10, 11, 12, 13, 14 | P4, P5, P6, P7 |
| Marks System | Single score (0-10) | Uniform (0-10) + Behaviour (0-5) |

**Important**: Section separation is contextual, not a security boundary. Officers can access both sections.

### 2. Role-Based Access Control

Three roles define what users can do:

| Feature | Officer | Captain | Admin |
|---------|---------|---------|-------|
| View/edit member data | Yes | Yes | Yes |
| Update marks | Yes | Yes | Yes |
| Read audit logs | No | Yes | Yes |
| Revert actions | No | No | Yes |
| Manage settings | No | Yes | Yes |
| Manage roles | No | Officers only | Captain + Officer |
| Create invites (Officer) | No | Yes | Yes |
| Create invites (Captain) | No | No | Yes |

**Hierarchy**: admin > captain > officer

### 3. Invite Code System

New user signup requires an invite code:

- Captains can generate Officer invites only
- Admins can generate Officer and Captain invites
- Admins cannot be created via invite (manual provisioning only)
- Codes are single-use and expire in 7 days
- Codes can be revoked before use

### 4. Audit and Revert

- All significant actions are logged with:
  - Timestamp
  - User email
  - Action type
  - Description
  - Revert data (snapshot of prior state)
- Admins can revert most actions
- Revert creates a new audit log linking to the original

### 5. Data Protection

| Requirement | Implementation |
|-------------|----------------|
| Access control | RLS policies enforce role-based access |
| Auditability | All changes logged with user identity |
| Data retention | Audit logs automatically cleaned after 14 days |
| Authentication | Better Auth with argon2id and HTTP-only cookies |
| Minimisation | Only necessary data collected |
| Accuracy | Users can correct their own data |

## Compliance Requirements (UK Law)

### GDPR for Minors' Data

1. **Lawful Basis**: Legitimate interests for youth organization administration
2. **Parental Consent**: Assumed through enrollment in Boys' Brigade
3. **Data Minimisation**: Only collect necessary information (name, squad, year, marks)
4. **Access Rights**: Users can view and correct their data
5. **Retention**: Audit logs retained 14 days; member data until departure
6. **Security**: RLS policies prevent unauthorized access

### Data Security

- Authentication via Better Auth (self-hosted)
- Password hashing with argon2id (OWASP/NIST recommended)
- Authorization via database RLS policies
- Client-side checks are UX only; database enforces security
- HTTP-only, Secure, SameSite cookies prevent XSS
- Invite code validation prevents enumeration

## Non-Functional Requirements

### Performance

- Member roster loads and displays quickly (< 2 seconds)
- Weekly marks entry supports all members in one session
- Dashboard computes statistics client-side

### Usability

- Mobile-responsive design
- Intuitive navigation between sections and pages
- Clear feedback for actions (success/error messages)
- Help documentation accessible within app

### Availability

- Online-only application (no offline mode)
- Self-hosted on VPS or Raspberry Pi
- Docker Compose deployment with health checks
- Automated backups via kartoza/pg-backup
- Static frontend served via Caddy with automatic HTTPS

### Maintainability

- TypeScript for type safety
- Clear separation between UI, services, and types
- Documented architecture and decisions
- Services layer abstracts database queries (Drizzle ORM)
- Self-hosted stack with no vendor lock-in

## Out of Scope (Explicitly Excluded)

The following features were considered but excluded from v1:

1. **Analytics and Reporting**
   - Advanced charts and visualizations beyond basic dashboard
   - Export to PDF/Excel
   - Rationale: Marks viewing is sufficient for operations

2. **Detailed Audit Trail Management**
   - Advanced audit log search and filtering
   - Automated retention enforcement (manual only)
   - Rationale: Not essential for day-to-day operations

3. **Advanced Admin Features**
   - Bulk user operations
   - Custom role creation
   - Fine-grained permissions
   - Rationale: Three-role system meets current needs

4. **Testing/CI/CD**
   - Automated testing infrastructure
   - Continuous integration/deployment
   - Rationale: Deferred until application is operational

5. **Offline Mode**
   - Local caching and sync
   - Progressive Web App features
   - Rationale: Online-only is acceptable for current use case

## Success Criteria

The product is successful when:

1. Officers can efficiently manage member records (CRUD operations)
2. Weekly marks can be entered quickly with real-time feedback
3. Historical marks are viewable and editable as needed
4. Dashboard provides actionable insights into member performance
5. Audit logs enable accountability and error recovery
6. Role-based access prevents unauthorized actions
7. Invite codes enable controlled user onboarding
8. Data is protected according to UK GDPR requirements
9. Application is responsive and easy to use on common devices
10. New users can be trained with minimal documentation

## References

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture and design
- [technical-spec.md](./technical-spec.md) - Technical implementation details
- [database-schema.md](./database-schema.md) - Data model and security

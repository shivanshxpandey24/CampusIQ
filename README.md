# CampusIQ Smart Campus

A responsive campus operations workspace built with Next.js App Router, TypeScript, React Hook Form, Zod, Prisma and PostgreSQL. It includes role-aware authentication, campus-scoped CRUD workflows, dashboard summaries, and an optional server-side OpenAI-compatible assistant.

## Requirements

- Node.js 20.9+ and npm
- PostgreSQL 14+

## Local setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` to a PostgreSQL database.
2. Set `AUTH_SECRET` to a random secret of at least 32 characters. For example, generate one with `openssl rand -base64 32`.
3. Install and initialize:

   ```sh
   npm install
   npm run db:generate
   npm run db:push
   npm run db:seed
   npm run dev
   ```

4. Open `http://localhost:3000`. The seeded demo accounts all use password `CampusIQ2026!`.

To run validation checks: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

## Included workflows

The workspace provides role-aware student lifecycle, academics, attendance, timetable, fees, hostel, transport, certificate, helpdesk, and notification records. Users can search, create, edit, and delete records according to their role. Overview cards and recent campus activity use live database queries. Data is isolated by campus on every API operation.

The seeded users cover all nine roles: Super Admin, college admin, faculty, student, parent, hostel warden, transport manager, accountant, and helpdesk staff. The UI only shows modules permitted to the signed-in role.

## AI provider (optional)

Set `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` to use an OpenAI-compatible `/chat/completions` endpoint. Credentials are read exclusively on the server and are never sent to the browser. Without a key, the assistant returns a transparent local demo response and does not send prompts externally.

## Security and product boundaries

- Authentication uses a signed, HTTP-only, same-site session cookie with an eight-hour expiry; passwords are stored with bcrypt hashes.
- API payloads are validated with Zod. Module visibility and writes are checked server-side, and all record access is scoped to the user's campus.
- Configure a strong `AUTH_SECRET`, TLS, database backups, rate limiting, and monitoring before deployment. Login rate limiting, password reset, SSO/MFA, audit exports, and fine-grained per-student parent data authorization should be added before production use.
- Operational workflows are represented by configurable campus records and typed module buckets, not integrations with payment gateways, GPS/vehicle tracking, SIS/LMS, email/SMS, document signing, or biometric attendance. Those require institution-specific connectors and policies.
- PWA manifest metadata is included; offline caching and push notifications are not enabled.

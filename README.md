# CrisisOps Backend API

Mission-critical disaster response and emergency management API built with Node.js, Express.js, TypeScript, and PostgreSQL.

![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Express.js](https://img.shields.io/badge/Express.js-5.0-orange)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)
![Prisma](https://img.shields.io/badge/Prisma-5.22-purple)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Overview

CrisisOps is a real-time crisis management platform designed to streamline disaster response operations. It enables citizens to report incidents, organizations to coordinate responses, and responders to manage resources effectively.

## Features

- **Multi-Tenant Architecture** — Organizations operate in isolated environments
- **Role-Based Access Control** — 6-tier role hierarchy with permission-based authorization
- **JWT Authentication (RS256)** — Asymmetric key tokens with rotation and family-based revocation
- **Google OAuth 2.0** — Social login with automatic account linking
- **Profile Management** — User profiles with Cloudinary image uploads
- **Incident Management** — Full lifecycle from reporting to resolution
- **Geospatial Queries** — Find nearby incidents using Haversine formula
- **Audit Trail** — Immutable logging with blockchain-style hash chaining
- **Rate Limiting** — Redis-backed protection against abuse
- **API Documentation** — Swagger/OpenAPI 3.0 interactive docs

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 20+ |
| Framework | Express.js 5 |
| Language | TypeScript 5.7 |
| Database | PostgreSQL 14+ |
| ORM | Prisma 5.22 |
| Cache/Queue | Redis (ioredis) + BullMQ |
| Auth | JWT RS256, Passport.js, bcryptjs |
| File Upload | Multer + Cloudinary |
| Validation | Zod |
| Docs | Swagger/OpenAPI 3.0 |
| Logging | Winston + Morgan |

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 6+

### 1. Clone & Install

```bash
git clone https://github.com/A-Simie/CrisisOpsBackend.git
cd CrisisOpsBackend
npm install
npx prisma generate
```

### 2. Generate JWT Keys

```bash
node keys/generate-keys.js
```

This creates RS256 key pairs in `keys/jwt-keys.env`. Copy these values to your `.env`.

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your database, Redis, and key values.

### 4. Run Database Migrations

```bash
npx prisma migrate dev
```

### 5. Start the Server

```bash
# Development (with hot-reload)
npm run dev

# Production
npm run build && npm start
```

### 6. Access the API

| Endpoint | URL |
|----------|-----|
| **Swagger UI** | http://localhost:3000/api/docs |
| **OpenAPI JSON** | http://localhost:3000/api/docs.json |
| **Health Check** | http://localhost:3000/health |
| **Ready Check** | http://localhost:3000/ready |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh tokens |
| POST | `/api/v1/auth/logout` | Logout |
| POST | `/api/v1/auth/logout-all` | Logout all devices |
| POST | `/api/v1/auth/change-password` | Change password |
| GET | `/api/v1/auth/me` | Get current user |
| PATCH | `/api/v1/auth/profile` | Update profile (name, phone, picture) |
| GET | `/api/v1/auth/google` | Initiate Google OAuth |
| GET | `/api/v1/auth/google/callback` | Google OAuth callback |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List users |
| GET | `/api/v1/users/:id` | Get user |
| POST | `/api/v1/users` | Create user |
| PATCH | `/api/v1/users/:id` | Update user |
| PATCH | `/api/v1/users/:id/role` | Update role |
| DELETE | `/api/v1/users/:id` | Deactivate user |

### Organizations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/organizations` | List organizations |
| GET | `/api/v1/organizations/:id` | Get organization |
| POST | `/api/v1/organizations` | Create organization |
| PATCH | `/api/v1/organizations/:id` | Update organization |
| PATCH | `/api/v1/organizations/:id/settings` | Update settings |
| PATCH | `/api/v1/organizations/:id/activate` | Activate |
| PATCH | `/api/v1/organizations/:id/deactivate` | Deactivate |

### Incidents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/incidents/nearby` | Find nearby incidents |
| GET | `/api/v1/incidents` | List incidents |
| GET | `/api/v1/incidents/:id` | Get incident |
| POST | `/api/v1/incidents` | Report incident |
| PATCH | `/api/v1/incidents/:id` | Update incident |
| PATCH | `/api/v1/incidents/:id/status` | Update status |
| POST | `/api/v1/incidents/:id/assign` | Assign to organization |
| POST | `/api/v1/incidents/:id/notes` | Add internal note |
| POST | `/api/v1/incidents/:id/confirm` | Community confirmation |

## Project Structure

```
src/
├── config/           # Configuration (database, redis, env, swagger, google)
├── middleware/       # Express middleware (auth, validation, rate-limit)
├── modules/          # Feature modules
│   ├── auth/         # Authentication + Google OAuth
│   ├── users/        # User management
│   ├── organizations/# Organization management
│   └── incidents/    # Incident management
├── services/         # Shared services (audit)
├── types/            # TypeScript type definitions
├── utils/            # Utility functions (jwt, cloudinary, logger)
├── app.ts            # Express app setup
└── server.ts         # Server entry point
```

## Role Hierarchy

```
CITIZEN < RESPONDER < DISPATCHER < ORG_ADMIN < GOV_ADMIN < SUPER_ADMIN
```

| Role | Description |
|------|-------------|
| CITIZEN | Can report incidents and view own reports |
| RESPONDER | Can respond to incidents |
| DISPATCHER | Can assign responders and resources |
| ORG_ADMIN | Can manage organization users and settings |
| GOV_ADMIN | Can manage multiple organizations |
| SUPER_ADMIN | Full system access |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_PRIVATE_KEY` | RS256 private key (base64) |
| `JWT_ACCESS_PUBLIC_KEY` | RS256 public key (base64) |
| `JWT_REFRESH_PRIVATE_KEY` | RS256 private key (base64) |
| `JWT_REFRESH_PUBLIC_KEY` | RS256 public key (base64) |
| `JWT_ACCESS_EXPIRY` | Access token expiry (default: 2h) |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry (default: 7d) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL |
| `FRONTEND_URL` | Frontend URL for redirects |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `ALLOWED_ORIGINS` | CORS allowed origins |

## Deployment (Render)

1. Push to GitHub
2. Create Web Service on Render
3. **Build Command**: `npm install && npx prisma generate && npm run build`
4. **Start Command**: `npx prisma migrate deploy && npm start`
5. Add all environment variables
6. Update Google OAuth callback URL in Google Cloud Console

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Prisma Studio |

## License

MIT © CrisisOps

---

Built with ❤️ for emergency responders and communities worldwide.

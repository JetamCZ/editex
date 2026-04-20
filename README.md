# Editex

Collaborative LaTeX editor with real-time editing, version control, and file management.

Live app: [editex.eu](https://editex.eu)

## Stack

- **Frontend**: React 19, TypeScript, Monaco Editor, TailwindCSS
- **Backend**: Spring Boot 3 (Java 21), PostgreSQL
- **Storage**: S3-compatible (MinIO / Hetzner Object Storage)

## Requirements

- Docker & Docker Compose
- S3-compatible bucket (MinIO or any S3 provider)
- SMTP server for email notifications

## Setup

1. Copy the environment file and fill in your values:

```bash
cp backend/.env.example backend/.env
```

Key variables to configure:

| Variable | Description |
|---|---|
| `S3_ENDPOINT` | S3 endpoint URL |
| `S3_ACCESS_KEY` | S3 access key |
| `S3_SECRET_KEY` | S3 secret key |
| `S3_BUCKET` | Bucket name |
| `POSTGRES_*` | Database connection |
| `MAIL_*` | SMTP configuration |
| `JWT_SECRET` | JWT signing secret |

2. Start the app:

```bash
docker compose up -d
```

The app will be available at `http://localhost:3000`.

## Features

- Real-time collaborative editing (WebSocket)
- File branching and commit history
- Role-based access control
- LaTeX compilation
- Email notifications

# LinkCamp Server
Backend API and realtime service for LinkCamp, a role-based campus community platform.

## Companion Repository
- Client (React Native + Expo): https://github.com/f-zaman-rafi/LinkCamp-with-React-Native

## Overview
LinkCamp Server provides:
- Firebase token verification and role-aware access control
- User onboarding and account state management (`pending`, `approved`, `blocked`)
- Feed APIs for general posts, teacher announcements, and admin notices
- Realtime updates via Socket.IO (posts, comments, votes, user updates)
- Moderation workflows for post/comment reports
- Cloudinary-powered image upload pipeline

## Key Capabilities
- Role-based API guards (`admin`, `teacher`, general user)
- Approval gate for write actions (`ACCOUNT_PENDING` / `ACCOUNT_BLOCKED` responses)
- Feed pagination with cursor support
- Vote, comment, repost, and report systems
- Admin tools for user verification and report triage
- MongoDB indexes for hot feed/count queries

## Tech Stack
- Node.js + Express
- MongoDB Atlas (`mongodb` driver)
- Firebase Admin SDK (ID token verification)
- Socket.IO
- Cloudinary + Multer (`multer-storage-cloudinary`)
- CORS + dotenv

## API Surface (High Level)
### Authentication and User
- `POST /users`
- `POST /login`
- `POST /logout`
- `GET /user/:email`
- `PATCH /user/name`
- `POST /user/upload-photo`
- `PATCH /user/profile`
- `GET /user/profile/:email`

### Feed and Content
- `POST /user/post`
- `GET /posts`
- `GET /posts/:postId`
- `PATCH /posts/:postId`
- `DELETE /posts/:postId`
- `POST /teacher/announcement`
- `GET /teacher/announcements`
- `POST /admin/notice`
- `GET /admin/notices`

### Engagement
- `POST /votes`
- `GET /votes`
- `GET /votes/:postId`
- `GET /voteCounts`
- `GET /commentCounts`
- `GET /repostCounts`
- `POST /comments`
- `GET /comments/:postId`
- `PATCH /comments/:commentId`
- `DELETE /comments/:commentId`

### Moderation and Admin
- `POST /reports`
- `POST /comment-reports`
- `GET /admin/reported-posts`
- `DELETE /admin/reported-posts/:postId`
- `DELETE /admin/reported-posts/:postId/dismiss`
- `GET /admin/reported-comments`
- `DELETE /admin/reported-comments/:commentId`
- `DELETE /admin/reported-comments/:commentId/dismiss`
- `GET /admin/users`
- `GET /admin/users/:id`
- `PATCH /admin/users/:id`

## Socket.IO Events
### Client -> Server
- `feed:subscribe`
- `feed:unsubscribe`
- `post:join`
- `post:leave`

### Server -> Client
- `post:created`
- `post:updated`
- `post:deleted`
- `comment:created`
- `comment:updated`
- `comment:deleted`
- `vote:changed`
- `repost:created`
- `user:updated`

## Local Setup
### Prerequisites
- Node.js 18+ (Node 20 recommended)
- npm
- MongoDB Atlas cluster
- Firebase project + service account credentials
- Cloudinary account

### 1) Install dependencies
```bash
npm install
```

### 2) Configure environment
Create `.env` in the project root:

```env
PORT=5001

DB_USER=your_db_username
DB_PASS=your_db_password

FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 3) Run
```bash
# development (nodemon)
npm run dev

# production-like
npm start
```

Server default URL: `http://localhost:5001`

## Scripts
- `npm run dev` -> start with nodemon
- `npm start` -> start with Node.js

## Project Notes
- API routes are currently defined on `app` in `index.js`.
- CORS is restricted by `allowedOrigins`; update it for your frontend domains.
- This service is designed for persistent connections (Socket.IO), so deployment targets should support WebSockets.

## What This Demonstrates (Recruiter View)
- End-to-end backend design for a realtime social/community app
- Practical RBAC and moderation workflows
- Cloud media handling and secure token-based API access
- Production-oriented concerns: pagination, indexing, and event-driven updates

# LinkCamp - Server

🛡️ The backend power behind **LinkCamp**, providing secure authentication, admin moderation, cloud-based media management, and a fully role-based API system.

---

## 🚀 Features

- **User & Admin Authentication:**
  - Dual JWT verification for user and admin roles.
  - Firebase Authentication support.

- **Account Verification Workflow:**
  - New student/teacher signups are pending until approved by an Admin.

- **Profile Management:**
  - First-time login triggers a profile creation (image + display name).

- **Role-Based Content Control:**
  - Admins can approve users, delete or dismiss reported posts.

- **Post Management:**
  - Create, edit, delete, report, comment
  - Authority posts and teacher announcements have limited interaction to maintain content authenticity.

- **Secure Image Uploads:**
  - User-uploaded images are stored on Cloudinary via Multer middleware.

- **Error Handling:**
  - Robust error messages and status codes for every API.

- **Cross-Origin Support:**  
  CORS enabled to communicate securely with the frontend.

---

## ⚙️ Technologies Used

- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Cloud Atlas)
- **Authentication:** Firebase JWT, Cookie Parser
- **Image Upload:** Multer, Cloudinary, Multer-Storage-Cloudinary
- **Security:** Bcrypt, Environment Variables
- **Deployment:** Render / Railway / Your own server

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/your-username/linkcamp-server.git

# Navigate to project folder
cd linkcamp-server

# Install dependencies
npm install

# Create .env file and add:
# CLOUDINARY_CLOUD_NAME=
# CLOUDINARY_API_KEY=
# CLOUDINARY_API_SECRET=
# ACCESS_TOKEN_SECRET=
# MONGO_URI=

# Run server
npm start

---

## 🧠 Smart Practices Used

- **Separate Middlewares** for User and Admin JWT validation
- **Cookie-Based Authentication** with Secure Flag
- **Cloudinary Integration** via Multer
- **Modular Routing** for Clean Structure
- **Custom Error and Access Control Handling**

---

## 📄 API Endpoints Overview

| Method | Endpoint | Description |
|:------:|:--------:|:-----------:|
| POST | /signup | Student/Teacher account registration |
| POST | /login | User authentication |
| GET | /posts | Fetch all posts |
| POST | /posts | Create a new post |
| PATCH | /posts/:id | Report a post |
| DELETE | /posts/:id | Delete a post (admin/user) |
| POST | /profile | Complete profile info |
| GET | /reports | Admin fetch reported posts |
| PATCH | /reports/:id/dismiss | Admin dismiss report |
| DELETE | /reports/:id | Admin delete reported post |

> _(Full API documentation coming soon.)_

---

## ✨ Credits

Backend crafted with ❤️ by **SK Fariduzzaman Rafi**.

---

## 📄 License

This project is licensed under the **MIT License**.
```

---

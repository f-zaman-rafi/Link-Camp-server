```markdown
# LinkCamp - Server

🛡️ **LinkCamp Server** powers the backend of the LinkCamp platform, providing secure user authentication, role-based access control, cloud storage for images, and robust post management, all backed by modern backend practices.

🔗 **Live Site**: [LinkCamp Website](https://link-camp.netlify.app/)

---

## 🚀 Key Features

- **🔑 User & Admin Authentication**  
  - Dual JWT verification: Separate authentication for users and admins.
  - Firebase-powered authentication ensures a secure login process.

- **✅ Account Verification Workflow**  
  - Students and teachers sign up with verified university credentials and require admin approval to activate their accounts.

- **📸 Secure Image Uploads**  
  - Users can upload their profile photos, securely stored using Cloudinary and Multer middleware.

- **👥 Role-Based Content Control**  
  - Admins can approve or reject users, delete posts, or dismiss reports.
  - Teachers and students can interact with posts, but only admins manage critical operations.

- **📝 Post Management**  
  - Users can create, edit, delete, comment, and report posts.
  - Teacher announcements and authority notices are viewable but have limited interactivity.

- **🌐 CORS Support**  
  - CORS enabled for secure communication with the frontend.

- **🔒 Robust Error Handling**  
  - Comprehensive error messages and status codes for each API request.

---

## ⚙️ Tech Stack

- **Backend Framework**: Node.js, Express.js
- **Database**: MongoDB (MongoDB Atlas)
- **Authentication**: Firebase JWT, Cookie Parser
- **Image Upload**: Multer, Cloudinary
- **Security**: Environment Variables
- **Deployment**: Render, Railway, or custom server

---

## 📦 Installation Guide

```bash
# Clone the repository
git clone https://github.com/your-username/linkcamp-server.git

# Navigate to project folder
cd linkcamp-server

# Install dependencies
npm install

# Create a .env file and add the following variables:
# CLOUDINARY_CLOUD_NAME=your_cloud_name
# CLOUDINARY_API_KEY=your_api_key
# CLOUDINARY_API_SECRET=your_api_secret
# ACCESS_TOKEN_SECRET=your_access_token_secret
# MONGO_URI=your_mongo_db_uri

# Start the server
npm start
```

> ⚡ **Important**: Make sure the frontend client is running for full functionality.

---

## 🧠 Smart Practices Used

- **Modular Middleware**: Separates authentication middleware for user and admin roles.
- **Cookie-Based Authentication**: Secure and encrypted JWT stored in cookies.
- **Cloudinary Integration**: Handles image upload and storage through Multer and Cloudinary for efficient media management.
- **Modular Routing**: Clean, maintainable API structure with separation of concerns.
- **Error Handling**: Custom error messages for clarity and effective debugging.
- **Access Control**: Role-based API permissions for enhanced security and management.

---

## 📜 API Endpoints

| Method | Endpoint          | Description                               |
|--------|-------------------|-------------------------------------------|
| POST   | `/signup`          | Register a new user (student/teacher)     |
| POST   | `/login`           | User login authentication                 |
| GET    | `/posts`           | Fetch all posts                           |
| POST   | `/posts`           | Create a new post                         |
| PATCH  | `/posts/:id`       | Report a post                             |
| DELETE | `/posts/:id`       | Delete a post (admin/user)                |
| POST   | `/profile`         | Create/update user profile                |
| GET    | `/reports`         | Admin view of reported posts              |
| PATCH  | `/reports/:id/dismiss` | Admin dismiss a report                |
| DELETE | `/reports/:id`     | Admin delete a reported post              |

> 🔜 Full API documentation is coming soon!

---

## ✨ Credits

Backend crafted with care by **R A F I**, ensuring security best practices and modular architecture for long-term scalability.

---

## 📄 License

This project is licensed under the **MIT License**.

```

### Key Enhancements:
1. **Concise and Focused Descriptions**: The sections now emphasize the core functionalities more directly and succinctly.
2. **Clarified Key Features**: I’ve enhanced the explanations of features, particularly emphasizing security, role-based access control, and post management.
3. **Installation Section**: Simplified and clarified. Added a note for the frontend, making it clear that the backend cannot function without the client.
4. **API Endpoints**: The table for the API endpoints is now more readable, with more space between sections.
5. **Smart Practices**: These are now clearly articulated as specific technical choices that improve the codebase and security.


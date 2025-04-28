# LinkCamp - Client 🚀

🌟 **LinkCamp** is a cutting-edge campus community platform designed to foster seamless interaction between students, teachers, and university authorities. It provides a secure, intuitive, and engaging web experience to connect and engage the campus community.

🔗 **Explore the platform**: [LinkCamp Website](https://link-camp.netlify.app/)

---

## 🚀 Key Features

- **🔐 Secure Sign Up & Login:**
  Students and teachers can easily sign up with their verified university credentials. Access is granted only after admin approval, ensuring secure and trusted user registration.

- **📊 Role-Based Dashboards:**
  Each user role (Admin, Teacher, Student) has a personalized dashboard with tailored access and functionalities, ensuring the best user experience for everyone.

- **📰 Dynamic News Feeds:**
  - 📝 **Regular Posts**: Engage with posts—vote, comment, and report.
  - 📢 **Teacher Announcements**: Read-only announcements from teachers, with the option to comment.
  - 🏛️ **Authority Notices**: View important notices from university authorities.

- **💬 Community Interactions:**
  - 📣 Interact with posts through upvotes, downvotes, and comments.
  - 🚫 Report inappropriate content to maintain a positive environment.
  - 🗑️ Delete your own posts and comments for easy management.

- **👤 Welcome Profile Setup:**
  First-time users are prompted to upload a profile picture and set a display name, ensuring a personal touch before diving into the platform.

- **🔒 Protected Routing:**
  Implemented multi-layered route guards, ensuring that only authorized users can access specific pages (admin and user roles).

- **⚡ Real-Time Updates:**
  Thanks to TanStack React Query, post interactions update in real-time, ensuring a fast and responsive user experience.

- **🎨 User-Friendly Interface:**
  Designed with TailwindCSS and DaisyUI, the interface is sleek, intuitive, and mobile-responsive. SweetAlert2 and React Hot Toast enhance the user experience with smooth notifications and alerts.

---

## ⚙️ Technologies Behind the Scene

- **Frontend Framework:** React.js (Vite for faster builds)
- **Routing:** React Router for seamless navigation
- **State Management:** TanStack React Query for efficient data fetching and caching
- **Authentication:** Firebase (Secure login and JWT management)
- **Form Handling:** React Hook Form (Simplifies user input handling)
- **Image Uploads:** Cloudinary (via Backend API)
- **UI Frameworks:** Tailwind CSS & DaisyUI for a modern, responsive design
- **Notifications & Alerts:** React Hot Toast, SweetAlert2
- **Deployment Platform:** Netlify

---

## 📦 How to Get Started

1.  **Clone the repository**:

    ```bash
    git clone [https://github.com/f-zaman-rafi/linkcamp-client.git](https://github.com/f-zaman-rafi/linkcamp-client.git)
    ```

2.  **Install the dependencies**:

    ```bash
    cd linkcamp-client
    npm install
    ```

3.  **Run the development server**:

    ```bash
    npm run dev
    ```

> ⚡ **Note:** Make sure the backend server is running as well to enable full functionality. Without the backend, some features may not work as expected.

---

## 🧠 Smart Practices & Architecture

- **🔐 Route Guards:** Private routes and admin routes ensure secure access control across the app.
- **🔑 JWT Handling:** Secure and robust user authentication via Firebase and JWT for both users and admin roles.
- **⚡ Code Splitting & Lazy Loading:** Improve app performance with efficient code splitting and lazy loading of components.
- **🔄 Reusable Custom Hooks:** Clean and maintainable code with reusable hooks to handle common functionality like fetching data and handling form inputs.
- **🔒 Secure API Interactions:** Axios used for making secure and efficient API requests.
- **🎉 Optimized UX:** User-friendly and alert-driven UX with smooth notifications and toasts using SweetAlert2 and React Hot Toast.

---

## ✨ Credits

This project is built with ❤️ and passion by **R A F I**. Special thanks to the amazing open-source tools that made this project a reality!

---

## 📄 License

This project is licensed under the **MIT License**. See the LICENSE file for more information.

---

### 🚀 Get Involved

We welcome contributions from developers who want to improve LinkCamp and help build an even better community platform for students and teachers. Feel free to fork the repo and submit pull requests!

---
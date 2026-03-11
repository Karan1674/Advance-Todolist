# 🚀 Advanced Todo List

A feature-rich **Task Management Web Application** built using modern backend technologies such as **Node.js, Express.js, MongoDB, and EJS**.  

This project was developed primarily to **understand and experiment with different backend and full-stack development concepts**, including authentication systems, task workflows, media storage, payment gateway integrations, and report generation.

The goal of this project was not only to create a working task manager but also to explore how multiple real-world systems interact inside a large backend application.

For deeper understanding of the logic and architecture, **please review the source code.**

---

# 📌 Project Overview

The **Advanced Todo List** application allows users to organize their tasks, collaborate through assigned work, attach files, generate reports, and manage personal productivity in a structured way.

It supports both **individual task management and admin-controlled task assignments**, enabling a system where tasks can be distributed across users and tracked efficiently.

Along with task tracking, the application includes additional productivity tools such as:

• Task comments and file attachments  
• Personal media library for task assets  
• Automatic PDF task reports  
• Profile management and analytics  
• Subscription system with multiple payment gateways  
• Invoice generation and billing history  

The application demonstrates how a real-world SaaS-style productivity system might work internally.

---

# ⚙️ Technology Stack

The application is built using a modern full-stack JavaScript ecosystem.

### Backend Technologies

![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![ExpressJS](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4DB33D?style=for-the-badge&logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=for-the-badge)

### Frontend Technologies

![EJS](https://img.shields.io/badge/EJS-323330?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3)

### Authentication & Security

![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=jsonwebtokens)
![bcrypt](https://img.shields.io/badge/bcrypt-security-blue?style=for-the-badge)
![Google OAuth](https://img.shields.io/badge/Google%20OAuth-4285F4?style=for-the-badge&logo=google)

### File Handling & Storage

![Multer](https://img.shields.io/badge/Multer-File%20Upload-orange?style=for-the-badge)

### PDF & Automation

![Puppeteer](https://img.shields.io/badge/Puppeteer-40B5A4?style=for-the-badge&logo=puppeteer)
![PDFKit](https://img.shields.io/badge/PDFKit-PDF%20Generation-red?style=for-the-badge)

---

# 💳 Payment Gateways

The system integrates multiple payment providers to simulate a SaaS subscription environment.

![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white)
![PayPal](https://img.shields.io/badge/PayPal-003087?style=for-the-badge&logo=paypal)
![Razorpay](https://img.shields.io/badge/Razorpay-0C2451?style=for-the-badge)
![PhonePe](https://img.shields.io/badge/PhonePe-5F259F?style=for-the-badge)

These gateways allow users to upgrade their account to higher subscription plans.

---

# 🔐 Authentication System

The project includes a complete authentication system designed to simulate real-world user security practices.

Users can:

• Register using email and password  
• Log in securely with encrypted passwords  
• Sign in using Google OAuth authentication  
• Reset forgotten passwords using OTP verification  
• Maintain login sessions using JWT-based cookies  

Passwords are securely stored using **bcrypt hashing**, ensuring sensitive information remains protected.

---

# 📝 Task Management System

At the core of the application is a **powerful task management system** designed to help users stay organized and track work efficiently.

Users can:

• Create new tasks with deadlines  
• Assign priority levels (Critical, High, Medium, Low)  
• Track progress using task status updates  
• Add follow-up reminders  
• Attach images or documents to tasks  
• Break tasks into smaller **sub-target checklists**

This structure allows tasks to be managed with more clarity and control.

---

# 👨‍💼 Admin Task Assignment

The system includes an **admin role** that can manage tasks across multiple users.

Admin capabilities include:

• Assigning tasks to other users  
• Editing assigned tasks  
• Monitoring task progress  
• Viewing tasks across the platform  

This feature simulates how tasks might be distributed in a **team environment or workplace system**.

---

# 💬 Task Comments & Collaboration

Each task supports a comment system that allows users to communicate directly within the task workflow.

Users can:

• Add text comments  
• Attach files to comments  
• View discussion history  
• Review updates made by collaborators  

This helps maintain context and improves collaboration when multiple people work on the same task.

---

# 📂 Media Library

The application includes a personal **media library system** where users can store files and URLs that can later be reused in tasks.

Features include:

• Upload images  
• Save external URLs  
• Tag media for easier organization  
• Track storage usage limits  

The media library acts as a **central resource center for task-related assets.**

---

# 📄 Task Report Generation

Users can generate **automatically formatted PDF reports** of their tasks.

The system:

• Collects tasks and comments  
• Converts them into a formatted layout  
• Generates a downloadable PDF report  

This is implemented using **Puppeteer and PDF generation tools**, demonstrating server-side document creation.

---

# 📊 User Profiles & Analytics

Each user has a dedicated profile page where they can view their personal activity and statistics.

The profile system includes:

• Task counts  
• Assigned tasks  
• Completed tasks  
• Profile image management  

This helps users understand their productivity over time.

---

# 💰 Subscription System

The platform includes a simulated SaaS subscription system.

Available plans include:

Starter Plan  
Pro Plan  
Premium Plan  

Upgrading a plan unlocks additional capabilities and stores payment history for the user.

---

# 🧾 Invoice Management

Every successful payment generates a stored invoice.

Users can:

• View previous invoices  
• Open detailed billing information  
• Download invoices as professionally formatted PDFs  

This feature demonstrates how billing systems operate in subscription-based applications.

---

# 🔑 Admin Account

To explore admin features you can use the following credentials:

Email: admin@example.com  
Password: 123  

You may also create your own account and test the system as a regular user.

---

# 📚 Learning Purpose

This project was created mainly for **learning and experimentation** with real-world backend systems.

While building it, various concepts were explored including:

• Authentication systems  
• Middleware architecture  
• File upload systems  
• SaaS subscription flows  
• Payment gateway integrations  
• Media storage systems  
• Server-side PDF generation  
• Role-based access control  

The codebase intentionally contains many different concepts to demonstrate how these systems interact together in a large application.

For a deeper understanding of implementation details, **review the source code directly.**

---

# 👨‍💻 Author

Karanjit Singh  
Aspiring Full Stack Developer passionate about building scalable applications and learning advanced backend architectures.
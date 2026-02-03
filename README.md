# E-Commerce Backend API 🛍️

A robust and secure E-Commerce Backend built with Node.js, Express, PostgreSQL, Socket.io, and Stripe Integration.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Running the Server](#-running-the-server)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Testing](#-testing)

---

## ✨ Features

### ✅ Authentication & Authorization
- **Google OAuth 2.0**: Secure login with Google.
- **JWT Authentication**: Token-based protection for routes.
- **Role-Based Access Control**: Admin and Customer distinctions.
- **Security**: Bcrypt password hashing and rate limiting on auth endpoints.

### 🛒 E-Commerce
- **Product Management**: Create, read, update, and delete products (Admin only).
- **Shopping Cart**: Manage cart items securely.
- **Order Processing**: Integrated with **Stripe** for payment intents.
- **Order Tracking**: Order status updates and history.
- **Inventory Management**: Track stock levels.

### 💬 Real-time Chat
- **Socket.io Integration**: Real-time communication between users and admins.
- **Message History**: Persistent chat logs stored in the database.
- **Live Status**: Typing indicators and online status.

### 🔒 Security & Performance
- **Helmet**: Sets various HTTP headers for security.
- **Rate Limiting**: Protects against brute-force and DDoS attacks.
- **Sanitization**: Input validation to prevent injection attacks.
- **CORS**: Configured for secure cross-origin requests.

### 📊 Monitoring
- **Audit Logs**: Tracks critical actions (login, updates) in the database.
- **Swagger UI**: Interactive API documentation.

---

## 🛠 Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js (v5.x)
- **Database**: PostgreSQL (v14+)
- **ORM/Driver**: `pg` (node-postgres)
- **Real-time**: Socket.io
- **Payment**: Stripe API
- **Documentation**: Swagger UI
- **Testing**: Jest & Supertest

---

## 📋 Prerequisites

Before you begin, ensure you have met the following requirements:

- **Node.js**: v18 or higher
- **PostgreSQL**: v14 or higher installed and running
- **npm**: (comes with Node.js)

---

## 🚀 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone <repository_url>
    cd E-Com-Backend/server
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the `server` root directory (see [Environment Variables](#-environment-variables)).

---

## 🔐 Environment Variables

Create a file named `.env` in the `server` directory and add the following configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (Method 1: Connection String - Recommended)
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce_db

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id

# Security
JWT_SECRET=your_super_secret_key

# Payment Gateway (Stripe)
STRIPE_SECRET_KEY=sk_test_...

# Optional: Render / Production SSL
# RENDER=true (if deploying on Render.com)
```

> **Note**: For Database Configuration, if you prefer individual variables, the application also supports `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, and `DB_NAME`.

---

## 🗄 Database Setup

1.  **Create the Database**
    Ensure your PostgreSQL server is running and create the database name specified in your `.env` (e.g., `ecommerce_db`).

2.  **Run Migrations**
    Initialize the database schema using the migration script.
    ```bash
    npm run migrate
    ```

3.  **Seed Data (Optional)**
    Populate the database with initial admin data.
    ```bash
    npm run seed
    ```

---

## ⚡ Running the Server

### Development Mode
Runs the server with `nodemon` for hot-reloading.
```bash
npm run dev
```

### Production Mode
Runs the server using standard Node.js.
```bash
npm start
```

The server will start at `http://localhost:3000` (or the `PORT` defined in `.env`).

---

## 📖 API Documentation

The API is fully documented using **Swagger**. Once the server is running, you can access the interactive documentation at:

👉 **http://localhost:3000/api-docs**

This includes details on:
- Auth endpoints (Google login)
- Product management
- Order processing
- Chat functionality

---

## 🏗 Project Structure

```
server/
├── config/             # Database & libraries config (db.js, swagger.js)
├── middleware/         # Express middleware (auth.js)
├── migrations/         # SQL scripts for DB schema updates
├── routes/             # API route definitions (auth, products, orders, etc.)
├── scripts/            # Utility scripts (migrate.js, seed-admin.js)
├── services/           # Business logic (chat, logger, product)
├── tests/              # Jest test files
├── server.js           # App entry point
└── package.json        # Dependencies & scripts
```

---

## 🧪 Testing

This project uses **Jest** for unit and integration testing.

- **Run all tests:**
  ```bash
  npm test
  ```

- **Run tests with coverage:**
  ```bash
  npm run test:coverage
  ```

- **Watch mode:**
  ```bash
  npm run test:watch
  ```

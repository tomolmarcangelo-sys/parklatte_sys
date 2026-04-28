# Migration Guide: Local Deployment with MySQL

This guide explains how to deploy the Coffee Shop Management System on your local machine using **VS Code**, **Node.js**, and **MySQL**.

## Prerequisites

1.  **Node.js**: Install the latest LTS version from [nodejs.org](https://nodejs.org/).
2.  **MySQL Server**: Install MySQL Community Server or use XAMPP/WAMP.
3.  **VS Code**: Recommended editor.

## Step 1: Database Setup

1.  Open your MySQL terminal or a tool like MySQL Workbench.
2.  Execute the contents of the `db.sql` file provided in the repository to create the database schema and initial tables.
    ```sql
    -- Run this in your MySQL client
    SOURCE db.sql;
    ```
3.  Take note of your database credentials (host, user, password).

## Step 2: Environment Configuration

1.  Create a `.env` file in the root directory (you can copy `.env.example`).
2.  Fill in the following details:
    ```env
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=your_mysql_password
    DB_NAME=coffee_shop
    JWT_SECRET=a_random_long_secure_string
    ```

## Step 3: Local Installation

1.  Open the project folder in VS Code.
2.  Open the terminal and install the dependencies:
    ```bash
    npm install
    ```
3.  Add the MySQL and and Auth types if they aren't already included:
    ```bash
    npm install mysql2 jsonwebtoken bcryptjs
    npm install -D @types/jsonwebtoken @types/bcryptjs
    ```

## Step 4: Seed Data (Optional)

If you didn't seed via `db.sql`, you can run the seed script:
```bash
npx tsx seed.ts
```

## Step 5: Running the Application

1.  Start the development server:
    ```bash
    npm run dev
    ```
2.  The application will start the Express backend on `http://localhost:3000`.
3.  Vite will handle the frontend and proxy requests to the API.

## Key Changes in this Local Version

-   **Authentication**: Switched from Firebase Auth to JWT-based authentication. Users are stored in the local MySQL `users` table.
-   **Database**: All data (menu, orders, users) is now persisted in MySQL instead of Firestore.
-   **Real-time**: Real-time order updates are handled via **Socket.io** instead of Firestore's `onSnapshot`.
-   **Storage**: Product images currently use external URLs. For local file uploads, further configuration of `express.static` would be needed.

## Default Admin Credentials
You can register a new account through the UI. To make it an admin, manually update the `role` in the `users` table:
```sql
UPDATE users SET role = 'Admin' WHERE email = 'your-email@example.com';
```
*(Or use the default admin if seeded in db.sql)*

---
**Note**: Google Login is disabled in the local version as it requires complex OAuth configuration which is handled automatically in the AI Studio environment but needs manual setup for localhost. Use Email/Password login.

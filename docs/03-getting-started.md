# 3. Getting Started

This guide will walk you through the process of setting up the BB Manager project on your local machine for development using Supabase.

### Prerequisites

-   **Node.js and npm**: You will need Node.js and npm (Node Package Manager) installed.
-   A modern web browser (e.g., Chrome, Firefox, Edge).
-   A Supabase account to create and manage the backend project.

---

### Step 1: Get the Code

First, obtain the project files.

---

### Step 2: Supabase Project Setup

The application requires a Supabase project to handle its backend, database, and authentication.

1.  **Create a Supabase Project**
    -   Go to the [Supabase Dashboard](https://app.supabase.com/).
    -   Click "New project" and follow the on-screen instructions. Choose a strong password for your database.

2.  **Get Configuration Keys**
    -   Navigate to **Project Settings** -> **API**.
    -   Copy the following values:
        -   `URL` (e.g., `https://your-project-ref.supabase.co`)
        -   `Project API Key (anon public)`

3.  **Create `.env` file**
    -   In the root directory of your project, create a new file named `.env`.
    -   Paste the following content into the `.env` file, replacing the placeholder values with your actual Supabase configuration keys:
        ```
        VITE_SUPABASE_URL="[Your Supabase Project URL]"
        VITE_SUPABASE_ANON_KEY="[Your Anon Public Key]"
        ```

4.  **Set up Database Schema (PostgreSQL)**
    -   Navigate to **SQL Editor** in the Supabase Dashboard.
    -   The application requires specific tables (`company_boys`, `junior_boys`, `user_roles`, etc.) and Row Level Security (RLS) policies. These are typically set up during the migration phase, but for a fresh start, you must ensure the following tables and functions exist:
        -   `user_roles` table (with columns: `id` (references `auth.users`), `email`, `role`, `sections`).
        -   `handle_new_user` function and trigger (to set new users to 'pending' role).
        -   RLS enabled on all tables, with policies restricting access based on the user's role and assigned sections.

5.  **Enable Authentication**
    -   In the Supabase Dashboard, go to **Authentication** -> **Settings**.
    -   Ensure **Email Signups** is enabled.

---

### Step 3: Run the Application Locally

The application uses **Vite** for its development server and build process.

1.  **Install Dependencies**:
    -   Open your terminal or command prompt.
    -   Navigate to the root directory of the project.
    -   Run `npm install` to install all necessary project dependencies.

2.  **Start the Development Server**:
    -   In the same terminal, run `npm run dev`.
    -   This will start the Vite development server, typically on `http://localhost:3000`.

**Accessing the App**

Once your server is running, open your web browser and navigate to the URL provided by Vite.

You should see the login page. Since new users are set to 'pending', you must first sign up and then manually update your role in the Supabase `user_roles` table (or use the Global Settings page if another Admin has approved you) to gain full access.
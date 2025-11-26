# Firebase to Supabase Migration Guide

This guide explains how to run the `scripts/migrate.js` script to transfer your data.

## Prerequisites

1.  **Node.js**: Ensure you have Node.js installed on your computer.
2.  **Dependencies**: Run `npm install` to install `firebase-admin`, `dotenv`, and `@supabase/supabase-js`.

## Step 1: Get Firebase Service Account Key

To read from your Firestore database, the script needs admin permissions.

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Click the **Gear icon** (Settings) -> **Project settings**.
3.  Go to the **Service accounts** tab.
4.  Click **Generate new private key**.
5.  Save the file as `serviceAccountKey.json` in the root folder of this project (next to `package.json`).

## Step 2: Get Supabase Service Role Key

To write to Supabase (bypassing RLS policies during migration), you need the Service Role Key.

1.  Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2.  Click **Settings** (Cog icon) -> **API**.
3.  Find the `service_role` key (secret). **Do not share this key.**
4.  Add it to your `.env` file:
    ```
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
    ```

## Step 3: Run the Migration

Open your terminal in the project folder and run:

```bash
node scripts/migrate.js
```

The script will print its progress as it copies `user_roles`, `boys`, `audit_logs`, and `invite_codes` to your new database.

## Step 4: Verify

Go to the Supabase Dashboard -> Table Editor and check that your data has appeared.
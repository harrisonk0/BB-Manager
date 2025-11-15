# 3. Getting Started

This guide will walk you through the process of setting up the BB Manager project on your local machine for development. Thanks to its buildless architecture, the setup process is straightforward and does not require Node.js or npm.

### Prerequisites

-   A modern web browser that supports import maps and service workers (e.g., Chrome, Firefox, Edge).
-   A simple local web server to serve the project files.
-   A Google account to create and manage the Firebase project.

---

### Step 1: Get the Code

First, obtain the project files. You can do this by cloning the repository if you're using Git, or by simply downloading the source code as a ZIP file.

---

### Step 2: Firebase Project Setup

The application requires a Firebase project to handle its backend, database, and authentication.

1.  **Create a Firebase Project**
    -   Go to the [Firebase Console](https://console.firebase.google.com/).
    -   Click on "Add project" and follow the on-screen instructions to create a new project. Give it a descriptive name like "BB Manager Dev".

2.  **Create a Web App**
    -   Once your project is created, you'll be taken to the project dashboard.
    -   Click on the Web icon (`</>`) to add a new Web App to your project.
    -   Give the app a nickname (e.g., "BB Manager Web") and click "Register app".

3.  **Get Configuration Keys**
    -   After registering, Firebase will display your app's configuration keys. It will look something like this:
        ```javascript
        const firebaseConfig = {
          apiKey: "AIza...",
          authDomain: "your-project-id.firebaseapp.com",
          projectId: "your-project-id",
          storageBucket: "your-project-id.appspot.com",
          messagingSenderId: "1234567890",
          appId: "1:1234567890:web:abcdef123456"
        };
        ```
    -   Copy these values.

4.  **Create `.env` file**
    -   In the root directory of your project, create a new file named `.env`.
    -   Paste the following content into the `.env` file, replacing the placeholder values with your actual Firebase configuration keys:
        ```
        VITE_FIREBASE_API_KEY="AIza..."
        VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
        VITE_FIREBASE_PROJECT_ID="your-project-id"
        VITE_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
        VITE_FIREBASE_MESSAGING_SENDER_ID="1234567890"
        VITE_FIREBASE_APP_ID="1:1234567890:web:abcdef123456"
        ```
    -   **Important**: Ensure there are no quotes around the values if they are numbers, but for strings like API keys, they should be quoted. Vite handles this, but it's good practice. For Firebase config, all values are strings.

5.  **Enable Firestore**
    -   In the Firebase Console, navigate to the "Build" section in the left-hand menu and click on **Firestore Database**.
    -   Click "Create database".
    -   Choose to start in **Production mode**.
    -   Select a Cloud Firestore location (choose the one closest to your users).
    -   Click "Enable".

6.  **Enable Authentication**
    -   In the Firebase Console, go to the "Build" -> **Authentication** section.
    -   Click "Get started".
    -   Under the "Sign-in method" tab, select **Email/Password** from the list of providers.
    -   Enable the provider and click "Save".

7.  **Create a User**
    -   While still in the Authentication section, go to the "Users" tab.
    -   Click "Add user".
    -   Enter an email and a password for your first test user. This is what you will use to log into the application.

8.  **Set Security Rules (CRITICAL STEP)**
    -   Navigate to the **Firestore Database** -> **Rules** tab.
    -   By default, the rules disallow all access. You must replace the contents with rules that allow authenticated users to read and write data.
    -   Paste the following rules and click **Publish**:
    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        // Allow read/write access to any document only if the user is signed in.
        match /{document=**} {
          allow read, write: if request.auth != null;
        }
      }
    }
    ```
    > **Security Note**: These rules are basic and provide blanket access for any signed-in user. For a production application with multiple roles, you would implement more granular rules.

---

### Step 3: Run the Application Locally

Since this is a static web application with no build step, you just need a simple local server to serve the files.

**Option A: Using Python (If installed)**

1.  Open your terminal or command prompt.
2.  Navigate to the root directory of the project.
3.  Run one of the following commands:
    -   If you have Python 3: `python -m http.server 8000`
    -   If you have Python 2: `python -m SimpleHTTPServer 8000`

**Option B: Using VS Code Live Server**

1.  Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension in Visual Studio Code.
2.  Open the project folder in VS Code.
3.  Right-click on the `index.html` file and select "Open with Live Server".

**Accessing the App**

Once your server is running, open your web browser and navigate to `http://localhost:8000` (or the URL provided by Live Server).

You should see the login page. Use the email and password you created in the Firebase Authentication console to sign in and start using the app.
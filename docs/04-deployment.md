# 4. Deployment

This application is a fully static Progressive Web App (PWA). This means it consists only of HTML, CSS (via CDN), and JavaScript files, with no server-side rendering or backend logic hosted with the app itself. This makes deployment incredibly simple.

You can deploy this project to any static hosting provider. Some popular choices include:

-   Vercel
-   Netlify
-   GitHub Pages
-   Supabase Hosting (via Storage)

This guide will focus on deploying with a generic static hosting provider.

#### Prerequisites

1.  **Node.js and npm**: You will need Node.js and npm installed to run the build process.
2.  **Supabase Project**: Your Supabase project must be set up and configured with the correct database schema and RLS policies.

#### Step 1: Build the Application

In your terminal, run the build command:

```bash
npm run build
```

This command compiles the TypeScript, bundles the JavaScript, and places all static assets (HTML, JS, manifest, etc.) into the `dist` directory.

#### Step 2: Deploy the `dist` Folder

Upload the entire contents of the newly created `dist` folder to your chosen static hosting provider.

**Note on Supabase:** If you are using Supabase for hosting, you would typically upload the contents of the `dist` folder to a Storage Bucket and configure it for static web hosting.

#### Step 3: Configure Routing

Since this is a Single Page Application (SPA), you must configure your hosting provider to redirect all unknown paths (e.g., `/dashboard`, `/weeklyMarks`) back to `/index.html`. This allows the client-side routing logic in `App.tsx` to take over.

---

### Subsequent Deployments

Any time you make changes to the code and want to update the live application, simply run `npm run build` followed by uploading the new contents of the `dist` folder.
<div align="center">
  <img src="https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png" alt="Boys' Brigade Logo" width="150"/>
  <h1>BB Manager</h1>
  <p>A web app to manage Boys' Brigade members, squads, and weekly marks.</p>
</div>

---

## Overview

Welcome to the BB Manager documentation. This project is a modern, responsive web application designed to streamline the administration of a Boys' Brigade section. It provides officers with the tools to manage member rosters, organize squads, and record weekly marks efficiently.

This documentation provides a complete guide to the application's architecture, components, and data management systems.

## Key Features

-   **Member Management**: Full CRUD (Create, Read, Update, Delete) functionality for member records.
-   **Multi-Section Support**: Manage **Company Section** and **Junior Section** data completely separately.
-   **Weekly Mark Recording**: A dedicated interface for quickly entering attendance and scores, with real-time feedback. Includes a read-only mode for past dates.
-   **Visual Dashboard & Reporting**: At-a-glance dashboard with leaderboards, squad performance charts, attendance heatmaps, and monthly marks breakdown.
-   **Advanced Roster Filtering**: Instantly search, sort, and filter members by squad, year, and performance metrics.
-   **Audit Logging & Reversion**: Every significant action is logged and can be easily reverted. Old audit logs and invite codes are automatically cleaned up after 14 days.
-   **Secure Authentication**: User access is managed through Supabase Auth.
-   **User Role Management**: Assign and manage roles (Admin, Captain, Officer) for users, controlling access to sensitive features. Users cannot change their own role.
-   **Invite Code System**: Administrators and Captains can generate one-time-use codes for new user sign-ups. Each code specifies a default user role and has an expiration time.
-   **Account Settings**: Users can change their password.
-   **Development Controls**: Admin-only tools for clearing audit logs, invite codes, and local data for testing and development.

## Tech Stack

-   **UI Framework**: [React](https://reactjs.org/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) (via CDN)
-   **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL tables, Auth, and Storage)
-   **Module Loading**: [Import Maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) (for a buildless development environment)

---

## Documentation

This project is documented across several files to provide a comprehensive understanding of its design and implementation.

| Document                                      | Description                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **[1. Project Structure](./docs/01-project-structure.md)** | A detailed breakdown of every file and folder in the project.                                           |
| **[2. Architecture](./docs/02-architecture.md)**           | An in-depth guide to the core architectural principles and Supabase integration.      |
| **[3. Getting Started](./docs/03-getting-started.md)**     | A step-by-step guide for new developers to set up and run the project locally.                      |
| **[4. Deployment](./docs/04-deployment.md)**               | Instructions for deploying the application to a static hosting provider.                                |
| **[5. Component Library](./docs/05-component-library.md)** | A complete reference for all React components, their props, and their responsibilities.               |
| **[6. Data & Services](./docs/06-data-and-services.md)**   | An explanation of the business logic and data layer, focused on Supabase. |
| **[8. Data Types](./docs/08-types.md)**                    | A dictionary of all core TypeScript types, defining the application's data model.                   |
| **[AI Rules](./AI_RULES.md)**                              | Guidelines for AI development within the project.                                                       |
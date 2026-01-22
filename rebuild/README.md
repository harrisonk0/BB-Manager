# BB-Manager Rebuild Documentation

This directory contains comprehensive documentation for rebuilding the BB-Manager application from scratch. These documents describe WHAT was built and WHY, enabling an independent rebuild of the application.

## Documents

| Document | Description |
|----------|-------------|
| **[PRD.md](./PRD.md)** | Product Requirements Document - user needs, features, and compliance requirements |
| **[technical-spec.md](./technical-spec.md)** | Technical Specification - architecture, tech stack, and key decisions |
| **[database-schema.md](./database-schema.md)** | Database Schema - tables, RLS policies, and relationships |
| **[setup-guide.md](./setup-guide.md)** | Setup Guide - step-by-step rebuild instructions |

## Purpose

The BB-Manager application is a Boys' Brigade member management system for tracking member attendance, marks, and information. This rebuild documentation ensures the application could be independently recreated by capturing:

- The product vision and user requirements
- The technical architecture and implementation choices
- The complete database structure and security model
- The steps required to build and deploy from scratch

## Key Context

- **Organization**: Boys' Brigade (UK youth organization)
- **Users**: Officers, Captains, and Admins managing member data
- **Data Sensitivity**: Stores personal information about minors (UK GDPR compliance required)
- **Architecture**: Backend-light React SPA with direct Supabase access
- **Security**: Row-Level Security (RLS) policies enforce role-based access

For canonical architecture documentation, see [ARCHITECTURE.md](../ARCHITECTURE.md) in the project root.

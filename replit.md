# QLD Safety Monitor

## Overview
QLD Safety Monitor is a real-time safety and incident monitoring application for Queensland. It provides live updates on traffic events, emergency incidents, crime reports, suspicious behavior alerts, and traffic camera feeds. The application integrates with official QLD Traffic and Emergency Services data feeds and supports community-driven incident reporting. It features a full-stack web application with an interactive map interface and advanced filtering capabilities to view and analyze safety conditions in real-time across Queensland.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React and TypeScript, following a component-based architecture. It uses Wouter for routing, TanStack Query for server state management, Shadcn/ui (built on Radix UI) for UI components, and Tailwind CSS for styling. Leaflet is integrated for interactive map functionality, and Vite is used for fast development and optimized builds. The structure is modular, separating UI components, business logic, and API interactions.

### Backend Architecture
The backend is a Node.js Express server written in TypeScript. It provides RESTful endpoints and acts as a proxy and caching layer for external APIs. It utilizes a dual storage approach with PostgreSQL and an in-memory fallback.

### Data Storage Solutions
The application employs a flexible storage architecture:
- **Primary Database**: PostgreSQL via Drizzle ORM, with schema definitions for users, incidents, traffic events, and traffic cameras.
- **Fallback Storage**: In-memory storage for development and testing.
- An abstract storage interface allows for switching between implementations. Drizzle Kit handles database schema migrations.

### Authentication and Authorization
The system includes a full user authentication and authorization system:
- **Replit Auth Integration**: Secure OpenID Connect authentication using Replit's identity provider.
- **Session Management**: PostgreSQL-based session storage with automatic token refresh.
- **Community Reporting**: Authenticated users can report safety incidents.
- **User Profile System**: Manages user data and incident history.
- **Agency Accounts**: System automatically initializes official agency accounts (e.g., TMR, QFES) on startup to ensure proper incident attribution.

### Map and Visualization
An interactive mapping solution is provided:
- **Map Library**: Leaflet for rendering and interaction.
- **Markers**: Custom color-coded markers for various event types (traffic, emergency, crime, suspicious activity).
- **Filtering**: Real-time filtering by category, incident type, impact level, and time range.
- **Data Sources**: Displays both official emergency data and community-reported incidents with source attribution.
- **Responsiveness**: Mobile-optimized interface with a collapsible sidebar and improved modal UX for mobile (compact header, larger touch targets, bottom-sheet comments).
- **Scalability**: Implements viewport-based fetching, database-level spatial filtering, HTTP caching with ETags, and change detection in the ingestion pipeline to optimize performance and reduce load.

## External Dependencies

### Third-Party APIs
- **QLD Traffic API**: Data source for traffic events and camera feeds (`https://api.qldtraffic.qld.gov.au`).
- **QLD Emergency Services API**: Real-time emergency incident data via an ArcGIS Feature Server.

### Database Services
- **PostgreSQL**: Primary database.
- **Neon Database**: Cloud PostgreSQL provider (via connection string).

### UI and Mapping Libraries
- **Leaflet**: Open-source mapping library.
- **Radix UI**: Headless UI component primitives.
- **Shadcn/ui**: Component library based on Radix UI.
- **Tailwind CSS**: Utility-first CSS framework.

### Development and Build Tools
- **Vite**: Frontend build tool and development server.
- **TanStack Query**: Data fetching and caching library.
- **Drizzle ORM**: TypeScript ORM.
- **TypeScript**: For type safety.

### External Services Integration
- **OpenStreetMap**: Tile provider for map base layers.
- **Google Fonts**: Web font delivery (Inter).
- **Replit Integration**: Development environment integration.
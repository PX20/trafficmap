# QLD Safety Monitor

## Overview

QLD Safety Monitor is a comprehensive real-time safety and incident monitoring application for Queensland. The application provides live traffic events, emergency incidents, crime reports, suspicious behavior alerts, and traffic camera feeds across Queensland. It integrates with the official QLD Traffic API and QLD Emergency Services data feeds, while also supporting community-driven incident reporting through user authentication. Built as a full-stack web application, it features an interactive map interface with advanced filtering capabilities, allowing users to view and analyze safety conditions in real-time.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### September 18, 2025 - User Attribution System Fixed
- **RESOLVED**: Fixed persistent "Anonymous" display issue for community reports
- **Root Cause**: Database JSONB `properties` field contained correct `reporterId` values, but `convertIncidentsToGeoJSON` method wasn't extracting them for API responses
- **Solution**: Added extraction of `reporterId` from database properties in storage layer: `reporterId: (incident.properties as any)?.reporterId || incident.userId || undefined`
- **Impact**: Community reports now properly display actual user names instead of "Anonymous"
- **Technical Details**: Issue was in storage.ts line 707 where properties transformation didn't include reporterId field extraction

## System Architecture

### Frontend Architecture
The frontend is built using React with TypeScript and follows a modern component-based architecture:
- **React Router**: Uses Wouter for lightweight client-side routing
- **State Management**: Leverages TanStack Query for server state management and caching
- **UI Framework**: Implements Shadcn/ui components built on Radix UI primitives
- **Styling**: Uses Tailwind CSS with CSS custom properties for theming
- **Map Integration**: Integrates Leaflet for interactive map functionality
- **Build Tool**: Vite for fast development and optimized production builds

The frontend follows a modular structure with separate concerns for UI components, business logic, and API interactions. Components are organized by feature (map-related components) and shared UI components.

### Backend Architecture
The backend is implemented as a Node.js Express server with TypeScript:
- **API Framework**: Express.js with RESTful endpoints
- **Data Storage**: Dual storage approach using both in-memory storage and PostgreSQL with Drizzle ORM
- **External API Integration**: Integrates with the QLD Traffic API for real-time traffic data and QLD Emergency Services for incident data
- **Development Integration**: Custom Vite integration for seamless development experience

The server acts as a proxy and caching layer between the frontend and the QLD Traffic API, providing data transformation and local storage capabilities.

### Data Storage Solutions
The application uses a flexible storage architecture:
- **Primary Database**: PostgreSQL configured via Drizzle ORM with schema definitions for users, incidents, traffic events, and traffic cameras
- **Fallback Storage**: In-memory storage implementation for development and testing
- **Storage Interface**: Abstract storage interface allows switching between storage implementations
- **Migration Support**: Drizzle Kit for database schema migrations

### Authentication and Authorization
Full user authentication and authorization system implemented with:
- **Replit Auth Integration**: Secure OpenID Connect authentication using Replit's identity provider
- **Session Management**: PostgreSQL-based session storage with automatic token refresh
- **Community Reporting**: Authenticated users can report safety incidents and crimes
- **User Profile System**: Complete user management with profile data and incident history

### Map and Visualization
Interactive mapping solution using:
- **Map Library**: Leaflet for map rendering and interaction
- **Marker System**: Custom color-coded markers for traffic events, emergency incidents, crime reports, and suspicious activity alerts
- **Advanced Filtering**: Real-time filtering by event category (traffic, crime, emergency), incident type, impact level, and time range
- **Dual Data Sources**: Displays both official emergency data and community-reported incidents with source attribution
- **Responsive Design**: Mobile-optimized interface with collapsible sidebar

## External Dependencies

### Third-Party APIs
- **QLD Traffic API**: Primary data source for traffic events and camera feeds
  - Endpoint: `https://api.qldtraffic.qld.gov.au`
  - Provides GeoJSON formatted traffic data
  - Supports both public and authenticated API access
- **QLD Emergency Services API**: Real-time emergency incident data
  - ArcGIS Feature Server providing current emergency incidents
  - Includes incident details, emergency vehicle deployments, and response status
  - Covers police, fire, and ambulance service incidents across Queensland

### Database Services
- **PostgreSQL**: Primary database (configured via Drizzle)
- **Neon Database**: Cloud PostgreSQL provider (based on connection string pattern)

### UI and Mapping Libraries
- **Leaflet**: Open-source mapping library for interactive maps
- **Radix UI**: Headless UI component primitives
- **Shadcn/ui**: Pre-built component library based on Radix UI
- **Tailwind CSS**: Utility-first CSS framework

### Development and Build Tools
- **Vite**: Frontend build tool and development server
- **TanStack Query**: Data fetching and caching library
- **Drizzle ORM**: TypeScript ORM for database operations
- **TypeScript**: Type safety across the entire application

### External Services Integration
- **OpenStreetMap**: Tile provider for map base layers
- **Google Fonts**: Web font delivery (Inter font family)
- **Replit Integration**: Development environment integration with runtime error handling and cartographer plugin
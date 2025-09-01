# QLD Traffic Monitor

## Overview

QLD Traffic Monitor is a real-time traffic monitoring application for Queensland roads. The application provides live traffic events, road closures, hazards, and traffic camera feeds across Queensland by integrating with the official QLD Traffic API. Built as a full-stack web application, it features an interactive map interface with filtering capabilities, allowing users to view and analyze traffic conditions in real-time.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **External API Integration**: Integrates with the QLD Traffic API for real-time traffic data
- **Development Integration**: Custom Vite integration for seamless development experience

The server acts as a proxy and caching layer between the frontend and the QLD Traffic API, providing data transformation and local storage capabilities.

### Data Storage Solutions
The application uses a flexible storage architecture:
- **Primary Database**: PostgreSQL configured via Drizzle ORM with schema definitions for users, traffic events, and traffic cameras
- **Fallback Storage**: In-memory storage implementation for development and testing
- **Storage Interface**: Abstract storage interface allows switching between storage implementations
- **Migration Support**: Drizzle Kit for database schema migrations

### Authentication and Authorization
Basic user management system is implemented with:
- **User Schema**: Simple username/password authentication model
- **Storage Interface**: User management through the storage abstraction layer
- Currently implements foundation for authentication without active session management

### Map and Visualization
Interactive mapping solution using:
- **Map Library**: Leaflet for map rendering and interaction
- **Marker System**: Custom markers for different event types (crashes, hazards, restrictions, cameras)
- **Filtering**: Real-time filtering by event type, impact level, and time range
- **Responsive Design**: Mobile-optimized interface with collapsible sidebar

## External Dependencies

### Third-Party APIs
- **QLD Traffic API**: Primary data source for traffic events and camera feeds
  - Endpoint: `https://api.qldtraffic.qld.gov.au`
  - Provides GeoJSON formatted traffic data
  - Supports both public and authenticated API access

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
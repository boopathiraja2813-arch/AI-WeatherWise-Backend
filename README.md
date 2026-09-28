# AI WeatherWise Backend API

> **Naan Muthalvan Project Submission**  
> **Domain**: Full Stack Web Development (Backend / RESTful Services & AI Integration)

AI WeatherWise is a production-ready, secure RESTful API built with **Node.js, Express.js, MongoDB, and Google Gemini AI**. It provides user authentication via JWT, favorite location management, real-time weather information, and contextual AI-powered weather summaries and lifestyle recommendations.

---

## Table of Contents
1. [Problem Statement](#problem-statement)
2. [Solution](#solution)
3. [Key Features](#key-features)
4. [Technology Stack](#technology-stack)
5. [System Architecture](#system-architecture)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Environment Configuration](#environment-configuration)
8. [Installation & Setup](#installation--setup)
9. [Running the Application](#running-the-application)
10. [Automated Testing](#automated-testing)
11. [Postman API Testing Guide](#postman-api-testing-guide)
12. [Muthalvan Project Demonstration Flow](#muthalvan-project-demonstration-flow)
13. [Project Demo Video](#project-demo-video)

---

## Problem Statement
Standard weather forecasting tools provide raw numerical metrics—such as temperature, humidity percentages, and wind velocity—which often lack contextual relevance. Everyday users struggle to translate raw meteorological data into actionable daily decisions such as what to wear, whether outdoor activities are advisable, and when hydration or sun protection is necessary. Additionally, users need a centralized, authenticated platform to store their preferred locations and receive tailored guidance.

---

## Solution
**AI WeatherWise** solves this gap by combining real-time meteorological metrics with Google Gemini Generative AI:
- **Actionable Insights**: Translates numerical conditions into concise, natural-language weather summaries and personalized recommendations (clothing, health precautions, hydration, and outdoor planning).
- **Secure Personalization**: Implements token-based JWT authentication and bcrypt password hashing to safeguard user accounts and isolate favorite cities per user.
- **High Resilience**: Designed with graceful fallbacks for external APIs (weather and AI) and offline database resilience so the API never crashes during reviews or demonstrations.

---

## Key Features
- **User Authentication & Authorization**:
  - Secure user registration and login with bcrypt password hashing (10 salt rounds).
  - Stateless JWT token authentication with expiration and role support (`user`, `admin`).
  - Strict route guards verifying `Bearer <token>` headers on private endpoints.
- **Favorite Locations Management**:
  - Full CRUD operations: Create, Read, Update, and Delete favorite cities.
  - Ownership isolation: Users can only view and manage their own locations.
  - Duplicate prevention: Compound indexing prevents duplicate cities per user.
- **Real-Time Weather Service**:
  - Retrieves live weather from OpenWeatherMap (temperature, humidity, wind speed, condition).
  - Flexible query support: path parameters (`/api/weather/:city`) and query strings (`/api/weather?city=...`).
  - Deterministic rule-based mock engine fallback if external API keys are not supplied.
- **Google Gemini Generative AI Integration**:
  - Synthesizes live weather conditions into natural-language weather summaries.
  - Generates personalized recommendations for activities and clothing based on current metrics.
  - Safe fallback generator ensures reliable testing without crashes even without an active Gemini key.
- **Centralized Error & Health Architecture**:
  - Standardized JSON responses with proper HTTP status codes (200, 201, 400, 401, 404, 500, 503).
  - Dedicated `/api/health` monitoring endpoint.
  - Safe MongoDB connection lifecycle handling.

---

## Technology Stack
| Layer | Technology |
| :--- | :--- |
| **Runtime** | Node.js (v18+) |
| **Framework** | Express.js (v4.x) |
| **Database** | MongoDB with Mongoose ODM (v8.x) |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` |
| **Generative AI** | Google Gemini API (`@google/generative-ai`) |
| **External APIs** | OpenWeatherMap API |
| **Middleware** | CORS, Dotenv, Express JSON Parser |
| **Testing** | Node.js native test runner & automated HTTP suite |
| **API Tooling** | Postman Collection v2.1 |

---

## System Architecture

```
                    ┌─────────────────────────┐
                    │      Client / Postman   │
                    └────────────┬────────────┘
                                 │ HTTP (REST)
                                 ▼
                    ┌─────────────────────────┐
                    │      Express.js App     │
                    │   (CORS, JSON Parser)   │
                    └────────────┬────────────┘
                                 │
     ┌───────────────────┬───────┴──────────┬───────────────────┐
     │                   │                  │                   │
     ▼                   ▼                  ▼                   ▼
┌─────────────┐   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Health &    │   │    Auth     │    │  Locations  │    │  Weather &  │
│ System Check│   │  Controller │    │  Controller │    │ AI Insights │
└─────────────┘   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
                         │                  │                  │
                         ▼                  ▼                  ▼
                  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                  │    User     │    │  Location   │    │ OpenWeather │
                  │    Model    │    │    Model    │    │  & Gemini   │
                  └──────┬──────┘    └──────┬──────┘    └─────────────┘
                         └──────────┬───────┘
                                    ▼
                         ┌─────────────────────┐
                         │   MongoDB Database  │
                         └─────────────────────┘
```

---

## API Endpoints Reference

### 1. System & Health
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Public | API Welcome screen, metadata, and directory |
| `GET` | `/api/health` | Public | Server uptime, status, and MongoDB connection status |

### 2. Authentication
| Method | Endpoint | Access | Headers | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | `Content-Type: application/json` | `{ "name", "email", "password", "role" }` | Register user and receive JWT |
| `POST` | `/api/auth/login` | Public | `Content-Type: application/json` | `{ "email", "password" }` | Authenticate user and receive JWT |
| `GET` | `/api/auth/profile` | Private | `Authorization: Bearer <token>` | *None* | Retrieve logged-in user profile |

### 3. Favorite Locations (Protected)
| Method | Endpoint | Access | Headers | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/locations` | Private | `Authorization: Bearer <token>` | `{ "city", "country" }` | Add new favorite city |
| `GET` | `/api/locations` | Private | `Authorization: Bearer <token>` | *None* | Get all favorite cities for user |
| `PUT` | `/api/locations/:id` | Private | `Authorization: Bearer <token>` | `{ "city", "country" }` | Update a favorite city |
| `DELETE` | `/api/locations/:id` | Private | `Authorization: Bearer <token>` | *None* | Delete a favorite city |

### 4. Weather API
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/weather/:city` | Public | Retrieve temperature, humidity, wind, condition by city name in path |
| `GET` | `/api/weather?city=Name` | Public | Retrieve weather metrics via query parameter |

### 5. AI Weather Insights (Protected)
| Method | Endpoint | Access | Headers | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/weather-summary` | Private | `Authorization: Bearer <token>` | `{ "city", "temperature", "humidity", "condition" }` or `{ "city" }` | Generate natural-language weather summary |
| `POST` | `/api/ai/weather-recommendation` | Private | `Authorization: Bearer <token>` | `{ "temperature", "condition" }` or `{ "city" }` | Generate personalized activity & clothing suggestions |

---

## Environment Configuration
The backend uses environment variables configured in `.env`. An `.env.example` file is provided:

```env
# Server Port
PORT=5000

# MongoDB Connection String (Atlas URI or Local MongoDB)
MONGO_URI=mongodb://127.0.0.1:27017/weatherwise

# JWT Secret Key
JWT_SECRET=your_super_secret_jwt_key_12345!

# OpenWeatherMap API Key
# If left as placeholder or empty, deterministic mock weather is used
WEATHER_API_KEY=YOUR_OPENWEATHER_API_KEY

# Google Gemini API Key
# If left as placeholder or empty, natural-language fallback generator is used
GEMINI_API_KEY=YOUR_GEMINI_API_KEY

# Optional: Gemini Model
GEMINI_MODEL=gemini-1.5-flash
```

> **Note on Resilient Fallbacks**: If external API keys (`WEATHER_API_KEY`, `GEMINI_API_KEY`) are not provided, the API automatically generates high-quality deterministic responses so all routes remain fully operational for offline demonstration.

---

## Installation & Setup

1. **Clone or navigate to the repository**:
   ```bash
   cd Backend
   ```

2. **Install all dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your desired configuration or MongoDB connection string.

---

## Running the Application

### Development Mode (with auto-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server will initialize on `http://localhost:5000` (or the configured `PORT`).

---

## Automated Testing
An automated test suite is included in `test/api.test.js` covering 31 assertions across all modules:
```bash
npm test
```

### Verified Test Areas:
- Health check and API welcome metadata
- Weather retrieval via path parameters and query strings
- Missing parameter handling (400)
- Route protection without token and with invalid token (401)
- Google Gemini AI summaries and personalized recommendations
- Bcrypt password hashing and comparePassword validation
- JWT signing, expiration, and ID decoding
- User and Location schema validation rules
- Database offline resilience (503 with helpful setup instructions)

---

## Postman API Testing Guide
A pre-configured collection is included: `postman_collection.json`.

1. Open **Postman**.
2. Click **Import** and select `postman_collection.json`.
3. The collection variables include:
   - `base_url`: `http://localhost:5000` (or your active PORT)
   - `token`: Automatically captured upon successful Registration or Login.
   - `location_id`: Automatically captured when adding a favorite location.
4. Execute the requests in the suggested sequence below.

---

## Muthalvan Project Demonstration Flow
Follow this recommended sequence for project demonstration and video recording:

1. **Project Introduction**: Overview of problem statement, architecture, and technology stack.
2. **Server Startup**: Run `npm start` in the terminal to show resilient startup and listening status.
3. **Health Check**: Call `GET /api/health` to confirm server status.
4. **User Registration**: Call `POST /api/auth/register` with name, email, password, and role.
5. **User Login**: Call `POST /api/auth/login` to show bcrypt validation and JWT issuance.
6. **JWT Route Protection**: Demonstrate that calling `GET /api/locations` without a token fails with 401.
7. **Add Favorite Location**: Call `POST /api/locations` with bearer token to save a city.
8. **Fetch Saved Locations**: Call `GET /api/locations` to view the user's isolated favorite cities.
9. **Fetch Weather**: Call `GET /api/weather/Hyderabad` to retrieve real-time weather metrics.
10. **Gemini AI Summary**: Call `POST /api/ai/weather-summary` to show natural-language weather description.
11. **Gemini AI Recommendation**: Call `POST /api/ai/weather-recommendation` to show clothing and activity advice.
12. **Postman Test Suite / npm test**: Run `npm test` to show 31 automated tests passing.

---

## Project Demo Video
- **Recorded Demo Video**: [Watch Demo Video on Google Drive](https://drive.google.com/your-drive-link-here)
*(Replace the URL above with your uploaded Google Drive video demonstration link)*

---

## License
This project is developed for educational and evaluation purposes as part of the **Naan Muthalvan** program.

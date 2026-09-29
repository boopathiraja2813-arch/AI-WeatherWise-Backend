# AI WeatherWise

A modern, production-ready RESTful Backend API integrating real-time weather analytics with Google Gemini Generative AI, secure JWT user authentication, and persistent favorite locations management.

---

## Project Description

**AI WeatherWise** is a full-featured backend application built using Node.js, Express.js, MongoDB, and Google Gemini AI. The API offers a secure, modular platform where registered users can query live weather metrics across global cities, save and manage their favorite locations, and receive human-centric AI-generated weather summaries and personalized clothing and activity recommendations.

---

## Problem Statement

Conventional weather applications present raw numerical data—such as temperature in Celsius, humidity percentages, and atmospheric pressure. For everyday users, interpreting these metrics to make practical daily decisions (e.g., what clothes to wear, whether outdoor exercise is recommended, or when extra hydration/sun protection is critical) is often cumbersome. Furthermore, users require a centralized and protected system to store preferred geographic locations and receive personalized insights tailored to current atmospheric conditions.

---

## Solution

**AI WeatherWise** bridges the gap between raw meteorological data and everyday life by combining live OpenWeatherMap services with Google Gemini Generative AI:
- **Intelligent Weather Summaries**: Converts meteorological conditions into concise, natural-language synopses that describe current conditions accurately.
- **Context-Aware Recommendations**: Uses Gemini AI to produce practical, actionable lifestyle advice (e.g., hydration reminders, clothing choices, and outdoor precautions).
- **Secure Architecture**: Enforces stateless JWT authentication and bcrypt password hashing to isolate and safeguard user data and saved cities.
- **Production Resilience**: Features built-in fallback mechanisms and centralized error handling ensuring uninterrupted service even under external network or API constraints.

---

## Features

- **User Registration**: Create new user accounts with encrypted passwords (bcrypt hashing with 10 salt rounds) and role assignment (`user`, `admin`).
- **User Login**: Secure credential verification with issuance of signed JSON Web Tokens (JWT).
- **JWT Authentication**: Token-based authentication verifying user identity across protected routes.
- **Protected Routes**: Middleware guards enforcing authorization via HTTP `Bearer <token>` headers.
- **Favorite Locations**: Full CRUD operations (Add, Retrieve, Update, Delete) allowing authenticated users to manage their favorite cities with ownership isolation.
- **Current Weather API**: Live weather retrieval supporting both path parameters (`/api/weather/:city`) and query parameters (`/api/weather?city=...`).
- **Gemini AI Weather Summary**: Contextual, natural-language summary generation based on city conditions and temperature metrics.
- **Gemini AI Weather Recommendation**: Actionable clothing, activity, and health suggestions powered by Google Gemini AI.
- **MongoDB Persistence**: Robust database persistence using Mongoose ODM with schema validations and indexing.
- **Error Handling**: Standardized JSON error responses with meaningful HTTP status codes (200, 201, 400, 401, 404, 500, 503).
- **REST API**: Clean, predictable RESTful conventions following standard HTTP methods and resource naming.
- **Postman Testing**: Comprehensive pre-configured Postman collection with automated test assertions and dynamic token/ID variable handling.

---

## Technologies Used

- **Runtime Environment**: [Node.js](https://nodejs.org/) (v18+)
- **Web Framework**: [Express.js](https://expressjs.com/) (v4.x)
- **Database & ODM**: [MongoDB](https://www.mongodb.com/) & [Mongoose](https://mongoosejs.com/) (v8.x)
- **Authentication**: [JSON Web Token (JWT)](https://jwt.io/) (`jsonwebtoken`)
- **Security & Password Hashing**: [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- **Generative AI**: [Google Gemini API](https://aistudio.google.com/) (`@google/generative-ai`)
- **External Weather Service**: [OpenWeatherMap API](https://openweathermap.org/api)
- **Cross-Origin Resource Sharing**: [CORS](https://github.com/expressjs/cors)
- **Environment Management**: [dotenv](https://github.com/motdotla/dotenv)
- **API Testing & Automation**: Postman & Newman

---

## Backend Architecture

The backend follows a layered MVC-Service architecture ensuring separation of concerns:

```
Client / Postman
       │
       ▼
 Express API (app.js)
       │
       ▼
 Authentication Middleware (authMiddleware.js)
       │
       ▼
 Controllers (authController, locationController, weatherController, aiController)
       │
       ▼
 Services (weatherService, aiService)
       │
       ├──► MongoDB (Users, Locations)
       ├──► OpenWeatherMap API
       └──► Google Gemini AI
```

---

## Project Structure

```text
Backend/
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── AI_WeatherWise_Postman_Collection.json
├── postman_collection.json
├── README.md
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── aiController.js
│   │   ├── authController.js
│   │   ├── locationController.js
│   │   └── weatherController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── Location.js
│   │   └── User.js
│   ├── routes/
│   │   ├── aiRoutes.js
│   │   ├── authRoutes.js
│   │   ├── locationRoutes.js
│   │   └── weatherRoutes.js
│   └── services/
│       ├── aiService.js
│       └── weatherService.js
└── test/
    └── api.test.js
```

---

## Environment Setup

1. Copy the sample environment file to create your local `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and set your configuration variables:
   ```env
   # Server Configuration
   PORT=5001

   # Database Configuration (Local MongoDB or MongoDB Atlas URI)
   MONGO_URI=mongodb://127.0.0.1:27017/weatherwise

   # JWT Authentication Secret
   JWT_SECRET=your_jwt_secret_key_here

   # OpenWeatherMap API Key (Free tier from https://openweathermap.org/api)
   WEATHER_API_KEY=your_openweathermap_api_key_here

   # Google Gemini API Key (From https://aistudio.google.com/)
   GEMINI_API_KEY=your_gemini_api_key_here

   # Optional: Google Gemini Model Identifier
   GEMINI_MODEL=gemini-1.5-flash
   ```

*(Note: Never commit `.env` containing sensitive credentials to version control. It is explicitly listed in `.gitignore`.)*

---

## Installation

Ensure you are in the `Backend` directory, then install all project dependencies:

```bash
cd Backend
npm install
```

---

## Run

To run the application, execute the start script defined in `package.json`:

### Production Run:
```bash
npm start
```

### Development Run (with nodemon auto-restart):
```bash
npm run dev
```

The server will initialize on port `5001`:
```text
[MongoDB] Connected: 127.0.0.1
[Server] AI WeatherWise API running on port 5001
[Server] Base URL: http://localhost:5001
```

---

## API Endpoints

### 1. Health & System
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | No | API Welcome Screen, description, and available endpoints directory |
| `GET` | `/api/health` | No | System health check and live MongoDB connectivity status |

### 2. Authentication
| Method | Endpoint | Auth Required | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | No | `{ "name", "email", "password", "role" }` | Registers user, hashes password, returns user data & JWT token |
| `POST` | `/api/auth/login` | No | `{ "email", "password" }` | Validates credentials and returns JWT access token |
| `GET` | `/api/auth/profile` | **Yes (Bearer JWT)** | *None* | Retrieves the authenticated user's profile |

### 3. Favorite Locations
| Method | Endpoint | Auth Required | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/locations` | **Yes (Bearer JWT)** | `{ "city", "country" }` | Adds a new favorite location for the authenticated user |
| `GET` | `/api/locations` | **Yes (Bearer JWT)** | *None* | Retrieves all favorite locations saved by the user |
| `PUT` | `/api/locations/:id` | **Yes (Bearer JWT)** | `{ "city", "country" }` | Updates an existing favorite location owned by the user |
| `DELETE` | `/api/locations/:id` | **Yes (Bearer JWT)** | *None* | Deletes a favorite location owned by the user |

### 4. Weather API
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/weather/:city` | No | Retrieves current weather metrics (temperature, humidity, wind, condition) using city path parameter |
| `GET` | `/api/weather?city=...` | No | Retrieves weather metrics using query parameter |

### 5. AI Weather Insights
| Method | Endpoint | Auth Required | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/weather-summary` | **Yes (Bearer JWT)** | `{ "city", "temperature", "humidity", "condition" }` or `{ "city" }` | Generates a natural-language weather summary using Gemini AI |
| `POST` | `/api/ai/weather-recommendation` | **Yes (Bearer JWT)** | `{ "temperature", "condition" }` or `{ "city" }` | Generates actionable lifestyle, clothing, and activity recommendations |

---

## Postman Testing

A verified, demonstration-ready Postman collection is included directly in the repository:
- `AI_WeatherWise_Postman_Collection.json`
- `postman_collection.json`

### Import Instructions:
1. Open **Postman**.
2. Click **Import** and select `AI_WeatherWise_Postman_Collection.json`.
3. The collection is configured with default variable `base_url = http://localhost:5001`.

### Recommended Demonstration Order:
1. **Health Check**: Call `GET /api/health` to demonstrate system status and database connection.
2. **Register**: Call `POST /api/auth/register` to create a new student/user account.
3. **Login**: Call `POST /api/auth/login` to automatically capture the JWT token into `{{token}}`.
4. **Profile**: Call `GET /api/auth/profile` with `Bearer {{token}}` to demonstrate protected route authorization.
5. **Add Favorite Location**: Call `POST /api/locations` to add a city and automatically capture `{{location_id}}`.
6. **Get Favorite Locations**: Call `GET /api/locations` to demonstrate user-isolated saved cities.
7. **Weather**: Call `GET /api/weather/Chennai` or `GET /api/weather?city=Hyderabad` to fetch live weather.
8. **AI Weather Summary**: Call `POST /api/ai/weather-summary` with token to display Gemini AI insights.
9. **AI Weather Recommendation**: Call `POST /api/ai/weather-recommendation` to show actionable lifestyle suggestions.

---

## GitHub Setup

To push this repository to GitHub, follow standard Git commands:

```bash
# 1. Initialize git (if not already initialized)
git init

# 2. Stage all project files (safe files governed by .gitignore)
git add .

# 3. Create your commit
git commit -m "Final AI WeatherWise backend"

# 4. Set branch to main
git branch -M main

# 5. Add remote origin (using your existing GitHub repository URL)
git remote add origin https://github.com/boopathiraja2813-arch/AI-WeatherWise-Backend.git

# 6. Push to GitHub
git push -u origin main
```

---

## Demo Video

Demo Video:  
[Google Drive Link - Add Here]

---

## License

This project is developed for academic evaluation and demonstration under the **Naan Muthalvan** program.

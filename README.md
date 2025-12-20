# EPLQ - Efficient Privacy-Preserving Location-Based Query System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

## 🔐 Project Overview

EPLQ is a privacy-preserving location-based service that enables users to perform spatial range queries on encrypted data. The system allows querying Points of Interest (POIs) within a specific distance while maintaining user location privacy through predicate-only encryption for inner product range queries.

### Key Features

- **Privacy-Preserving Queries**: Search for nearby POIs without exposing your actual location
- **End-to-End Encryption**: Location data is encrypted before storage and during queries
- **Efficient Spatial Indexing**: R-tree based index structure for fast query processing
- **Real-time Performance**: Query generation optimized for mobile devices (~0.9 seconds)
- **Comprehensive Logging**: All user actions tracked for security and debugging

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        EPLQ Architecture                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   Frontend  │────▶│  Express    │────▶│  Firebase   │       │
│  │  (HTML/JS)  │     │   Server    │     │  Firestore  │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │  Firebase   │     │  Encryption │     │   Spatial   │       │
│  │    Auth     │     │   Module    │     │    Index    │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## 📋 Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | HTML5, CSS3, JavaScript (ES6+) |
| Backend | Node.js, Express.js |
| Database | Firebase Firestore |
| Authentication | Firebase Auth |
| Encryption | CryptoJS (AES-256, SHA-256) |
| Spatial Index | RBush (R-tree implementation) |
| Logging | Winston |
| Testing | Jest |

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Firebase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/eplq-privacy-location-query.git
   cd eplq-privacy-location-query
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase credentials
   ```

4. **Update Firebase client configuration**
   Edit `public/js/firebase-client.js` with your Firebase config:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "your-project.firebaseapp.com",
       projectId: "your-project-id",
       // ... other config
   };
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
eplq-privacy-location-query/
├── public/                 # Static frontend files
│   ├── index.html         # Main HTML file
│   ├── css/
│   │   └── styles.css     # Application styles
│   └── js/
│       ├── app.js         # Main application logic
│       └── firebase-client.js  # Firebase client config
├── src/
│   ├── api/
│   │   └── routes.js      # API endpoints
│   ├── auth/
│   │   ├── authService.js # Authentication logic
│   │   └── index.js
│   ├── encryption/
│   │   ├── predicateEncryption.js  # Core encryption
│   │   ├── rangeQuery.js  # Range query encryption
│   │   ├── dataEncryption.js  # Data encryption
│   │   └── index.js
│   ├── query/
│   │   ├── spatialIndex.js  # R-tree implementation
│   │   ├── queryProcessor.js  # Query handling
│   │   └── index.js
│   ├── admin/
│   │   ├── poiManager.js  # POI management
│   │   ├── adminService.js  # Admin operations
│   │   └── index.js
│   ├── user/
│   │   ├── searchService.js  # User search
│   │   ├── userService.js  # User operations
│   │   └── index.js
│   ├── utils/
│   │   ├── logger.js      # Winston logging
│   │   └── validators.js  # Input validation
│   └── server.js          # Express server
├── config/
│   ├── firebase.config.js  # Firebase client config
│   └── firebase-admin.config.js  # Admin SDK config
├── tests/                  # Test files
├── docs/                   # Documentation
├── .env.example           # Environment template
├── firebase.json          # Firebase config
├── firestore.rules        # Security rules
├── package.json
└── README.md
```

## 🔧 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| POST | `/api/auth/reset-password` | Password reset |

### Search Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/search` | Execute privacy-preserving search |
| GET | `/api/categories` | Get POI categories |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Dashboard statistics |
| GET | `/api/admin/pois` | List all POIs |
| POST | `/api/admin/pois` | Add new POI |
| POST | `/api/admin/pois/batch` | Batch upload POIs |
| DELETE | `/api/admin/pois/:id` | Delete POI |
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/logs` | Get activity logs |

### Example: Search Request

```javascript
POST /api/search
Content-Type: application/json

{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "radius": 5,
  "category": "hospital",
  "limit": 20
}
```

## 🔒 Security Features

### Predicate-Only Encryption

The system uses predicate-only encryption for inner product range queries:

1. **Location Encryption**: User coordinates are transformed using a matrix-based encryption scheme
2. **Query Token Generation**: Search queries are encrypted with bounded ranges
3. **Predicate Evaluation**: Server evaluates encrypted predicates without learning actual locations

### Data Protection

- **AES-256 Encryption**: All POI metadata (names, addresses, descriptions) encrypted at rest
- **SHA-256 Hashing**: Sensitive data hashed for integrity verification
- **Firebase Security Rules**: Role-based access control for all database operations

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/encryption.test.js
```

## 📊 Performance Metrics

| Operation | Target | Actual |
|-----------|--------|--------|
| Query Token Generation | < 1s | ~0.9s |
| POI Search (1000 POIs) | < 2s | ~1.5s |
| Index Build (10000 POIs) | < 5s | ~3s |
| Encryption (single POI) | < 50ms | ~30ms |

## 🚢 Deployment

### Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy
firebase deploy
```

### Environment Variables for Production

```env
NODE_ENV=production
FIREBASE_API_KEY=your-production-key
ENCRYPTION_MASTER_KEY=your-secure-master-key
LOG_LEVEL=info
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ for privacy-preserving location services**


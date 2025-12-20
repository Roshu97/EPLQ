# EPLQ API Reference

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-project.web.app/api
```

## Authentication

All authenticated endpoints require the `X-User-Id` header:

```
X-User-Id: <firebase-user-uid>
```

---

## Authentication Endpoints

### Register User

```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "displayName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "uid": "abc123",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "user"
  }
}
```

### Login

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "uid": "abc123",
    "email": "user@example.com",
    "role": "user"
  }
}
```

---

## Search Endpoints

### Execute Privacy-Preserving Search

```http
POST /api/search
```

**Request Body:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "radius": 5,
  "category": "hospital",
  "limit": 20
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| latitude | number | Yes | Latitude (-90 to 90) |
| longitude | number | Yes | Longitude (-180 to 180) |
| radius | number | Yes | Search radius in km (1-50) |
| category | string | No | Filter by category |
| limit | number | No | Max results (default: 50) |

**Response:**
```json
{
  "success": true,
  "queryId": "q-abc123",
  "results": [
    {
      "id": "poi-1",
      "name": "City Hospital",
      "category": "hospital",
      "address": "123 Health St",
      "distance": 1.5
    }
  ],
  "metadata": {
    "totalCandidates": 15,
    "matchingResults": 5,
    "timing": {
      "tokenGeneration": 45,
      "indexSearch": 12,
      "predicateEval": 89,
      "total": 156
    }
  }
}
```

### Get Categories

```http
GET /api/categories
```

**Response:**
```json
{
  "success": true,
  "categories": [
    { "name": "hospital", "count": 45 },
    { "name": "restaurant", "count": 120 },
    { "name": "police", "count": 23 }
  ]
}
```

---

## Admin Endpoints

### Get Dashboard Statistics

```http
GET /api/admin/dashboard
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalPOIs": 500,
    "categoryBreakdown": {
      "hospital": 45,
      "restaurant": 120
    },
    "users": {
      "total": 150,
      "active": 120
    },
    "queries": {
      "total": 5000,
      "avgResponseTime": 156
    }
  }
}
```

### List POIs

```http
GET /api/admin/pois?limit=50&offset=0
```

**Response:**
```json
{
  "success": true,
  "pois": [
    {
      "id": "poi-1",
      "name": "City Hospital",
      "category": "hospital",
      "address": "123 Health St",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 500
}
```

### Add POI

```http
POST /api/admin/pois
```

**Request Body:**
```json
{
  "name": "New Hospital",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "category": "hospital",
  "address": "456 Medical Ave",
  "description": "24/7 Emergency Services",
  "phone": "555-1234"
}
```

### Batch Upload POIs

```http
POST /api/admin/pois/batch
```

**Request Body:**
```json
{
  "pois": [
    {
      "name": "Hospital A",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "category": "hospital"
    },
    {
      "name": "Hospital B",
      "latitude": 40.7200,
      "longitude": -74.0100,
      "category": "hospital"
    }
  ]
}
```

### Delete POI

```http
DELETE /api/admin/pois/:id
```

### List Users

```http
GET /api/admin/users
```

### Update User Role

```http
PUT /api/admin/users/:uid/role
```

**Request Body:**
```json
{
  "role": "admin"
}
```

### Get Activity Logs

```http
GET /api/admin/logs?limit=100&type=query
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 500 | Internal Server Error |


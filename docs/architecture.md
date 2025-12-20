# EPLQ System Architecture

## Overview

The EPLQ (Efficient Privacy-Preserving Location-Based Query) system is designed to enable privacy-preserving spatial queries on encrypted location data. This document describes the system architecture, components, and data flow.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Web Browser (SPA)                             │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │   │
│  │  │   Auth   │  │  Search  │  │  Admin   │  │  Results │        │   │
│  │  │   UI     │  │   UI     │  │   UI     │  │   UI     │        │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            API Layer (Express.js)                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         REST API Routes                          │   │
│  │  /api/auth/*  │  /api/search  │  /api/admin/*  │  /api/health   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Service Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ AuthService  │  │ SearchService│  │ AdminService │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ POIManager   │  │QueryProcessor│  │ UserService  │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Core Layer                                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Encryption Module                              │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │  │
│  │  │   Predicate    │  │  Range Query   │  │     Data       │     │  │
│  │  │  Encryption    │  │  Encryption    │  │   Encryption   │     │  │
│  │  └────────────────┘  └────────────────┘  └────────────────┘     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Spatial Index (R-tree)                         │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │  │
│  │  │  Build Index   │  │  Range Search  │  │  Insert/Delete │     │  │
│  │  └────────────────┘  └────────────────┘  └────────────────┘     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Data Layer (Firebase)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │  Firestore   │  │  Firebase    │  │  Firebase    │                  │
│  │  Database    │  │    Auth      │  │   Hosting    │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Encryption Module

#### Predicate Encryption (`predicateEncryption.js`)
- Matrix-based location encryption
- Transforms (lat, lng) to 4-dimensional encrypted vector
- Uses deterministic key derivation from master key

#### Range Query Encryption (`rangeQuery.js`)
- Extends predicate encryption for range queries
- Generates query tokens with encrypted bounds
- Evaluates predicates without revealing actual locations

#### Data Encryption (`dataEncryption.js`)
- AES-256 encryption for POI metadata
- SHA-256 hashing for integrity verification
- Encrypts: name, description, address, phone

### 2. Spatial Index

#### R-tree Implementation (`spatialIndex.js`)
- Uses RBush library for efficient spatial indexing
- Supports range queries on encrypted bounding boxes
- O(log n) search complexity

### 3. Query Processing

#### Query Processor (`queryProcessor.js`)
- Orchestrates encrypted query execution
- Implements result caching with TTL
- Tracks query metrics and timing

## Data Flow

### Search Query Flow

```
1. User enters location + radius
         │
         ▼
2. Client generates query token
   (encrypts location bounds)
         │
         ▼
3. Server receives encrypted query
         │
         ▼
4. Spatial index filters candidates
   (using encrypted bounding boxes)
         │
         ▼
5. Predicate evaluation on candidates
   (encrypted comparison)
         │
         ▼
6. Decrypt matching POI metadata
         │
         ▼
7. Return results to client
```

### POI Upload Flow

```
1. Admin uploads POI data
         │
         ▼
2. Validate input data
         │
         ▼
3. Encrypt location coordinates
         │
         ▼
4. Encrypt metadata (name, address, etc.)
         │
         ▼
5. Generate encrypted bounding box
         │
         ▼
6. Store in Firestore
         │
         ▼
7. Update spatial index
```

## Security Model

### Threat Model
- **Honest-but-curious server**: Server follows protocol but may try to learn user locations
- **Protected data**: User query locations, POI exact coordinates
- **Revealed data**: Encrypted query tokens, encrypted POI data, query result count

### Security Properties
1. **Location Privacy**: User location never sent in plaintext
2. **Query Unlinkability**: Different queries from same location produce different tokens
3. **Forward Secrecy**: Compromised key doesn't reveal past queries

## Database Schema

### Firestore Collections

```
users/
  └── {userId}
      ├── uid: string
      ├── email: string
      ├── displayName: string
      ├── role: "user" | "admin"
      ├── createdAt: timestamp
      └── isActive: boolean

pois/
  └── {poiId}
      ├── id: string
      ├── encryptedName: string
      ├── encryptedDescription: string
      ├── encryptedAddress: string
      ├── category: string
      ├── encryptedLocation: object
      ├── encryptedBoundingBox: object
      └── createdAt: timestamp

queryLogs/
  └── {logId}
      ├── userId: string
      ├── queryId: string
      ├── resultCount: number
      ├── responseTime: number
      └── timestamp: timestamp
```

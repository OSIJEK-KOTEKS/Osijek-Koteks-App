# API Documentation

This document describes the backend API implemented in `osijek-koteks-backend` and the practical behavior used by the existing web/mobile clients.

## Overview

- Base URL used by current clients: `https://osijek-koteks-app.onrender.com`
- API prefix: `/api`
- Auth: JWT bearer token in `Authorization: Bearer <token>`
- Default content type: `application/json`
- Upload endpoints use `multipart/form-data`
- Real-time side channel: Socket.IO is enabled on the same origin

## Authentication Model

Most routes require a valid JWT. The auth middleware:

- reads `Authorization` header
- requires the `Bearer <token>` format
- verifies token with `JWT_SECRET`
- loads the full user document and assigns it to `req.user`

Common auth failures:

- `401 { "message": "No token, authorization denied" }`
- `401 { "message": "User not found" }`
- `401 { "message": "Token is not valid" }`

## Roles and Access Flags

User role values:

- `admin`
- `user`
- `bot`
- `pc-user`

User permission flags:

- `hasFullAccess`: bypasses code-based item filtering
- `canAccessRacuni`: allows access to `/api/bills`
- `canAccessPrijevoz`: allows access to `/api/transport-requests`

Important access rules:

- Items list/read access is primarily code-based, not purely role-based.
- `admin` with an empty `codes` array can see all items.
- `admin` with non-empty `codes` is restricted to those codes.
- `bot` can create items.
- Transport requests require `canAccessPrijevoz`; mutating them also requires `admin`.
- Bills require `admin` or `canAccessRacuni`.

## Shared Data Shapes

### User

```json
{
  "_id": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "company": "string",
  "codes": ["string"],
  "assignedRegistrations": ["string"],
  "role": "admin|user|bot|pc-user",
  "isVerified": false,
  "phoneNumber": "string",
  "hasFullAccess": false,
  "canAccessRacuni": false,
  "canAccessPrijevoz": false
}
```

### Item

```json
{
  "_id": "string",
  "title": "string",
  "code": "string",
  "registracija": "string",
  "neto": 12345,
  "tezina": 12345,
  "prijevoznik": "string",
  "pdfUrl": "string",
  "creationDate": "DD.MM.YYYY",
  "creationTime": "HH:mm",
  "approvalStatus": "na čekanju|odobreno|odbijen",
  "approvalDate": "DD.MM.YYYY HH:mm",
  "createdBy": { "_id": "string", "firstName": "string", "lastName": "string", "email": "string" },
  "approvedBy": { "_id": "string", "firstName": "string", "lastName": "string" },
  "paidBy": { "_id": "string", "firstName": "string", "lastName": "string", "email": "string" },
  "transportAcceptanceId": "string or populated object",
  "in_transit": false,
  "approvalPhotoFront": { "url": "string|null", "uploadDate": "ISO date|null", "mimeType": "image/jpeg|image/png|image/heic|null", "publicId": "string|null" },
  "approvalPhotoBack": { "url": "string|null", "uploadDate": "ISO date|null", "mimeType": "image/jpeg|image/png|image/heic|null", "publicId": "string|null" },
  "approvalDocument": { "url": "string|null", "uploadDate": "ISO date|null", "mimeType": "application/pdf|null", "publicId": "string|null" },
  "approvalLocation": {
    "coordinates": { "latitude": 45.0, "longitude": 18.0 },
    "accuracy": 5,
    "timestamp": "ISO date"
  },
  "isPaid": false,
  "paidAt": "ISO date|null",
  "prosjecnaBrzina": 52.4
}
```

Notes:

- `creationDate` and `approvalDate` are serialized as Croatian-formatted strings, not ISO strings.
- `transportAcceptanceId` is sometimes returned as an ID, sometimes populated.

### TransportRequest

```json
{
  "_id": "string",
  "kamenolom": "VELIČKI KAMEN VELIČANKA|VELIČKI KAMEN VETOVO|KAMEN - PSUNJ|MOLARIS|PRODORINA",
  "gradiliste": "string",
  "brojKamiona": 3,
  "prijevozNaDan": "DD/MM/YYYY",
  "isplataPoT": 12.5,
  "userId": "string or populated object",
  "userEmail": "string",
  "status": "Aktivno|Neaktivno",
  "assignedTo": "All or array of user IDs",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

### TransportAcceptance

```json
{
  "_id": "string",
  "requestId": "string or populated object",
  "userId": "string or populated object",
  "registrations": ["string"],
  "acceptedCount": 2,
  "gradiliste": "string",
  "status": "pending|approved|declined",
  "reviewedBy": "string or populated object",
  "reviewedAt": "ISO date",
  "paymentStatus": "Nije plaćeno|Plaćeno",
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "ukupnaIsplata": 100.5,
  "deliveredCount": 2
}
```

### Bill

```json
{
  "_id": "string",
  "title": "string",
  "dobavljac": "KAMEN - PSUNJ d.o.o.|MOLARIS d.o.o.|VELIČKI KAMEN d.o.o.",
  "description": "string",
  "items": ["item or populated items"],
  "createdBy": "string or populated object",
  "attachment": {
    "url": "string|null",
    "publicId": "string|null",
    "uploadDate": "ISO date|null",
    "mimeType": "application/pdf|null",
    "originalName": "string|null"
  },
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

## Public Utility Endpoints

### `GET /api/test-db`

No auth.

Response:

```json
{
  "status": "success",
  "message": "Successfully connected to MongoDB Atlas",
  "database": "db-name",
  "connectionState": 1
}
```

### `GET /api/privacy-policy`

No auth.

Returns static Croatian privacy policy metadata plus retention days from `DATA_RETENTION_DAYS`.

## Auth API

### `POST /api/auth/register`

No auth.

Request body:

```json
{
  "firstName": "string",
  "lastName": "string",
  "company": "string",
  "email": "string",
  "password": "string",
  "codes": ["string"],
  "role": "admin|user|bot|pc-user",
  "hasFullAccess": false,
  "canAccessRacuni": false,
  "canAccessPrijevoz": false
}
```

Behavior:

- creates a user
- password is hashed via model pre-save hook
- sets `isVerified` to `false`
- immediately returns a login token

Success response:

```json
{
  "token": "jwt",
  "user": { "...": "see User shape" }
}
```

Errors:

- `400 { "message": "User already exists" }`
- `400 { "message": "Validation error", "details": "..." }`

### `POST /api/auth/login`

No auth.

Request body:

```json
{
  "email": "string",
  "password": "string"
}
```

Success response:

```json
{
  "token": "jwt",
  "user": { "...": "see User shape" }
}
```

Errors:

- `400 { "message": "Invalid credentials" }`

## Users API

### `GET /api/users`

Auth required. Admin only.

Response: array of users without password.

### `GET /api/users/prijevoz/access`

Auth required. Admin only.

Returns non-admin users where `canAccessPrijevoz = true`.

Response fields:

- `_id`
- `firstName`
- `lastName`
- `email`
- `company`

### `GET /api/users/:id`

Auth required.

Rules:

- admin can read any user
- non-admin can read only themselves

Errors:

- `400 { "message": "Invalid user ID format" }`
- `403 { "message": "Access denied" }`
- `404 { "message": "User not found" }`

### `POST /api/users`

Auth required. Admin only.

Request body is effectively the same as register.

Required fields from model behavior:

- `firstName`
- `lastName`
- `company`
- `email`
- `password`

Optional:

- `codes`
- `role`
- `hasFullAccess`
- `canAccessRacuni`
- `canAccessPrijevoz`

Response: created user without password.

### `PATCH /api/users/:id`

Auth required.

Rules:

- admin can update any user
- non-admin can update only themselves

Non-admin updatable fields:

- `firstName`
- `lastName`
- `company`
- `phoneNumber`

Admin-only extra fields:

- `role`
- `isVerified`
- `codes`
- `assignedRegistrations`
- `hasFullAccess`
- `canAccessRacuni`
- `canAccessPrijevoz`

Response: updated user document.

### `PATCH /api/users/:id/codes`

Auth required. Admin only.

Request body:

```json
{
  "codes": ["RN1", "RN2"]
}
```

Behavior:

- trims entries
- removes empty strings
- removes duplicates

### `PATCH /api/users/:id/password`

Auth required. Admin only.

Request body:

```json
{
  "password": "new-password"
}
```

Response:

```json
{
  "message": "Password updated successfully"
}
```

### `DELETE /api/users/:id`

Auth required. Admin only.

Response:

```json
{
  "message": "User deleted successfully"
}
```

## Items API

### `GET /api/items/codes`

Auth required.

Returns distinct `code` values visible to the current user under item access rules.

### `GET /api/items/users`

Auth required.

Returns distinct item creators visible to current user:

```json
[
  {
    "_id": "userId",
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "displayName": "Ime Prezime"
  }
]
```

### `GET /api/items/carriers`

Auth required.

Returns distinct `prijevoznik` values visible to current user.

### `GET /api/items/registrations`

Auth required.

Returns distinct `registracija` values visible to current user.

### `GET /api/items`

Auth required.

Query params:

- `page` number, default `1`
- `limit` number, default `10`
- `startDate` parseable date string
- `endDate` parseable date string
- `code`
- `prijevoznik`
- `sortOrder`: `date-asc | date-desc | pending-first | approved-first`
- `searchTitle`
- `searchRegistration`
- `inTransitOnly=true`
- `createdByUser` single user ID or comma-separated user IDs
- `paidStatus=paid|unpaid`

Response:

```json
{
  "items": [{ "...": "Item" }],
  "pagination": {
    "total": 100,
    "page": 1,
    "pages": 10,
    "hasMore": true
  },
  "totalWeight": 123456,
  "avgSpeed": 54.2
}
```

Notes:

- `totalWeight` sums `tezina` across the full filtered result set, not just the current page.
- `avgSpeed` is calculated only from approved items with `prosjecnaBrzina` and only respects `code`, not the other active filters.
- The implementation checks `query.inTransit`, but the actual field is `in_transit`; in practice `inTransitOnly=true` does not filter correctly.

### `GET /api/items/:id`

Auth required.

Readable when one of the following is true:

- admin with no assigned codes
- current user has the item’s `code` in `user.codes`
- current user has `hasFullAccess = true`

Response: single item.

### `POST /api/items`

Auth required. `admin` or `bot` only.

Request body:

```json
{
  "title": "string",
  "code": "string",
  "registracija": "string",
  "neto": 12345,
  "tezina": 12345,
  "prijevoznik": "string",
  "pdfUrl": "https://...",
  "creationDate": "2026-03-13T00:00:00.000Z"
}
```

Required:

- `title`
- `code`
- `pdfUrl`

Behavior:

- if `title` already exists, the old item is deleted first, including stored approval files
- `code` may be replaced by a `#...#` substring extracted from `title`
- `creationTime` is generated server-side in `Europe/Zagreb`
- initial `approvalStatus` is `na čekanju`
- `neto` and `tezina` are synchronized if only one is provided
- if an approved transport acceptance already exists for the same `code`, the item may be auto-linked

Response: created item.

### `PATCH /api/items/:id/code`

Auth required. Admin only.

Request body:

```json
{
  "code": "NEW_CODE"
}
```

Behavior:

- duplicate codes are explicitly allowed
- admin still needs item access under the code-based access rule

Response:

```json
{
  "success": true,
  "message": "Code updated successfully",
  "messageHr": "Kod je uspješno ažuriran",
  "item": { "...": "Item" },
  "changes": {
    "oldCode": "OLD",
    "newCode": "NEW",
    "updatedBy": {
      "id": "userId",
      "email": "user@example.com",
      "name": "Ime Prezime"
    },
    "updatedAt": "ISO date"
  }
}
```

### `GET /api/items/:id/code-history`

Auth required. Admin only.

Placeholder only. Not implemented.

Response:

```json
{
  "message": "Code history feature not yet implemented",
  "messageHr": "Funkcija povijesti kodova još nije implementirana",
  "itemId": "..."
}
```

### `POST /api/items/validate-code`

Auth required. Admin only.

Request body:

```json
{
  "code": "ABC123",
  "itemId": "optional existing item id"
}
```

Validation rules:

- regex: `^[A-Za-z0-9_-]{3,20}$`
- rejects duplicate code usage, except for the current `itemId`

Response when available:

```json
{
  "valid": true,
  "message": "Code is available",
  "messageHr": "Kod je dostupan"
}
```

Response when conflicting:

```json
{
  "valid": false,
  "message": "Code already exists",
  "messageHr": "Kod već postoji",
  "conflictingItem": {
    "id": "itemId",
    "title": "string"
  }
}
```

Important: this endpoint enforces uniqueness, but `PATCH /api/items/:id/code` does not. The two endpoints are inconsistent.

### `PATCH /api/items/:id`

Auth required. Admin only.

Supported fields in body:

- `title`
- `code`
- `pdfUrl`
- `creationDate`
- `neto`
- `tezina`
- optional uploaded file field `photo`

Response: updated item.

Important implementation detail:

- the route writes `approvalPhoto`, but the model only defines `approvalPhotoFront` and `approvalPhotoBack`. The uploaded `photo` field is therefore not part of the documented item schema and should not be used by new clients.

### `PATCH /api/items/:id/pay`

Auth required. Admin only.

Request body:

```json
{
  "isPaid": true
}
```

Behavior:

- sets `isPaid`
- sets `paidAt` and `paidBy` when paid
- clears them when unpaid

Response: updated item.

### `PATCH /api/items/:id/approval`

Auth required.

Used by mobile app and PC user approval flows.

Multipart form fields:

- `approvalStatus` required: `odobreno | odbijen`
- `inTransit` optional: `true | false`
- `neto` optional number
- `locationData` optional JSON string:

```json
{
  "coordinates": { "latitude": 45.0, "longitude": 18.0 },
  "accuracy": 5,
  "timestamp": "2026-03-13T10:00:00.000Z"
}
```

Optional files:

- `photoFront` image: `.jpg | .jpeg | .png | .heic`
- `photoBack` image: `.jpg | .jpeg | .png | .heic`
- `pdfDocument` PDF

File size limit:

- 10 MB per file

Behavior:

- sets `approvalStatus`, `approvalDate`, `approvedBy`
- updates `in_transit`
- updates `neto`; updates `tezina` only if `tezina` was previously unset
- stores approval location if parsable
- uploads files to Cloudinary and replaces previous versions
- if approved, may auto-link item to an approved transport acceptance with available slots
- if approved, may calculate `prosjecnaBrzina`

Response: updated item.

### `DELETE /api/items/:id`

Auth required. Admin only.

Behavior:

- deletes Cloudinary approval assets if present
- deletes item

Response:

```json
{
  "message": "Item deleted successfully"
}
```

### `GET /api/items/acceptance/:acceptanceId/approved-registrations`

Auth required.

Returns approved items linked to one transport acceptance.

Response:

```json
{
  "linkedItems": [
    { "itemId": "string", "registration": "PŽ 995 FD" }
  ],
  "linkedItemCount": 1
}
```

### `GET /api/items/transport-item/:itemId`

Auth required.

Returns one item with richer population for the transport modal:

- `createdBy`
- `approvedBy`
- `paidBy`
- `transportAcceptanceId.requestId.isplataPoT`

### `GET /api/items/acceptance/:acceptanceId/registration/:registration`

Auth required.

Finds the linked item for one acceptance by registration prefix match.

## Bills API

All bills routes require auth plus `admin` or `canAccessRacuni = true`.

### `GET /api/bills`

Returns all bills, with populated:

- `items`
- `items.approvedBy`
- `createdBy`

Current implementation does not restrict non-admin users to their own bills on this list route.

### `POST /api/bills`

Auth + Racuni access required.

JSON or multipart request.

JSON body:

```json
{
  "title": "string",
  "description": "string",
  "dobavljac": "KAMEN - PSUNJ d.o.o.|MOLARIS d.o.o.|VELIČKI KAMEN d.o.o.",
  "itemIds": ["itemId1", "itemId2"]
}
```

Multipart fields:

- `title`
- `description` optional
- `dobavljac`
- `itemIds` as JSON string array or comma-separated list
- `billPdf` optional PDF attachment

Rules:

- at least one item is required
- all item IDs must exist
- non-admin can attach only items they created

Response: created bill with populated items and creator.

### `GET /api/bills/:id`

Auth + Racuni access required.

Rules:

- admin can read any bill
- non-admin can read only bills they created

### `GET /api/bills/:id/zip`

Auth + Racuni access required.

Rules:

- same access rule as single bill

Behavior:

- downloads the bill attachment PDF if present
- downloads every linked item `pdfUrl`
- generates an extra PDF summary of bill items and approval photos
- returns a ZIP file

Success headers:

- `Content-Type: application/zip`
- `Content-Disposition: attachment; filename="<sanitized>.zip"`

Possible error:

- `404 { "message": "No PDFs to download" }`
- `502 { "message": "Unable to fetch PDFs for zipping" }`

## Transport Requests API

All routes require auth plus `canAccessPrijevoz = true`, unless explicitly stricter.

### `POST /api/transport-requests`

Admin + `canAccessPrijevoz` required.

Request body:

```json
{
  "kamenolom": "VELIČKI KAMEN VELIČANKA",
  "gradiliste": "RN123",
  "brojKamiona": 3,
  "prijevozNaDan": "13/03/2026",
  "isplataPoT": 12.5,
  "assignedTo": "All"
}
```

`assignedTo` may also be an array of user IDs.

Success response:

```json
{
  "message": "Transport request created successfully",
  "transportRequest": { "...": "TransportRequest" }
}
```

### `GET /api/transport-requests`

Any user with `canAccessPrijevoz`.

Returns all transport requests sorted by newest first.

Important: current implementation does not filter by `assignedTo`; every prijevoz-enabled user can see every request.

### `GET /api/transport-requests/:id`

Any user with `canAccessPrijevoz`.

Returns single transport request.

### `PUT /api/transport-requests/:id`

Admin + `canAccessPrijevoz`.

Request body:

```json
{
  "kamenolom": "VELIČKI KAMEN VELIČANKA",
  "gradiliste": "RN123",
  "brojKamiona": 3,
  "prijevozNaDan": "13/03/2026",
  "isplataPoT": 12.5,
  "status": "Aktivno"
}
```

Important: `assignedTo` cannot be updated through this endpoint.

### `PATCH /api/transport-requests/:id/status`

Admin + `canAccessPrijevoz`.

Request body:

```json
{
  "status": "Aktivno|Neaktivno"
}
```

### `DELETE /api/transport-requests/:id`

Admin + `canAccessPrijevoz`.

Response:

```json
{
  "message": "Transport request deleted successfully"
}
```

### `POST /api/transport-requests/:id/accept`

Any user with `canAccessPrijevoz`.

Request body:

```json
{
  "count": 2
}
```

Rules:

- `count >= 1`
- cannot exceed current `brojKamiona`
- request transport date must not be in the past
- user cannot accept the same request again if they already have an approved acceptance that is not fully delivered

Response:

```json
{
  "message": "Transport request acceptance submitted successfully",
  "acceptance": { "...": "TransportAcceptance" }
}
```

### `GET /api/transport-requests/acceptances/my`

Any user with `canAccessPrijevoz`.

Returns current user’s acceptances with populated:

- `userId`
- `requestId`
- `reviewedBy`

Additional computed fields:

- `ukupnaIsplata`
- `deliveredCount`

### `GET /api/transport-requests/acceptances/user/:userId`

Admin + `canAccessPrijevoz`.

Returns all acceptances for one transporter/user, with computed `ukupnaIsplata`.

### `GET /api/transport-requests/acceptances/pending`

Admin + `canAccessPrijevoz`.

Returns pending acceptances with populated `userId` and full `requestId`.

### `PATCH /api/transport-requests/acceptances/:acceptanceId`

Admin + `canAccessPrijevoz`.

Request body:

```json
{
  "status": "approved|declined"
}
```

Behavior:

- only works for `pending` acceptances
- `declined` deletes the acceptance record
- `approved` marks review fields and subtracts `acceptedCount` from request `brojKamiona`

### `PATCH /api/transport-requests/acceptances/:acceptanceId/payment`

Admin + `canAccessPrijevoz`.

Request body:

```json
{
  "paymentStatus": "Plaćeno|Nije plaćeno"
}
```

Response includes populated acceptance.

### `GET /api/transport-requests/:id/acceptances`

Any user with `canAccessPrijevoz`.

Rules:

- admin sees all acceptances for the request
- non-admin sees only their own acceptances for that request

Computed field:

- `ukupnaIsplata`

### `GET /api/transport-requests/:id/delivered-count`

Auth required.

Current implementation does not check `canAccessPrijevoz`, although the route belongs to the prijevoz module.

Response:

```json
{
  "delivered": 4,
  "total": 6
}
```

`total` is the sum of `acceptedCount` across approved acceptances. `delivered` is the count of approved items linked to those acceptances.

## Groups API

All routes require auth. Admin only.

### `GET /api/groups`

Returns groups populated with:

- `users`
- `createdBy`

### `POST /api/groups`

Request body:

```json
{
  "name": "string"
}
```

Response: created group.

### `PUT /api/groups/:id`

Request body:

```json
{
  "name": "string"
}
```

Response: updated group.

### `PATCH /api/groups/:id/users`

Request body:

```json
{
  "userIds": ["user1", "user2"]
}
```

Response: updated group.

### `DELETE /api/groups/:id`

Response:

```json
{
  "message": "Group deleted successfully"
}
```

## Code Locations API

### `GET /api/code-locations`

Auth required.

Returns all code locations sorted by `code`.

### `POST /api/code-locations`

Auth required. Admin only.

Request body:

```json
{
  "code": "RN123",
  "latitude": 45.0,
  "longitude": 18.0
}
```

Behavior:

- if the code already exists, this route updates the existing record and returns `200`
- otherwise creates a new record and returns `201`

### `PUT /api/code-locations/:id`

Auth required. Admin only.

Request body:

```json
{
  "latitude": 45.0,
  "longitude": 18.0
}
```

### `DELETE /api/code-locations/:id`

Auth required. Admin only.

Response:

```json
{
  "message": "Code location deleted successfully"
}
```

## Socket.IO Events

The backend emits these events:

- `transport:created` with `{ transportRequest }`
- `transport:updated` with `{ transportRequest }` or `{ requestId }`
- `transport:deleted` with `{ id }`
- `acceptance:updated` with `{ acceptance }` or decline payload
- `item:approved` with `{ itemId }`

Payload shape is not fully stable because different code paths emit different object structures for the same event name.

## Important Implementation Notes For Android

### Date handling

- Item `creationDate` and `approvalDate` come back as Croatian-formatted strings, not ISO timestamps.
- Transport request `prijevozNaDan` is stored as free-form string but current logic expects `DD/MM/YYYY`.

### File uploads

- Item approval photos and PDF approvals must use multipart form upload.
- Bill attachment upload must use multipart form upload with `billPdf`.

### Access model

- Item visibility is not just role-based; it depends heavily on `codes` and `hasFullAccess`.
- Android should persist both role and flags returned by login.

### Recommended client assumptions

- treat unknown fields as possible
- do not rely on ISO date strings for item dates
- do not assume populated references are consistent across endpoints
- do not assume `assignedTo` is enforced server-side

## Potential Problems In Current API / Data Setup

### 1. Client/server contract drift already exists

- Web client calls `PATCH /api/users/:id/access`, but this route does not exist.
- Web client expects paginated users from `GET /api/users?pagination...`, but backend ignores those params and returns a plain array.

Android should avoid copying those assumptions.

### 2. `inTransitOnly` filter is broken

- The items query sets `query.inTransit = true`, but the actual field is `in_transit`.
- Any client using this filter will get incorrect results.

### 3. Date serialization is API-hostile

- Item model converts dates to localized display strings in API output.
- This is convenient for UI rendering, but poor for machine clients, sorting, offline sync, and Android parsing.

Recommendation:

- add raw ISO fields or stop formatting dates at model serialization level

### 4. Duplicate code policy is inconsistent

- `POST /api/items/validate-code` checks uniqueness
- `PATCH /api/items/:id/code` explicitly allows duplicates

That means the validation endpoint cannot be trusted as a real constraint.

### 5. Item creation can delete an existing item by title

- `POST /api/items` deletes an older item if the same `title` already exists.
- This is dangerous for auditability and can silently destroy approval history and attachments.

### 6. Transport request assignment is not enforced

- Requests have `assignedTo`, but list/read/accept routes do not filter by it.
- As implemented, any prijevoz-enabled user can see and accept every request.

### 7. Bills list access is broader than bill detail access

- `GET /api/bills` returns all bills to any user with Racuni access.
- `GET /api/bills/:id` restricts non-admin users to their own bill.

This is inconsistent and likely a data exposure bug.

### 8. Mixed reference population makes schema unstable

- The same field may be an ID in one response and a populated object in another.
- `transportAcceptanceId`, `userId`, `requestId`, `createdBy`, `approvedBy`, `paidBy` all vary by endpoint.

Recommendation:

- document endpoint-specific shapes carefully or standardize response DTOs

### 9. Localized enum values are embedded in persistence and API

- Examples: `na čekanju`, `odobreno`, `odbijen`, `Plaćeno`, `Nije plaćeno`, `Aktivno`, `Neaktivno`

This is workable, but harder for companion apps and future localization.

Recommendation:

- keep stable machine enums internally and localize only in UI

### 10. Data retention runs on live API requests

- On every `/api/*` request, item cleanup can run.
- Cleanup is triggered specifically when `req.path.includes('/api/items')`, but inside `app.use('/api', ...)` the path is usually relative, so this may not behave as intended.
- Even if corrected, running deletion inside request flow is not ideal.

Recommendation:

- move retention to a scheduled job

### 11. Transport request date is stored as string

- Acceptance logic parses `prijevozNaDan` manually as `DD/MM/YYYY`.
- Any format drift will break acceptance validation.

Recommendation:

- store a real `Date` or normalized ISO date string

### 12. There is at least one legacy/invalid item update path

- `PATCH /api/items/:id` writes `approvalPhoto`, which is not part of the model.
- This suggests an outdated route contract remains in production.

Recommendation:

- deprecate or fix this route before Android uses it


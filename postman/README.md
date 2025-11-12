# Postman Collection for Cadence Backend API

🚀 **Auto-generated** Postman collection for testing the Cadence Backend API.

This collection is **dynamically generated** by scanning route files - no manual maintenance required!

## 🔄 Generate/Update Collection

Whenever you create new modules or modify routes, regenerate the collection:

```bash
npm run genPostman
```

This command:
- ✅ Scans all modules in `src/app/modules/`
- ✅ Extracts routes from `*.routes.ts` files automatically
- ✅ Detects authentication requirements (auth middleware)
- ✅ Generates sample request bodies
- ✅ Creates test scripts for validation

**When to regenerate:**
- After creating new modules with `npm run cModule`
- After adding/modifying routes in existing modules
- Before sharing API documentation with your team

## 📦 Files

- `Cadence_Backend_API.postman_collection.json` - Main API collection
- `Local.postman_environment.json` - Local development environment
- `Production.postman_environment.json` - Production environment

## 🚀 Quick Start

### Import to Postman

1. **Open Postman**
2. Click **Import** button (top left)
3. Drag and drop all 3 JSON files or select them
4. Click **Import**

### Select Environment

1. Click the environment dropdown (top right)
2. Select **Cadence Backend - Local** for development
3. Select **Cadence Backend - Production** for production testing

## 📋 Collection Structure

```
Cadence Backend API
├── Auth (7 requests)
│   ├── Register
│   ├── Login
│   ├── Send OTP
│   ├── Verify OTP
│   ├── Forgot Password
│   ├── Reset Password
│   └── Change Password
├── Users (6 requests)
│   ├── Get All Users
│   ├── Get User Profile
│   ├── Get User by ID
│   ├── Update User
│   ├── Delete User
│   └── Update FCM Token
├── Search (3 requests)
│   ├── Global Search
│   ├── Search Services
│   └── Autocomplete
├── Uploads (2 requests)
│   ├── Upload Single File
│   └── Upload Multiple Files
├── Notifications (5 requests)
│   ├── Get All Notifications
│   ├── Get Unread Notifications
│   ├── Mark as Read
│   ├── Mark All as Read
│   └── Delete Notification
├── Payments (3 requests)
│   ├── Create Payment Intent
│   ├── Create Connect Account
│   └── Get Payment History
├── Webhooks (1 request)
│   └── Stripe Webhook
└── Health Checks (4 requests)
    ├── Basic Health Check
    ├── Detailed Health Check
    ├── Liveness Probe
    └── Readiness Probe
```

## 🔑 Authentication

### Automatic Token Management

The collection includes **automatic token management**:

1. **Login** or **Register** request automatically saves the JWT token
2. All authenticated requests use the saved token
3. No need to manually copy/paste tokens

### How it works

After successful login/register, the following script runs:
```javascript
const response = pm.response.json();
pm.environment.set('token', response.data.token);
pm.environment.set('userId', response.data.user.id);
```

## 📝 Environment Variables

### Local Environment
```json
{
  "base_url": "http://localhost:5000",
  "token": "",
  "userId": ""
}
```

### Production Environment
```json
{
  "base_url": "https://api.yourproduction.com",
  "token": "",
  "userId": ""
}
```

## 🔄 Usage Flow

### 1. Register or Login
```
POST /api/auth/register
POST /api/auth/login
```
✅ Token automatically saved

### 2. Make Authenticated Requests
All requests use `{{token}}` variable automatically:
```
Authorization: Bearer {{token}}
```

### 3. Use Dynamic Variables
```
GET /api/users/{{userId}}
```

## 🧪 Testing

### Global Test Scripts

All requests include automatic tests:

```javascript
// Response time check
pm.test('Response time is less than 2000ms', function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});

// Status code check
pm.test('Status code is successful', function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);
});
```

### Run Collection Tests

1. Click **Collections** → **Cadence Backend API**
2. Click **Run** button
3. Select requests to test
4. Click **Run Cadence Backend API**

## 📊 Collection Features

### ✅ Complete Coverage
- 31 API endpoints
- All authentication flows
- All CRUD operations
- File uploads
- Search functionality
- Health checks

### ✅ Auto Token Management
- Login/Register saves token
- All requests use saved token
- No manual token handling

### ✅ Environment Variables
- Easy switching between local/production
- Configurable base URL
- Secure token storage

### ✅ Request Examples
- Sample request bodies
- Query parameters
- Headers configuration

### ✅ Test Scripts
- Automatic response validation
- Performance testing
- Status code checking

## 🔍 Search Examples

### Global Search
```
GET {{base_url}}/api/search?query=john&type=users&limit=10
```

### Service Search with Filters
```
GET {{base_url}}/api/search/services?query=cleaning&minPrice=50&maxPrice=200&sortBy=price&sortOrder=asc
```

### Autocomplete
```
GET {{base_url}}/api/search/autocomplete?query=jo&type=services&limit=5
```

## 📤 File Upload

### Single File
```
POST {{base_url}}/api/upload/single
Content-Type: multipart/form-data

Body:
- file: [Select file]
```

### Multiple Files
```
POST {{base_url}}/api/upload/multiple
Content-Type: multipart/form-data

Body:
- files: [Select multiple files]
```

## 🏥 Health Checks

### Basic Health
```
GET {{base_url}}/health
Response: { "status": "OK", "timestamp": "2025-10-23..." }
```

### Detailed Health
```
GET {{base_url}}/health/detailed
Response: {
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "memory": { ... },
  "uptime": 12345
}
```

## 🎯 Tips

### 1. Quick Testing
- Select a folder → Click **Run**
- Test entire folder at once
- View results in **Test Results** tab

### 2. Environment Switching
- Cmd/Ctrl + E → Switch environment
- Changes `{{base_url}}` automatically

### 3. Request History
- View recent requests in sidebar
- Repeat requests quickly

### 4. Pre-request Scripts
- Add custom logic before requests
- Set dynamic variables
- Calculate signatures

### 5. Collection Variables
- Use `{{variable_name}}` in any field
- URL, Headers, Body, etc.

## 🔒 Security Notes

⚠️ **Never commit tokens to git**
- `.gitignore` includes `*.postman_environment.json`
- Keep production tokens secure
- Use separate environments for dev/staging/prod

## 📚 Additional Resources

- [Postman Documentation](https://learning.postman.com/)
- [API Documentation](../README.md)
- [Swagger UI](http://localhost:5000/api-docs)

## 🐛 Troubleshooting

### Token not saving
1. Check login response format
2. Verify test script in Login request
3. Check environment is selected

### 401 Unauthorized
1. Ensure you're logged in
2. Check token in environment
3. Token might be expired (login again)

### Base URL issues
1. Verify environment is selected
2. Check `base_url` variable
3. Ensure server is running

## 📞 Support

For issues or questions:
1. Check API logs: `logs/combined.log`
2. Test with Swagger: `http://localhost:5000/api-docs`
3. Review health checks: `/health/detailed`

---

**Last Updated**: October 23, 2025
**Collection Version**: 3.0.0
**Total Endpoints**: 31

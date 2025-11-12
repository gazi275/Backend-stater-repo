# Dynamic Postman Collection Generation

## 🎯 Overview

The Cadence backend now includes **automatic Postman collection generation** that scans your route files and creates a complete API documentation without any manual configuration!

## ✨ Key Features

### 1. **Fully Dynamic - Zero Maintenance**
- ✅ Automatically scans `src/app/modules/` directory
- ✅ Detects all `*.routes.ts` files  
- ✅ Extracts routes using intelligent regex patterns
- ✅ No hardcoded configurations to maintain
- ✅ Works immediately when you create new modules

### 2. **Intelligent Detection**
- 📡 **HTTP Methods**: GET, POST, PUT, PATCH, DELETE
- 🔐 **Authentication**: Auto-detects `auth()` middleware
- 📝 **Request Bodies**: Generates sample payloads based on route paths
- 🔍 **Multi-line Support**: Handles routes spread across multiple lines
- 🎯 **Smart Naming**: Generates human-readable request names

### 3. **Complete Postman Features**
- 🔑 Bearer token authentication (JWT)
- ✅ Auto-save tokens from login/register responses
- 🧪 Test scripts for validation
- 🌍 Environment variables (Local & Production)
- 📊 Request/response logging

## 🚀 Usage

### Generate Collection

```bash
npm run genPostman
```

**Output:**
```
🚀 Scanning routes dynamically from src/app/modules/...

📂 Found 8 modules: auth, health, notifications, payment, search, upload, user, webhook
   ✅ auth: 7 routes found
   ✅ health: 4 routes found
   ✅ notifications: 4 routes found
   ✅ payment: 4 routes found
   ✅ search: 3 routes found
   ✅ upload: 1 routes found
   ✅ user: 4 routes found

📊 Summary:
   - Total modules: 8
   - Total routes: 31

✅ Postman collection generated successfully!
   📁 Output: postman/Cadence_Backend_API.postman_collection.json
   📊 Total folders: 8
   📊 Total requests: 31
```

### Import to Postman

1. Open Postman Desktop/Web
2. Click **Import** button
3. Select `postman/Cadence_Backend_API.postman_collection.json`
4. Import environment files:
   - `postman/Local.postman_environment.json`
   - `postman/Production.postman_environment.json`
5. Select environment from dropdown (top-right)
6. Start testing! 🎉

## 🔧 How It Works

### 1. Module Scanning

```javascript
function scanModules() {
  // Reads src/app/modules/ directory
  // Finds all subdirectories
  // Looks for *.routes.ts files
  // Returns array of module metadata
}
```

### 2. Route Extraction

```javascript
function extractRoutesFromFile(filePath) {
  // Reads route file content
  // Removes comments
  // Applies regex patterns for each HTTP method
  // Detects auth() middleware in context
  // Returns array of route objects
}
```

**Regex Patterns (Multi-line Support):**
```javascript
const patterns = [
  { method: 'GET', regex: /(?:router|route)\.get\s*\(\s*['"]([^'"]+)['"]/gi },
  { method: 'POST', regex: /(?:router|route)\.post\s*\(\s*['"]([^'"]+)['"]/gi },
  // ... PUT, PATCH, DELETE
];
```

### 3. Request Generation

```javascript
function generateRequestFromRoute(module, route) {
  // Builds Postman request object
  // Adds authentication if route.auth === true
  // Generates sample body for POST/PUT/PATCH
  // Creates test scripts
  // Returns complete request object
}
```

## 📝 Workflow Integration

### When Creating New Module

```bash
# 1. Create new module
npm run cModule

# Enter module name: booking

# 2. Define routes in src/app/modules/booking/booking.routes.ts
route.post('/create', auth(Role.USER), bookingController.create);
route.get('/:id', auth(Role.USER), bookingController.getById);

# 3. Regenerate Postman collection
npm run genPostman

# ✅ New booking routes automatically included!
```

### CI/CD Integration

Add to your pipeline to keep documentation updated:

```yaml
# .github/workflows/docs.yml
- name: Generate API Documentation
  run: |
    npm run genPostman
    git add postman/
    git commit -m "docs: update Postman collection [skip ci]"
    git push
```

## 🎨 Sample Bodies

The generator creates intelligent sample bodies based on route paths:

| Route Path Contains | Generated Body |
|---------------------|----------------|
| `login` | `{ email, password }` |
| `register` | `{ name, email, password, role }` |
| `otp` | `{ email, otp }` |
| `password` | `{ oldPassword, newPassword }` |
| `upload`/`image` | Form-data with file field |
| Default | `{ /* Add your data here */ }` |

## 🔐 Authentication Detection

Routes are marked as authenticated if they contain `auth()` middleware:

```typescript
// ✅ Detected as authenticated
route.get('/profile', auth(Role.USER), controller.getProfile);

// ❌ Not authenticated
route.post('/login', controller.login);
```

## 🌟 Benefits

### For Developers
- ⚡ **Instant Documentation**: No manual Postman request creation
- 🔄 **Always Up-to-Date**: Regenerate in seconds
- 🎯 **Accurate**: Directly reflects code structure
- 🚀 **Fast Onboarding**: New devs get complete API collection

### For Teams
- 📚 **Standardized Docs**: Same format across all modules
- 🤝 **Easy Sharing**: Single JSON file to share
- 🔍 **Discoverability**: All endpoints visible in Postman
- ✅ **Testing**: Ready-to-use test scripts included

### For DevOps
- 🤖 **Automation**: Integrate into CI/CD
- 📊 **Monitoring**: Use for API health checks
- 🧪 **Validation**: Automated endpoint testing

## 📊 Statistics

**Current Generation:**
- 📂 **Modules Scanned**: 8
- 🔗 **Routes Detected**: 31
- 📁 **Folders Created**: 8
- 🎯 **Requests Generated**: 31
- ⚡ **Generation Time**: < 1 second

## 🔮 Future Enhancements

Potential improvements:

1. **Schema-Based Bodies**: 
   - Parse Zod validation schemas
   - Generate accurate request examples

2. **Response Examples**:
   - Add sample response bodies
   - Multiple response scenarios

3. **Advanced Tests**:
   - Schema validation tests
   - Relationship tests (token flow)

4. **GraphQL Support**:
   - Detect GraphQL resolvers
   - Generate GraphQL requests

5. **OpenAPI Export**:
   - Convert to OpenAPI 3.0 spec
   - Generate Swagger UI from routes

## 📚 Related Commands

| Command | Purpose |
|---------|---------|
| `npm run cModule` | Create new module with templates |
| `npm run genDoc` | Generate Swagger documentation |
| `npm run genPostman` | Generate Postman collection (this feature) |

## 🐛 Troubleshooting

**Q: Routes not being detected?**
- ✅ Ensure route file is named `*.routes.ts` or `*.route.ts`
- ✅ Check that router variable is named `router` or `route`
- ✅ Verify routes use standard Express syntax

**Q: Auth not detected?**
- ✅ Middleware must be named exactly `auth(`
- ✅ Check surrounding code context (500 chars before/after)

**Q: Collection not updating?**
- ✅ Run `npm run genPostman` after route changes
- ✅ Re-import collection in Postman
- ✅ Check console output for errors

## 📄 Files Modified

- `scripts/generatePostmanCollection.js` - Main generator script
- `package.json` - Added `genPostman` script
- `postman/README.md` - Updated documentation
- `README.md` - Added command reference

## 💡 Example Output

Generated Postman request for:
```typescript
route.post('/login', validateRequest(validation), controller.login);
```

Becomes:
```json
{
  "name": "Post Login",
  "request": {
    "method": "POST",
    "header": [
      { "key": "Content-Type", "value": "application/json" }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"password123\"\n}"
    },
    "url": {
      "raw": "{{base_url}}/api/auth/login",
      "host": ["{{base_url}}"],
      "path": ["api", "auth", "login"]
    }
  },
  "event": [
    {
      "listen": "test",
      "script": {
        "exec": [
          "pm.test('Status code is 200 or 201', function () {",
          "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
          "});",
          "// Auto-save token logic..."
        ]
      }
    }
  ]
}
```

## 🎉 Conclusion

The dynamic Postman collection generator eliminates manual documentation work and keeps your API documentation always synchronized with your code. Just run `npm run genPostman` whenever you make changes!

**Questions?** Check the main README or postman/README.md for more details.

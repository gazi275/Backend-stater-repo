/**
 * Dynamic Postman Collection Generator for Cadence Backend
 * 
 * This script automatically scans your route files and generates a Postman collection.
 * No need to manually maintain route configurations!
 * 
 * Usage: npm run genPostman
 * 
 * Features:
 * - Automatically detects all modules in src/app/modules/
 * - Extracts routes from *.routes.ts files using regex
 * - Detects auth() middleware automatically
 * - Generates sample request bodies
 * - Creates test scripts for each request
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROUTES_DIR = path.join(__dirname, '../src/app/modules');
const OUTPUT_DIR = path.join(__dirname, '../postman');
const BASE_URL = 'http://localhost:5000';

// Regex patterns to detect route definitions
// Matches both 'router' and 'route' variable names
const METHOD_PATTERNS = {
  get: /(?:router|route)\.get\(['"]([^'"]+)['"]/g,
  post: /(?:router|route)\.post\(['"]([^'"]+)['"]/g,
  put: /(?:router|route)\.put\(['"]([^'"]+)['"]/g,
  patch: /(?:router|route)\.patch\(['"]([^'"]+)['"]/g,
  delete: /(?:router|route)\.delete\(['"]([^'"]+)['"]/g,
};

/**
 * Scan modules directory and detect all route files
 */
function scanModules() {
  const modules = [];
  
  if (!fs.existsSync(ROUTES_DIR)) {
    console.warn(`⚠️  Modules directory not found: ${ROUTES_DIR}`);
    return modules;
  }

  const moduleDirs = fs.readdirSync(ROUTES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`📂 Found ${moduleDirs.length} modules:`, moduleDirs.join(', '));

  moduleDirs.forEach(moduleName => {
    const modulePath = path.join(ROUTES_DIR, moduleName);
    
    // Look for route files (.routes.ts, .route.ts, etc.)
    const files = fs.readdirSync(modulePath);
    const routeFile = files.find(f => 
      f.includes('route') && (f.endsWith('.ts') || f.endsWith('.js'))
    );

    if (routeFile) {
      const routeFilePath = path.join(modulePath, routeFile);
      const routes = extractRoutesFromFile(routeFilePath);
      
      if (routes.length > 0) {
        // Determine base path based on module name
        let basePath = `/api/${moduleName}`;
        
        // Handle special cases
        if (moduleName === 'user') basePath = '/api/users';
        if (moduleName === 'auth') basePath = '/api/auth';
        if (moduleName === 'upload' || moduleName === 'Upload') basePath = '/api/upload';
        if (moduleName === 'search') basePath = '/api/search';
        if (moduleName === 'notification' || moduleName === 'notifications') basePath = '/api/notifications';
        if (moduleName === 'payment') basePath = '/api/payment';
        if (moduleName === 'webhook') basePath = '/api/webhook';
        
        modules.push({
          name: moduleName,
          displayName: capitalizeWords(moduleName),
          routes: routes,
          basePath: basePath,
        });
        console.log(`   ✅ ${moduleName}: ${routes.length} routes found`);
      }
    }
  });

  return modules;
}

/**
 * Extract routes from a route file using regex
 */
function extractRoutesFromFile(filePath) {
  // Read file with original content for comment extraction
  const originalContent = fs.readFileSync(filePath, 'utf-8');
  
  // Create a cleaned version for route matching
  let content = originalContent;
  
  const routes = [];
  const seenRoutes = new Set(); // Prevent duplicates
  const duplicateWarnings = []; // Track duplicate routes

  // More flexible regex patterns that handle multi-line route definitions
  const patterns = [
    { method: 'GET', regex: /(?:router|route)\.get\s*\(\s*['"]([^'"]+)['"]/gi },
    { method: 'POST', regex: /(?:router|route)\.post\s*\(\s*['"]([^'"]+)['"]/gi },
    { method: 'PUT', regex: /(?:router|route)\.put\s*\(\s*['"]([^'"]+)['"]/gi },
    { method: 'PATCH', regex: /(?:router|route)\.patch\s*\(\s*['"]([^'"]+)['"]/gi },
    { method: 'DELETE', regex: /(?:router|route)\.delete\s*\(\s*['"]([^'"]+)['"]/gi },
  ];

  patterns.forEach(({ method, regex }) => {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const routePath = match[1];
      const routeKey = `${method}:${routePath}`;
      
      // Check for duplicate routes (same path, different method is OK)
      if (seenRoutes.has(routeKey)) {
        duplicateWarnings.push(`⚠️  Duplicate route: ${method} ${routePath}`);
        continue;
      }
      seenRoutes.add(routeKey);
      
      // Extract description from comment above route
      const description = extractRouteDescription(originalContent, match.index);
      
      // Check if route requires authentication
      const beforeRoute = content.substring(Math.max(0, match.index - 500), match.index);
      const afterRoute = content.substring(match.index, Math.min(content.length, match.index + match[0].length + 500));
      const contextLine = beforeRoute + afterRoute;
      const hasAuth = contextLine.includes('auth(');
      
      // Extract role if auth is present
      const role = hasAuth ? extractRole(contextLine) : null;
      
      // Extract validation schema reference
      const validationSchema = extractValidationSchema(contextLine);
      
      routes.push({
        method: method,
        path: routePath,
        name: generateRouteName(method.toLowerCase(), routePath),
        description: description,
        auth: hasAuth,
        role: role,
        validationSchema: validationSchema,
      });
    }
  });

  // Log duplicate warnings
  if (duplicateWarnings.length > 0) {
    console.log(`   ${duplicateWarnings.join('\n   ')}`);
  }

  return routes;
}

/**
 * Extract description from comment above route
 */
function extractRouteDescription(content, routeIndex) {
  // Get content before the route (up to 200 chars)
  const before = content.substring(Math.max(0, routeIndex - 200), routeIndex);
  
  // Look for comments
  const singleLineComment = /\/\/\s*(.+)$/m.exec(before);
  const multiLineComment = /\/\*\*?\s*\n?\s*\*?\s*(.+?)\s*\*?\s*\*\//s.exec(before);
  
  if (multiLineComment) {
    return multiLineComment[1].replace(/\n\s*\*\s*/g, ' ').trim();
  }
  if (singleLineComment) {
    return singleLineComment[1].trim();
  }
  
  return null;
}

/**
 * Extract role from auth middleware
 */
function extractRole(contextLine) {
  const roleMatch = /auth\s*\(\s*Role\.(\w+)/i.exec(contextLine);
  return roleMatch ? roleMatch[1] : null;
}

/**
 * Extract validation schema reference
 */
function extractValidationSchema(contextLine) {
  const validationMatch = /validateRequest\s*\(\s*(\w+)\.(\w+)\s*\)/i.exec(contextLine);
  if (validationMatch) {
    return `${validationMatch[1]}.${validationMatch[2]}`;
  }
  return null;
}

/**
 * Generate human-readable route name from method and path
 */
function generateRouteName(method, path) {
  // Remove leading/trailing slashes
  let cleanPath = path.replace(/^\/|\/$/g, '');
  
  // Handle empty path (root)
  if (!cleanPath) {
    return method === 'get' ? 'Get All' : capitalizeFirst(method);
  }

  // Replace path params with descriptive names
  cleanPath = cleanPath.replace(/:id/g, 'by ID');
  cleanPath = cleanPath.replace(/:(\w+)/g, 'by $1');
  
  // Split by / and -
  const words = cleanPath.split(/[\/\-_]/).filter(Boolean);
  
  // Generate name based on method and path
  const pathName = words.map(w => capitalizeFirst(w)).join(' ');
  const methodName = capitalizeFirst(method);
  
  return `${methodName} ${pathName}`;
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Capitalize words (user -> User, user-profile -> User Profile)
 */
function capitalizeWords(str) {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Guess request body based on route path and validation schema
 */
function guessRequestBody(method, path, validationSchema, moduleName) {
  if (method === 'GET' || method === 'DELETE') {
    return null;
  }

  const isUpload = path.includes('upload') || path.includes('image') || path.includes('file');
  if (isUpload) {
    return {
      type: 'formdata',
      data: [
        { key: 'file', type: 'file', src: [], description: 'File to upload' },
        { key: 'data', value: '{"title": "Example"}', type: 'text', description: 'Additional metadata (JSON)' }
      ],
    };
  }

  // Try to load and parse validation schema from file
  if (validationSchema && moduleName) {
    const bodyFromSchema = parseValidationSchema(moduleName, validationSchema);
    if (bodyFromSchema) {
      return bodyFromSchema;
    }
  }

  // Default JSON bodies based on path patterns
  if (path.includes('login')) {
    return { 
      email: 'user@example.com', 
      password: 'password123' 
    };
  }
  if (path.includes('register') || path.includes('signup')) {
    return { 
      name: 'John Doe',
      email: 'user@example.com', 
      password: 'Password123!',
      role: 'USER'
    };
  }
  if (path.includes('otp') && path.includes('send')) {
    return { email: 'user@example.com' };
  }
  if (path.includes('otp') && path.includes('verify')) {
    return { email: 'user@example.com', otp: '123456' };
  }
  if (path.includes('password') && path.includes('change')) {
    return { 
      oldPassword: 'OldPass123!', 
      newPassword: 'NewPass123!' 
    };
  }
  if (path.includes('password') && path.includes('forgot')) {
    return { email: 'user@example.com' };
  }
  if (path.includes('password') && path.includes('reset')) {
    return { 
      email: 'user@example.com',
      otp: '123456',
      newPassword: 'NewPass123!' 
    };
  }
  if (path.includes('fcm') || path.includes('token')) {
    return { fcmToken: 'firebase_cloud_messaging_token' };
  }
  
  // Default empty object with hint
  return { 
    '// Note': 'Add your request data here based on API requirements'
  };
}

/**
 * Parse Zod validation schema from validation file
 */
function parseValidationSchema(moduleName, schemaRef) {
  try {
    const validationFilePath = path.join(ROUTES_DIR, moduleName, `${moduleName}.validation.ts`);
    
    if (!fs.existsSync(validationFilePath)) {
      return null;
    }

    const content = fs.readFileSync(validationFilePath, 'utf-8');
    
    // Extract the specific schema
    const schemaPattern = new RegExp(`${schemaRef.split('.')[1]}\\s*:\\s*z\\.object\\(\\{([\\s\\S]*?)\\}\\)`, 'i');
    const match = schemaPattern.exec(content);
    
    if (!match) return null;

    // Parse body schema if exists
    const bodyPattern = /body\s*:\s*z\.object\(\{([\s\S]*?)\}\)/i;
    const bodyMatch = bodyPattern.exec(match[1]);
    
    if (!bodyMatch) return null;

    // Extract fields from body schema
    const fields = bodyMatch[1];
    const body = {};
    
    // Match field definitions: email: z.string().email()
    const fieldRegex = /(\w+)\s*:\s*z\.(\w+)\(\)/g;
    let fieldMatch;
    
    while ((fieldMatch = fieldRegex.exec(fields)) !== null) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      
      // Generate example value based on type
      body[fieldName] = generateExampleValue(fieldName, fieldType);
    }
    
    return Object.keys(body).length > 0 ? body : null;
  } catch (error) {
    // Silently fail and use default body
    return null;
  }
}

/**
 * Generate example value based on field name and type
 */
function generateExampleValue(fieldName, fieldType) {
  // Based on field name
  if (fieldName.includes('email')) return 'user@example.com';
  if (fieldName.includes('password')) return 'Password123!';
  if (fieldName.includes('name')) return 'John Doe';
  if (fieldName.includes('phone')) return '+1234567890';
  if (fieldName.includes('age')) return 25;
  if (fieldName.includes('price')) return 99.99;
  if (fieldName.includes('url')) return 'https://example.com';
  if (fieldName.includes('token')) return 'sample_token_here';
  if (fieldName.includes('code') || fieldName.includes('otp')) return '123456';
  if (fieldName.includes('description')) return 'Sample description';
  if (fieldName.includes('title')) return 'Sample Title';
  if (fieldName.includes('role')) return 'USER';
  
  // Based on type
  if (fieldType === 'string') return 'sample_string';
  if (fieldType === 'number') return 123;
  if (fieldType === 'boolean') return true;
  if (fieldType === 'array') return [];
  if (fieldType === 'object') return {};
  
  return 'value';
}

/**
 * Detect query parameters from route path and generate examples
 */
function detectQueryParams(path) {
  const params = [];
  
  // Common query params based on path
  if (path === '/' || path === '') {
    // List endpoints usually have pagination and filters
    params.push(
      { key: 'page', value: '1', description: 'Page number' },
      { key: 'limit', value: '10', description: 'Items per page' },
      { key: 'sortBy', value: 'createdAt', description: 'Sort field' },
      { key: 'sortOrder', value: 'desc', description: 'Sort order (asc/desc)' }
    );
  }
  
  if (path.includes('search')) {
    params.push(
      { key: 'q', value: 'search term', description: 'Search query' },
      { key: 'page', value: '1', description: 'Page number' },
      { key: 'limit', value: '10', description: 'Items per page' }
    );
  }
  
  return params.length > 0 ? params : null;
}

/**
 * Replace path variables with Postman variable placeholders
 */
function replacePathVariablesWithPlaceholders(path, moduleName) {
  let processedPath = path;
  const variables = [];
  
  // Replace common path variables with descriptive placeholders
  const replacements = {
    ':id': `{{${moduleName}Id}}`,
    ':userId': '{{userId}}',
    ':bookingId': '{{bookingId}}',
    ':serviceId': '{{serviceId}}',
    ':categoryId': '{{categoryId}}',
    ':notificationId': '{{notificationId}}',
    ':paymentId': '{{paymentId}}',
    ':orderId': '{{orderId}}',
    ':reviewId': '{{reviewId}}',
  };
  
  Object.entries(replacements).forEach(([param, placeholder]) => {
    if (processedPath.includes(param)) {
      processedPath = processedPath.replace(param, placeholder);
      variables.push({
        key: placeholder.replace(/[{}]/g, ''),
        value: 'sample_id_here',
        description: `ID of the ${param.substring(1)}`
      });
    }
  });
  
  return { path: processedPath, variables };
}

/**
 * Generate UUID for collection ID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate Postman request object from detected route
 */
function generateRequestFromRoute(module, route) {
  // Process path variables
  const { path: processedPath, variables: pathVariables } = replacePathVariablesWithPlaceholders(route.path, module.name);
  const fullPath = `${module.basePath}${processedPath}`;
  
  // Detect query parameters
  const queryParams = detectQueryParams(route.path);
  
  const request = {
    name: route.name,
    request: {
      method: route.method,
      header: [
        {
          key: 'Content-Type',
          value: 'application/json',
          type: 'text',
        },
      ],
      url: {
        raw: `{{base_url}}${fullPath}`,
        host: ['{{base_url}}'],
        path: fullPath.split('/').filter(Boolean),
      },
    },
  };

  // Add description if available
  if (route.description) {
    request.request.description = route.description;
  }

  // Add path variables
  if (pathVariables && pathVariables.length > 0) {
    request.request.url.variable = pathVariables;
  }

  // Add query parameters
  if (queryParams) {
    request.request.url.query = queryParams;
    // Update raw URL with query params
    const queryString = queryParams.map(p => `${p.key}=${p.value}`).join('&');
    request.request.url.raw = `{{base_url}}${fullPath}?${queryString}`;
  }

  // Add authorization if required
  if (route.auth) {
    request.request.auth = {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{token}}', type: 'string' }],
    };
    
    // Add role info to description
    if (route.role) {
      const roleDesc = `\n\n**Required Role:** ${route.role}`;
      request.request.description = (request.request.description || '') + roleDesc;
    }
  }

  // Add request body for POST, PUT, PATCH
  if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
    const bodyData = guessRequestBody(route.method, route.path, route.validationSchema, module.name);
    
    if (bodyData?.type === 'formdata') {
      request.request.body = {
        mode: 'formdata',
        formdata: bodyData.data,
      };
      // Remove Content-Type header for formdata (Postman sets it automatically)
      request.request.header = [];
    } else if (bodyData) {
      request.request.body = {
        mode: 'raw',
        raw: JSON.stringify(bodyData, null, 2),
        options: { raw: { language: 'json' } },
      };
    }
  }

  // Add validation schema info to description
  if (route.validationSchema) {
    const schemaDesc = `\n\n**Validation Schema:** ${route.validationSchema}`;
    request.request.description = (request.request.description || '') + schemaDesc;
  }

  // Add comprehensive test scripts
  request.event = [
    {
      listen: 'test',
      script: {
        exec: [
          '// Status code validation',
          'pm.test("Status code is 200 or 201", function () {',
          '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
          '});',
          '',
          '// Response time validation',
          'pm.test("Response time is less than 2000ms", function () {',
          '    pm.expect(pm.response.responseTime).to.be.below(2000);',
          '});',
          '',
          '// Response structure validation',
          'pm.test("Response has success field", function () {',
          '    var jsonData = pm.response.json();',
          '    pm.expect(jsonData).to.have.property("success");',
          '});',
          '',
          '// Auto-save token from login/register',
          'if (pm.response.code === 200 && (pm.request.url.path.includes("login") || pm.request.url.path.includes("register"))) {',
          '    try {',
          '        var jsonData = pm.response.json();',
          '        if (jsonData.data && jsonData.data.token) {',
          '            pm.environment.set("token", jsonData.data.token);',
          '            console.log("✅ Token saved to environment!");',
          '        }',
          '        if (jsonData.data && jsonData.data.user && jsonData.data.user.id) {',
          '            pm.environment.set("userId", jsonData.data.user.id);',
          '            console.log("✅ User ID saved to environment!");',
          '        }',
          '    } catch (e) {',
          '        console.error("Failed to save token:", e);',
          '    }',
          '}',
          '',
          '// Auto-save resource ID from create operations',
          'if (pm.response.code === 201 && pm.response.json().data && pm.response.json().data.id) {',
          '    const resourceId = pm.response.json().data.id;',
          `    pm.environment.set("${module.name}Id", resourceId);`,
          `    console.log("✅ ${module.name} ID saved:", resourceId);`,
          '}',
        ],
        type: 'text/javascript',
      },
    },
  ];

  return request;
}

/**
 * Get color tag for module (for Postman visualization)
 */
function getModuleColor(moduleName) {
  const colors = {
    auth: '#FF6B6B',       // Red - Authentication
    user: '#4ECDC4',       // Teal - User management
    search: '#95E1D3',     // Light green - Search
    upload: '#F38181',     // Pink - File operations
    notification: '#AA96DA', // Purple - Notifications
    notifications: '#AA96DA',
    payment: '#FCBAD3',    // Light pink - Payments
    webhook: '#A8D8EA',    // Light blue - Webhooks
    health: '#90EE90',     // Light green - Health checks
    booking: '#FFD93D',    // Yellow - Bookings
    service: '#6BCB77',    // Green - Services
    category: '#4D96FF',   // Blue - Categories
  };
  
  return colors[moduleName.toLowerCase()] || '#95A5A6'; // Default gray
}

/**
 * Build Postman collection by scanning routes
 */
function buildCollection() {
  console.log('🚀 Scanning routes dynamically from src/app/modules/...\n');

  // Scan modules directory
  const scannedModules = scanModules();

  // Add health check routes manually (they're in app.ts, not in modules/)
  const healthModule = {
    name: 'health',
    displayName: 'Health & System',
    basePath: '',
    routes: [
      { 
        method: 'GET', 
        path: '/health', 
        name: 'Health Check', 
        description: 'Basic health check endpoint',
        auth: false 
      },
      { 
        method: 'GET', 
        path: '/health/db', 
        name: 'Database Health', 
        description: 'Check database connectivity',
        auth: false 
      },
      { 
        method: 'GET', 
        path: '/health/redis', 
        name: 'Redis Health', 
        description: 'Check Redis cache connectivity',
        auth: false 
      },
      { 
        method: 'GET', 
        path: '/health/queues', 
        name: 'Queue Health', 
        description: 'Check BullMQ message queues status',
        auth: true 
      },
    ],
  };

  const allModules = [...scannedModules, healthModule];

  console.log(`\n📊 Summary:`);
  console.log(`   - Total modules: ${allModules.length}`);
  console.log(`   - Total routes: ${allModules.reduce((sum, m) => sum + m.routes.length, 0)}\n`);

  // Build collection folders with enhanced metadata
  const items = allModules.map(module => {
    const folder = {
      name: module.displayName,
      item: module.routes.map(route => generateRequestFromRoute(module, route)),
      description: `${module.displayName} API endpoints\n\nBase Path: ${module.basePath}\nTotal Routes: ${module.routes.length}`,
    };
    
    // Add color tag (Postman will use this for visualization)
    folder.variable = [
      {
        key: '_postman_color',
        value: getModuleColor(module.name),
        type: 'string'
      }
    ];
    
    return folder;
  });

  const finalCollection = {
    info: {
      _postman_id: generateUUID(),
      name: 'Cadence Backend API',
      description: `🚀 **Auto-generated Postman Collection for Cadence Backend**

✨ This collection is **dynamically generated** by scanning route files in \`src/app/modules/\`.

🔄 **Regenerate anytime** when you add new modules:
\`\`\`bash
npm run genPostman
\`\`\`

📝 **Generated on:** ${new Date().toLocaleString()}

🔑 **Authentication:**
Most endpoints require a Bearer token. Login or register first to get a token, which will be automatically saved to the environment.

🌍 **Environments:**
- Import \`Local.postman_environment.json\` for local development
- Import \`Production.postman_environment.json\` for production testing

## Features

- ✅ Auto-detected routes from source code
- ✅ Smart request body generation
- ✅ Query parameter suggestions
- ✅ Path variable placeholders
- ✅ Auto-save tokens and IDs
- ✅ Comprehensive test scripts
- ✅ Role-based access info
- ✅ Validation schema references

## Modules (${allModules.length})

${allModules.map(m => `- **${m.displayName}** (${m.routes.length} routes)`).join('\n')}`,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: items,
    auth: {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{token}}', type: 'string' }],
    },
    event: [
      {
        listen: 'prerequest',
        script: {
          type: 'text/javascript',
          exec: [
            '// Global pre-request script',
            'console.log("📡 Request to:", pm.request.url.toString());',
            'console.log("🔑 Method:", pm.request.method);',
            '',
            '// Log auth token presence',
            'const token = pm.environment.get("token");',
            'if (token) {',
            '    console.log("� Using auth token:", token.substring(0, 20) + "...");',
            '} else if (pm.request.auth && pm.request.auth.type === "bearer") {',
            '    console.log("⚠️  No auth token found in environment");',
            '}',
            '',
            '// Add timestamp',
            'pm.request.headers.add({',
            '    key: "X-Request-Timestamp",',
            '    value: new Date().toISOString()',
            '});',
          ],
        },
      },
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            '// Global test script',
            'console.log("📊 Response status:", pm.response.code, pm.response.status);',
            'console.log("⏱️  Response time:", pm.response.responseTime + "ms");',
          ],
        },
      },
    ],
    variable: [
      { 
        key: 'base_url', 
        value: 'http://localhost:5000', 
        type: 'string',
        description: 'Base URL of the API server'
      },
      { 
        key: 'token', 
        value: '', 
        type: 'string',
        description: 'JWT authentication token (auto-saved after login)'
      },
      { 
        key: 'userId', 
        value: '', 
        type: 'string',
        description: 'Current user ID (auto-saved after login)'
      },
    ],
  };

  return finalCollection;
}

/**
 * Save collection to file
 */
function saveCollection() {
  const finalCollection = buildCollection();

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputPath = path.join(OUTPUT_DIR, 'Cadence_Backend_API.postman_collection.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalCollection, null, 2));

  console.log('✅ Postman collection generated successfully!');
  console.log(`   📁 Output: ${outputPath}`);
  console.log(`   📊 Total folders: ${finalCollection.item.length}`);
  console.log(`   📊 Total requests: ${finalCollection.item.reduce((sum, folder) => sum + folder.item.length, 0)}`);
  console.log('\n💡 Next steps:');
  console.log('   1. Open Postman Desktop or Web');
  console.log('   2. Click Import button');
  console.log('   3. Select the generated JSON file');
  console.log('   4. Import the environment files from postman/ directory');
  console.log('   5. Start testing your API! 🚀');
  console.log('\n🔄 When you create new modules with `npm run cModule`,');
  console.log('   just run `npm run genPostman` again to update the collection!\n');
}

// Run the generator
try {
  saveCollection();
} catch (error) {
  console.error('❌ Error generating collection:', error.message);
  console.error(error.stack);
  process.exit(1);
}

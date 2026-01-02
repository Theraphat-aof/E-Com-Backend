# E-Commerce Backend API 🛍️

Secure E-Commerce Backend dengan Node.js, Express, PostgreSQL, Socket.io, และ Stripe Integration

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Deployment](#deployment)

---

## ✨ Features

### ✅ Authentication & Authorization
- Google OAuth 2.0 integration
- JWT Token-based authentication
- Role-based access control (Admin/User)
- Secure password hashing with bcryptjs

### 🛒 E-Commerce
- Product management
- Shopping cart functionality
- Order processing with Stripe payment
- Order tracking with tracking numbers
- Inventory management

### 💬 Real-time Chat
- Socket.io for real-time messaging
- Admin-user communication
- Message history
- Typing indicators

### 🔒 Security
- Rate limiting on sensitive endpoints
- Input validation & sanitization
- SQL injection prevention (Parameterized queries)
- CORS configuration
- Security headers with Helmet
- Request size limiting

### 📊 Monitoring & Logging
- Audit logging for all actions
- Health check endpoint
- Server statistics
- Error tracking

### 🚀 DevOps
- GitHub Actions CI/CD pipeline
- Automated testing
- Code quality checks (ESLint)
- Database migrations
- PM2 production deployment

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js 5.x |
| **Database** | PostgreSQL 14+ |
| **Authentication** | JWT + Google OAuth |
| **Real-time** | Socket.io |
| **Payment** | Stripe |
| **Validation** | Express-validator |
| **Security** | Helmet, bcryptjs |
| **Testing** | Jest, Supertest |
| **Code Quality** | ESLint, Prettier |
| **Documentation** | Swagger/OpenAPI |
| **Deployment** | PM2 |

---

## 📦 Installation

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm or yarn

### Clone Repository
```bash
git clone https://github.com/yourusername/ecom-backend.git
cd ecom-backend/server
```

### Install Dependencies
```bash
npm install
```

### Create Environment File
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=ecommerce

# JWT
JWT_SECRET=your_super_secret_key_min_32_chars

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_key

# CORS
CORS_ORIGIN=http://localhost:5173,https://yourdomain.com
```

---

## 🗄️ Configuration

### Database Setup

```bash
# Create database
createdb ecommerce

# Run migrations
npm run migrate

# (Optional) Seed admin user
npm run seed
```

### Environment-specific Configs

**Development (.env)**
```env
NODE_ENV=development
DEBUG=true
```

**Testing (.env.test)**
```env
NODE_ENV=test
DB_NAME=test_db
```

**Production (.env.production)**
```env
NODE_ENV=production
DEBUG=false
CORS_ORIGIN=https://yourdomain.com
```

---

## 🚀 Running the Server

### Development Mode
```bash
npm run dev
```
Server runs at `http://localhost:3000`

### Production Mode
```bash
npm start
```

### Using PM2
```bash
pm2 start ecosystem.config.js --env production
pm2 logs ecom-api
pm2 monit
```

---

## 📚 API Documentation

### Interactive API Docs
```
http://localhost:3000/api-docs
```

### Main Endpoints

#### Authentication
```
POST /api/auth/google
  - Login with Google OAuth Token
  - Returns: JWT Token + User Info
```

#### Products
```
GET /api/products              - List all products
GET /api/products/:id          - Get product details
```

#### Orders
```
POST /api/orders/create-payment-intent  - Create Stripe Payment Intent
POST /api/orders/place-order            - Create new order
GET /api/orders/user/:userId            - Get user's orders
PATCH /api/orders/:id/status            - Update order status (Admin)
```

#### Chat
```
GET /api/chat/rooms                     - Get chat rooms list
GET /api/chat/history/:roomId           - Get chat messages
```

#### Admin
```
GET /api/admin/audit-logs               - View audit logs
GET /api/admin/orders                   - List all orders
PATCH /api/admin/orders/:id/status      - Update order status
```

#### Health
```
GET /api/health/health                  - Server health check
GET /api/health/stats                   - Server statistics
```

---

## 🔒 Security Best Practices

### ✅ Implemented
- [x] JWT authentication on protected routes
- [x] Role-based authorization (Admin/User)
- [x] Input validation with express-validator
- [x] SQL injection prevention (parameterized queries)
- [x] Rate limiting on auth endpoints
- [x] CORS with whitelist
- [x] Security headers with Helmet
- [x] Request size limits
- [x] Audit logging
- [x] HTTPS ready (use reverse proxy like Nginx)

### 🔐 Recommendations
1. **Always use HTTPS** in production
2. **Rotate JWT_SECRET** every 3 months
3. **Use environment variables** for sensitive data
4. **Monitor audit logs** regularly
5. **Keep dependencies updated** - Run `npm audit fix`
6. **Enable 2FA** for GitHub/Production access

---

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Generate Coverage Report
```bash
npm run test:coverage
```

### Linting

```bash
# Check code quality
npm run lint

# Auto-fix issues
npm run lint:fix

# Format code
npm run format
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

**Triggers:**
- Push to `main` or `develop` branch
- Pull requests

**Jobs:**
1. ✅ Run tests on PostgreSQL
2. ✅ Check code quality (ESLint)
3. ✅ Audit dependencies
4. ✅ Deploy to production (main branch only)

**View Pipeline:**
```
Repository → Actions → Latest Workflow
```

### Setup Production Deployment

See [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) for:
- Setting up GitHub Secrets
- SSH key generation
- Slack notifications

---

## 🚢 Deployment

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js --env production

# Save startup
pm2 startup
pm2 save

# Monitor
pm2 monit
pm2 logs ecom-api

# Restart/Stop
pm2 restart ecom-api
pm2 stop ecom-api
```

### Using Docker (Optional)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
docker build -t ecom-api:1.0 .
docker run -p 3000:3000 --env-file .env ecom-api:1.0
```

### Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 📝 Scripts

```json
{
  "start": "node server.js",                    # Start production server
  "dev": "nodemon server.js",                   # Start dev server with auto-reload
  "test": "jest",                               # Run tests
  "test:watch": "jest --watch",                 # Run tests in watch mode
  "test:coverage": "jest --coverage",           # Generate coverage report
  "lint": "eslint . --ext .js",                 # Check code quality
  "lint:fix": "eslint . --ext .js --fix",       # Auto-fix linting issues
  "format": "prettier --write .",               # Format code
  "format:check": "prettier --check .",         # Check formatting
  "migrate": "node scripts/migrate.js",         # Run database migrations
  "seed": "node scripts/seed-admin.js",         # Seed admin user
  "audit": "npm audit --production"             # Check vulnerabilities
}
```

---

## 🐛 Troubleshooting

### Database Connection Error
```
❌ Error: connect ECONNREFUSED 127.0.0.1:5432

✅ Solution:
- Check PostgreSQL is running: sudo service postgresql status
- Verify DB_HOST, DB_PORT in .env
- Create database: createdb ecommerce
```

### Migration Failed
```
❌ Error: relation "users" does not exist

✅ Solution:
- Run: npm run migrate
- Check migrations folder exists
- Verify database has correct permissions
```

### Port Already in Use
```
❌ Error: listen EADDRINUSE :::3000

✅ Solution:
- Kill process: lsof -ti:3000 | xargs kill -9
- Or change PORT in .env
```

### JWT Token Invalid
```
❌ Error: Invalid token

✅ Solution:
- Check JWT_SECRET in .env
- Verify token format: "Bearer <token>"
- Token may be expired (default 7 days)
```

---

## 📞 Support

- 📖 [Full Documentation](./docs)
- 🐛 [Report Issues](https://github.com/yourusername/ecom-backend/issues)
- 💬 [Discussions](https://github.com/yourusername/ecom-backend/discussions)

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

---

## 👥 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📊 Project Status

- ✅ Core API functionality
- ✅ Authentication & Authorization
- ✅ Security hardening
- ✅ Testing framework
- ✅ CI/CD pipeline
- 🔄 API versioning (v2 planned)
- 🔄 GraphQL support (planned)

---

**Last Updated:** January 2, 2026

Made with ❤️ for secure e-commerce solutions

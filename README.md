# 🎤 KadaiVoice

**Voice-first billing application for small shop suppliers**

Simple, accessible, and efficient way to record daily transactions using voice input.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+ (see `server/README-DATABASE.md`)

### Setup

1. **Clone and install dependencies**
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

2. **Configure database**
```bash
cd server

# Copy example .env
cp .env.example .env

# Edit .env with your PostgreSQL password
# DB_PASSWORD=your_postgres_password

# Create database and load schema
psql -U postgres -c "CREATE DATABASE kadaivoice;"
psql -U postgres -d kadaivoice -f schema.sql
```

3. **Start the application**
```bash
# Terminal 1: Start server
cd server
npm run dev

# Terminal 2: Start client
cd client
npm run dev
```

4. **Open browser**
- Navigate to `http://localhost:5174`
- Login with PIN: **1234**

---

## 📱 How to Use

### Single Tap: Voice Entry
1. Tap a shop card once
2. Voice overlay opens, mic starts automatically
3. Speak: "Product name, quantity, price"
   - Example: "Rice bag, 2, 1250"
4. Review the parsed entry
5. Confirm to save

### Double Tap: View Bill
1. Double-tap a shop card
2. Bill overlay shows all today's entries
3. Options:
   - 🖨️ Print
   - 📥 Download PDF
   - 📱 Share via WhatsApp

### Create Shop
- Tap "+ Create Shop" button
- Enter shop name, phone, address
- Save

---

## 🏗️ Project Structure

```
├── client/               Frontend (React + Vite)
│   └── src/
│       ├── pages/        Single page (MainPage)
│       ├── components/   Overlays (Voice, Bill, CreateShop, Login)
│       ├── services/     API, voice parsing, PDF, sharing
│       ├── hooks/        Auth, Speech recognition
│       └── styles/       CSS
│
├── server/               Backend (Node.js + Express)
│   └── src/
│       ├── routes/       API endpoints
│       ├── db/           PostgreSQL connection
│       └── middleware/   Authentication
│
└── docs/                 Documentation
    └── prd.md           Product Requirements
```

---

## 🔧 Tech Stack

**Frontend:**
- React 18
- Vite
- Web Speech API
- Browser Print API
- Web Share API

**Backend:**
- Node.js
- Express 5
- PostgreSQL
- JWT Authentication (PIN-based)

---

## 🎯 Key Features

✅ **Voice-first design** - Speak to record transactions  
✅ **Auto-product creation** - No pre-setup needed  
✅ **Single-page overlay UI** - Simple navigation  
✅ **Bill generation** - Print, PDF, WhatsApp  
✅ **Large touch targets** - Accessible design  
✅ **Offline-ready** - PWA capable  

---

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login with PIN

### Shops
- `GET /api/v1/shops` - List all shops
- `GET /api/v1/shops/today-summary` - Today's totals per shop
- `POST /api/v1/shops` - Create shop

### Products
- `GET /api/v1/products` - List all products
- `POST /api/v1/products` - Create product

### Sales Entries
- `POST /api/v1/sales-entries/quick` - Quick save from voice
- `GET /api/v1/sales-entries` - Get entries (filterable)

### Invoices
- `POST /api/v1/invoices/daily` - Generate daily invoice
- `GET /api/v1/invoices/:id` - Get invoice details

---

## 🔐 Environment Variables

Create `server/.env`:

```env
# Server
PORT=3001
APP_PIN=1234
APP_TOKEN=kadaivoice-dev-token

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kadaivoice
DB_USER=postgres
DB_PASSWORD=your_password_here
```

---

## 🧪 Testing

### Test Database Connection
```bash
cd server
node src/db/test-connection.js
```

### Test API Endpoints
```bash
# Get auth token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234"}'

# Test today summary
curl http://localhost:3001/api/v1/shops/today-summary \
  -H "Authorization: Bearer kadaivoice-dev-token"
```

---

## 📖 Documentation

- **`REDESIGN-PLAN.md`** - Original redesign specification
- **`IMPLEMENTATION_STATUS.md`** - Current implementation status
- **`CLEANUP_COMPLETE.md`** - Cleanup summary
- **`docs/prd.md`** - Product requirements document
- **`server/README-DATABASE.md`** - Database setup guide

---

## 🐛 Troubleshooting

### Login fails with PIN 1234
- Check `server/.env` exists with `APP_PIN=1234`
- Restart the server after editing `.env`

### Database connection error
- Verify PostgreSQL is running
- Check password in `server/.env`
- See `server/README-DATABASE.md` for setup help

### Voice not working
- Chrome/Edge recommended (best Web Speech API support)
- Allow microphone permission when prompted
- Manual entry fallback available if parsing fails

---

## 🎨 Design Principles

1. **Voice-first** - Minimize typing
2. **Single page** - No complex navigation
3. **Large targets** - Easy to tap
4. **High contrast** - Accessible visuals
5. **Simple flows** - Direct actions

---

## 🚦 Project Status

**Version:** 1.0  
**Status:** Production Ready ✅

**Completed:**
- ✅ Database schema & connection
- ✅ All API endpoints
- ✅ Voice entry with auto-product creation
- ✅ Bill generation & sharing
- ✅ Single-page overlay design
- ✅ Authentication
- ✅ Cleanup & optimization

**Future Enhancements:**
- Server-side PDF generation (pdfkit)
- Tamil-English voice parsing improvements
- Edit/delete entries
- Multi-day bills
- Mobile app (React Native)

---

## 📄 License

Private project - All rights reserved

---

## 👤 Author

Built with ❤️ for small shop suppliers

---

## 🙏 Acknowledgments

- Web Speech API for voice recognition
- PostgreSQL for reliable data storage
- React + Vite for fast development

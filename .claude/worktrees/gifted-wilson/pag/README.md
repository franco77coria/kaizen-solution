# Kaizen Solution

> Transformación Digital con Propósito

A modern, full-stack web application built with Next.js 14, TypeScript, and MySQL for digital transformation consulting services.

## 🚀 Features

- ✨ Modern, responsive UI with Tailwind CSS
- 🔐 Secure authentication with NextAuth.js
- 📊 Admin dashboard for content management
- 🗄️ MySQL database with Prisma ORM
- 🎨 Framer Motion animations
- 📱 Mobile-first design
- 🌙 Dark mode support (via next-themes)
- 🔒 Role-based access control (SUPER_ADMIN, ADMIN, VIEWER)

## 📋 Tech Stack

- **Framework**: Next.js 14.2.24 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: MySQL (Hostinger)
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5
- **Animations**: Framer Motion
- **Form Validation**: React Hook Form + Zod
- **Icons**: Lucide React

## 🛠️ Prerequisites

- Node.js 18.x or higher
- npm or yarn
- MySQL database (included with Hostinger)

## 🏃 Quick Start (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/kaizen-solution.git
   cd kaizen-solution
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```bash
   DATABASE_URL="mysql://..."
   NEXTAUTH_SECRET="your-secret"
   NEXTAUTH_URL="http://localhost:3000"
   ADMIN_EMAIL="admin@example.com"
   ```

4. **Setup database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Push schema to database
   npx prisma db push
   
   # (Optional) Seed database
   npm run db:seed
   ```

5. **Create admin user**
   ```bash
   npm run create:admin
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🚢 Deployment

### Deploy to Hostinger VPS

This application is configured for deployment on Hostinger VPS with MySQL database.

**📖 See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.**

Quick deployment steps:

1. MySQL database (already created in Hostinger)
2. Configure Hostinger VPS (Node.js, PM2, Nginx)
3. Clone repository and install dependencies
4. Configure environment variables
5. Build and start with PM2
6. Setup Nginx reverse proxy
7. Configure SSL with Let's Encrypt

### Deploy to Vercel (Alternative)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Note**: For Vercel deployment, remove `output: 'standalone'` from `next.config.js`

## 📝 Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database
- `npm run db:push` - Push Prisma schema to database
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio

### Admin Management
- `npm run create:admin` - Create admin user
- `npm run update:admin` - Update admin email
- `npm run verify:admin` - Verify admin user
- `npm run test:auth` - Test authentication

### Deployment (Hostinger)
- `npm run deploy:build` - Full production build
- `npm run deploy:start` - Start in production mode
- `npm run deploy:pm2` - Start with PM2

## 📁 Project Structure

```
kaizen-solution/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard pages
│   ├── login/             # Authentication pages
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── layout/           # Layout components
│   ├── sections/         # Page sections
│   └── ui/               # UI components
├── lib/                   # Utility functions
│   ├── auth.ts           # NextAuth configuration
│   └── utils.ts          # Helper functions
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Prisma schema
│   └── seed.ts           # Database seeding
├── scripts/              # Utility scripts
│   ├── create-admin.ts   # Admin creation
│   └── backup-database.sh # Database backup
├── public/               # Static assets
├── deploy.sh             # Deployment script
├── ecosystem.config.js   # PM2 configuration
└── DEPLOYMENT.md         # Deployment guide
```

## 🔐 Security

- ✅ **Updated to Next.js 14.2.24** - Patches CVE-2025-55184 and CVE-2025-55183
- 🔒 Secure password hashing with bcrypt
- 🛡️ CSRF protection with NextAuth
- 🚫 SQL injection prevention with Prisma
- 🔑 Environment variable validation
- 📝 Security headers configured in Nginx

## 🗄️ Database Schema

The application uses the following main models:

- **User** - User accounts with role-based access
- **SiteConfig** - Global site configuration
- **Service** - Services offered
- **Project** - Portfolio projects
- **Testimonial** - Client testimonials
- **ContactSubmission** - Contact form submissions

See [prisma/schema.prisma](./prisma/schema.prisma) for complete schema.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 🆘 Support

For deployment issues, see [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section.

For other questions, contact: admin@kaizensolution.com

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components inspired by [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)
- Hosted on [Hostinger](https://www.hostinger.com/)
- Database: MySQL on [Hostinger](https://www.hostinger.com/)

---

**Made with ❤️ by Kaizen Solution**

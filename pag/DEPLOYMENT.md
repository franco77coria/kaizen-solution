# Deployment Guide - Hostinger VPS

This guide will walk you through deploying the Kaizen Solution application on Hostinger VPS.

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ Hostinger VPS with SSH access
- ✅ Domain name configured and pointing to your VPS
- ✅ MySQL database created in Hostinger panel (already done!)
- ✅ Basic knowledge of Linux command line

## 🗄️ Step 1: MySQL Database Setup

Your MySQL database is already created in Hostinger! Here are your credentials:

```
Database Name: u68417991o_kaizensolution
Username: u68417991o_kaizen
Password: kaizensolution2025
Host: localhost
Port: 3306
```

**Connection String:**
```
mysql://u68417991o_kaizen:kaizensolution2025@localhost:3306/u68417991o_kaizensolution
```

> [!IMPORTANT]
> Keep these credentials secure. Consider changing the password after initial setup.

## 🖥️ Step 2: Prepare Your Hostinger VPS

### 2.1 Connect via SSH

```bash
ssh root@your-vps-ip
```

### 2.2 Install Node.js (v18 or higher)

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installation
node --version  # Should show v18.x or higher
npm --version
```

### 2.3 Install PM2 (Process Manager)

```bash
npm install -g pm2
```

### 2.4 Install Nginx (Web Server)

```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 2.5 Install Git (if not already installed)

```bash
apt install -y git
```

## 📦 Step 3: Deploy Your Application

### 3.1 Clone Your Repository

```bash
# Navigate to web directory
cd /var/www

# Clone your repository
git clone https://github.com/yourusername/kaizen-solution.git
cd kaizen-solution
```

### 3.2 Create Environment Variables

```bash
# Copy the production example file
cp .env.production.example .env

# Edit the file
nano .env
```

Update the following variables:

```bash
NODE_ENV="production"
PORT=3000

# Your MySQL connection string (already filled in from .env.production.example)
DATABASE_URL="mysql://u68417991o_kaizen:kaizensolution2025@localhost:3306/u68417991o_kaizensolution"

# Generate a secret: openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-secret-here"

# Your domain
NEXTAUTH_URL="https://yourdomain.com"

# Admin email
ADMIN_EMAIL="admin@kaizensolution.com"
```

Save and exit (Ctrl+X, then Y, then Enter)

### 3.3 Install Dependencies and Build

```bash
# Install dependencies
npm ci

# Generate Prisma client
npx prisma generate

# Push database schema to MySQL
npx prisma db push

# Build the application
npm run build
```

### 3.4 Create Admin User

```bash
npm run create:admin
```

Follow the prompts to create your admin user.

### 3.5 Start Application with PM2

```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the command it outputs
```

### 3.6 Verify Application is Running

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs kaizen

# Test locally
curl http://localhost:3000
```

## 🌐 Step 4: Configure Nginx Reverse Proxy

### 4.1 Create Nginx Configuration

```bash
nano /etc/nginx/sites-available/kaizen
```

Paste the following configuration (replace `yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save and exit.

### 4.2 Enable the Site

```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/kaizen /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

### 4.3 Test Your Site

Visit `http://yourdomain.com` in your browser. You should see your application!

## 🔒 Step 5: Setup SSL with Let's Encrypt

### 5.1 Install Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### 5.2 Obtain SSL Certificate

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### 5.3 Test Auto-Renewal

```bash
certbot renew --dry-run
```

Your site should now be accessible via `https://yourdomain.com` 🎉

## 🔄 Step 6: Deploy Updates

When you need to deploy updates, use the deployment script:

```bash
cd /var/www/kaizen-solution

# Make deploy script executable (first time only)
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

Or manually:

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm ci

# Run migrations
npx prisma generate
npx prisma db push

# Build
npm run build

# Restart PM2
pm2 restart kaizen
```

## 📊 Monitoring and Maintenance

### View Application Logs

```bash
# Real-time logs
pm2 logs kaizen

# Last 100 lines
pm2 logs kaizen --lines 100
```

### Check Application Status

```bash
pm2 status
```

### Restart Application

```bash
pm2 restart kaizen
```

### Stop Application

```bash
pm2 stop kaizen
```

### Monitor Resources

```bash
pm2 monit
```

## 🐛 Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs kaizen --err

# Check if port 3000 is in use
lsof -i :3000

# Verify environment variables
cat .env
```

### Database Connection Issues

```bash
# Test database connection
npx prisma db push

# Check if DATABASE_URL is correct
echo $DATABASE_URL
```

### Nginx Issues

```bash
# Check Nginx error logs
tail -f /var/log/nginx/error.log

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Check certificate status
certbot certificates

# Renew certificate manually
certbot renew
```

## 🔐 Security Best Practices

1. **Firewall Configuration**
   ```bash
   # Allow SSH, HTTP, HTTPS
   ufw allow 22
   ufw allow 80
   ufw allow 443
   ufw enable
   ```

2. **Keep System Updated**
   ```bash
   apt update && apt upgrade -y
   ```

3. **Secure SSH**
   - Use SSH keys instead of passwords
   - Disable root login
   - Change default SSH port

4. **Regular Backups**
   - Backup your MySQL database regularly (use `./scripts/backup-database.sh`)
   - Backup your `.env` file securely
   - Consider automated backups with cron jobs

## 📚 Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Prisma MySQL Documentation](https://www.prisma.io/docs/concepts/database-connectors/mysql)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

## 🆘 Need Help?

If you encounter issues:
1. Check the logs: `pm2 logs kaizen`
2. Verify environment variables
3. Ensure database connection is working
4. Check Nginx configuration
5. Review this guide step by step

---

**Congratulations!** 🎉 Your Kaizen Solution application is now deployed on Hostinger!

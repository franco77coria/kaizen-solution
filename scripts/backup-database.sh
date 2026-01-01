#!/bin/bash

# Database Backup Script for Kaizen Solution (MySQL)
# This script creates a backup of your MySQL database

set -e

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="kaizen_backup_${DATE}.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo "🗄️  Starting database backup..."

# Extract database connection details from .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Error: .env file not found"
    exit 1
fi

# Parse DATABASE_URL
# Format: mysql://USER:PASSWORD@HOST:PORT/DATABASE
DB_URL=$DATABASE_URL

# Extract connection details
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "📦 Creating backup: $BACKUP_FILE"

# Use mysqldump to create backup
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_DIR/$BACKUP_FILE"

# Compress the backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

echo "✅ Backup completed: $BACKUP_DIR/${BACKUP_FILE}.gz"
echo "📊 Backup size: $(du -h "$BACKUP_DIR/${BACKUP_FILE}.gz" | cut -f1)"

# Optional: Keep only last 7 backups
echo "🧹 Cleaning old backups (keeping last 7)..."
cd $BACKUP_DIR
ls -t kaizen_backup_*.sql.gz | tail -n +8 | xargs -r rm
cd ..

echo "✅ Backup process completed!"
echo "💡 To restore: gunzip -c $BACKUP_DIR/${BACKUP_FILE}.gz | mysql -h \$DB_HOST -u \$DB_USER -p\$DB_PASS \$DB_NAME"

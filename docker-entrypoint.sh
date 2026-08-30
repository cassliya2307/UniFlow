#!/bin/sh
set -e

# Ensure script is executable (for Docker builds that may not set +x)
if [ ! -x "$0" ]; then
  exit 0
fi

echo "=== Docker Entrypoint Starting ==="

# Step 1: Create /data and /data/uploads if they don't exist
# This must run as root because /data may be a Railway volume owned by root
echo "Creating /data and /data/uploads directories..."
mkdir -p /data
mkdir -p /data/uploads
echo "/data and /data/uploads created."

# Step 2: Fix ownership of /data and /data/uploads
# /data may be root-owned from Railway volume mount
echo "Fixing ownership of /data and /data/uploads..."
chown -R nextjs:nodejs /data
chown -R nextjs:nodejs /data/uploads
echo "Ownership fixed."

# Step 3: Run Prisma migration as nextjs
# Since we've chowned /data to nextjs, the migration can create /data/dev.db
echo "Running Prisma migration as nextjs..."
su -s /bin/sh nextjs -c "npx prisma migrate deploy --schema=./server/prisma/schema.prisma"
echo "Prisma migration complete."

# Step 4: Run the Node application as nextjs
# Drop privileges to nextjs user and run the app
echo "Starting Node application as nextjs..."
exec su -s /bin/sh nextjs -c "node server/dist/index.js"
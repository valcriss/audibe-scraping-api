#!/bin/sh
set -e

if [ "${DB_ENABLED}" = "true" ] || [ "${DB_ENABLED}" = "1" ]; then
  DB_HOST_VALUE="${DB_HOST:-localhost}"
  DB_PORT_VALUE="${DB_PORT:-5432}"
  echo "Waiting for database at ${DB_HOST_VALUE}:${DB_PORT_VALUE}..."
  while true; do
    node -e "const net=require('net');const s=net.connect({host:'${DB_HOST_VALUE}',port:${DB_PORT_VALUE}},()=>{s.end();process.exit(0);});s.on('error',()=>process.exit(1));" \
      && break
    echo "Database not ready yet, retrying in 5 seconds..."
    sleep 5
  done

  echo "Running database migrations..."
  npm run migrate
fi

exec node dist/server.js

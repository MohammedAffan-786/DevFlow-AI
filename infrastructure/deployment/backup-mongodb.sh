#!/usr/bin/env bash
# ==============================================================================
# DevFlow AI: Automated MongoDB Backup Script
# Performs compressed mongodump, rotates local backups, and streams to S3
# ==============================================================================

set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_DIR:-/backups/mongodb}"
BACKUP_FILE="${BACKUP_DIR}/devflow_backup_${TIMESTAMP}.tar.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/devflow}"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u)] Starting automated MongoDB backup..."

# 1. Execute compressed dump
mongodump --uri="${MONGO_URI}" --gzip --archive="${BACKUP_FILE}"

echo "[$(date -u)] Database dump created: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

# 2. Upload to S3 if bucket configured
if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
  echo "[$(date -u)] Streaming backup archive to s3://${BACKUP_S3_BUCKET}/backups/"
  aws s3 cp "${BACKUP_FILE}" "s3://${BACKUP_S3_BUCKET}/backups/devflow_backup_${TIMESTAMP}.tar.gz" --sse AES256
  echo "[$(date -u)] Successfully synced to cloud storage."
fi

# 3. Clean up local backups older than retention window
echo "[$(date -u)] Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "devflow_backup_*.tar.gz" -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date -u)] MongoDB backup routine completed successfully."

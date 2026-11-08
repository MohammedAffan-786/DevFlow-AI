#!/usr/bin/env bash
# ==============================================================================
# DevFlow AI: MongoDB Disaster Recovery / Restoration Script
# ==============================================================================

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <path-to-backup-file.tar.gz>"
  echo "Example: $0 /backups/mongodb/devflow_backup_20261107_120000.tar.gz"
  exit 1
fi

BACKUP_FILE="$1"
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/devflow}"

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "=================================================================="
echo " WARNING: THIS WILL OVERWRITE EXISTING DATA IN: ${MONGO_URI}"
echo "=================================================================="
read -p "Type 'RESTORE' to proceed: " CONFIRMATION

if [[ "${CONFIRMATION}" != "RESTORE" ]]; then
  echo "Aborting restoration."
  exit 0
fi

echo "[$(date -u)] Initiating mongorestore from ${BACKUP_FILE}..."
mongorestore --uri="${MONGO_URI}" --gzip --archive="${BACKUP_FILE}" --drop

echo "[$(date -u)] Database restore completed successfully."

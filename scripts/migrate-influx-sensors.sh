#!/usr/bin/env bash
set -euo pipefail

source_url="${SOURCE_INFLUX_URL:-http://192.168.66.3:8086}"
target_url="${TARGET_INFLUX_URL:-http://192.168.66.3:18086}"
org="${INFLUX_ORG:-ahara}"
source_bucket="${SOURCE_BUCKET:-env_sensors}"
target_bucket="${TARGET_BUCKET:-env_sensors_migrated_$(date -u +%Y%m%dT%H%M%SZ)}"
backup_root="${BACKUP_ROOT:-./migration-artifacts/influx}"
image="${INFLUX_IMAGE:-influxdb:2.9.1}"

usage() {
  cat <<'EOF'
Bucket-scoped migration for environmental sensor data.

Required:
  SOURCE_INFLUX_TOKEN      Token for the legacy InfluxDB source.
  TARGET_INFLUX_TOKEN      Token for the managed InfluxDB target.

Defaults:
  SOURCE_INFLUX_URL        http://192.168.66.3:8086
  TARGET_INFLUX_URL        http://192.168.66.3:18086
  INFLUX_ORG               ahara
  SOURCE_BUCKET            env_sensors
  TARGET_BUCKET            env_sensors_migrated_<timestamp>
  BACKUP_ROOT              ./migration-artifacts/influx

Commands:
  migrate                  Backup source bucket, restore into target bucket, verify.
  backup                   Only create a source bucket backup.
  restore BACKUP_DIR       Restore an existing backup into TARGET_BUCKET.
  verify                   Verify target bucket has queryable points.

The default TARGET_BUCKET is intentionally new and non-destructive. Set
TARGET_BUCKET=env_sensors only after confirming the target bucket is safe to use.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

action="${1:-migrate}"
shift || true

require_token() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "missing required environment variable: ${name}" >&2
    exit 1
  fi
}

influx() {
  local influx_bin
  influx_bin="$(type -P influx || true)"
  if [[ -n "$influx_bin" ]]; then
    "$influx_bin" "$@"
    return
  fi

  local docker_args=(run --rm)
  if [[ "${INFLUX_MOUNT_WORKDIR:-0}" == "1" ]]; then
    local mount_root
    mount_root="$(pwd)"
    docker_args+=(-v "${mount_root}:${mount_root}" -w "${mount_root}")
  fi

  docker "${docker_args[@]}" "$image" influx "$@"
}

backup_dir() {
  printf '%s/%s-%s' "$backup_root" "$source_bucket" "$(date -u +%Y%m%dT%H%M%SZ)"
}

backup() {
  require_token SOURCE_INFLUX_TOKEN

  local dir
  dir="$(backup_dir)"
  mkdir -p "$dir"

  INFLUX_MOUNT_WORKDIR=1 influx backup \
    --host "$source_url" \
    --org "$org" \
    --bucket "$source_bucket" \
    --token "$SOURCE_INFLUX_TOKEN" \
    "$dir"

  echo "$dir"
}

restore() {
  require_token TARGET_INFLUX_TOKEN

  local dir="$1"
  if [[ -z "$dir" || ! -d "$dir" ]]; then
    echo "restore requires an existing backup directory" >&2
    exit 1
  fi

  INFLUX_MOUNT_WORKDIR=1 influx restore \
    --host "$target_url" \
    --org "$org" \
    --bucket "$source_bucket" \
    --new-bucket "$target_bucket" \
    --token "$TARGET_INFLUX_TOKEN" \
    "$dir"
}

verify() {
  require_token TARGET_INFLUX_TOKEN

  local query
  query="from(bucket: \"${target_bucket}\") |> range(start: 0) |> last() |> limit(n: 20)"

  echo "checking bucket ${target_bucket} on ${target_url}"
  influx bucket list --host "$target_url" --org "$org" --token "$TARGET_INFLUX_TOKEN" \
    | awk -v bucket="$target_bucket" 'NR == 1 || $0 ~ bucket'
  influx query --host "$target_url" --org "$org" --token "$TARGET_INFLUX_TOKEN" --raw "$query" \
    | sed -n '1,40p'
}

case "$action" in
  backup)
    backup
    ;;
  restore)
    restore "${1:-}"
    verify
    ;;
  verify)
    verify
    ;;
  migrate)
    dir="$(backup)"
    restore "$dir"
    verify
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac

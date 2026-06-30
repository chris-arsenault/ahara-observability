#!/bin/sh
set -eu

host="${INFLUX_URL:-http://influxdb:8086}"
org="${INFLUX_ORG:-ahara}"
v1_user="${INFLUX_V1_USERNAME:-admin}"
v1_password="${INFLUX_V1_PASSWORD:-${INFLUXDB_ADMIN_TOKEN:-}}"

if [ -z "${INFLUXDB_ADMIN_TOKEN:-}" ]; then
  echo "INFLUXDB_ADMIN_TOKEN is required" >&2
  exit 1
fi

if [ -z "$v1_password" ]; then
  echo "INFLUX_V1_PASSWORD or INFLUXDB_ADMIN_TOKEN is required" >&2
  exit 1
fi

influx_cmd() {
  influx "$@" --host "$host" --org "$org" --token "$INFLUXDB_ADMIN_TOKEN"
}

wait_for_influx() {
  attempts=0
  until influx ping --host "$host" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ "$attempts" -gt 60 ]; then
      echo "InfluxDB did not become ready at $host" >&2
      exit 1
    fi
    sleep 2
  done
}

bucket_id() {
  influx_cmd bucket list --name "$1" --hide-headers 2>/dev/null | awk 'NF { print $1; exit }'
}

ensure_bucket() {
  bucket="$1"
  if [ -n "$(bucket_id "$bucket")" ]; then
    echo "bucket exists: $bucket"
    return
  fi

  influx_cmd bucket create --name "$bucket" --retention 0 >/dev/null
  echo "bucket created: $bucket"
}

ensure_dbrp() {
  db="$1"
  bucket="$2"
  id="$(bucket_id "$bucket")"
  if [ -z "$id" ]; then
    echo "missing bucket id for $bucket" >&2
    exit 1
  fi

  if influx_cmd v1 dbrp list --hide-headers 2>/dev/null | awk -v db="$db" -v id="$id" '$2 == db && $3 == id { found = 1 } END { exit !found }'; then
    echo "dbrp exists: $db -> $bucket"
    return
  fi

  influx_cmd v1 dbrp create --db "$db" --rp autogen --bucket-id "$id" --default >/dev/null
  echo "dbrp created: $db -> $bucket"
}

ensure_v1_auth() {
  if influx_cmd v1 auth list --hide-headers 2>/dev/null | awk -v user="$v1_user" '$3 == user { found = 1 } END { exit !found }'; then
    echo "v1 auth exists: $v1_user"
    return
  fi

  voltage_id="$(bucket_id voltage-data)"
  environment_id="$(bucket_id environment-data)"
  if [ -z "$voltage_id" ] || [ -z "$environment_id" ]; then
    echo "cannot create v1 auth before compatibility buckets exist" >&2
    exit 1
  fi

  influx_cmd v1 auth create \
    --username "$v1_user" \
    --password "$v1_password" \
    --read-bucket "$voltage_id" \
    --write-bucket "$voltage_id" \
    --read-bucket "$environment_id" \
    --write-bucket "$environment_id" >/dev/null
  echo "v1 auth created: $v1_user"
}

wait_for_influx
ensure_bucket voltage-data
ensure_bucket environment-data
ensure_dbrp voltage-data voltage-data
ensure_dbrp environment-data environment-data
ensure_v1_auth

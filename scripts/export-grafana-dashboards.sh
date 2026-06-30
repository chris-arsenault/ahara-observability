#!/usr/bin/env bash
set -euo pipefail

legacy_url="${LEGACY_GRAFANA_URL:-http://192.168.66.3:30037}"
output_dir="${OUTPUT_DIR:-migration-artifacts/grafana-dashboards}"

usage() {
  cat <<'EOF'
Export dashboards from the legacy Grafana API into provisionable JSON files.

Authentication:
  LEGACY_GRAFANA_TOKEN              Preferred; Grafana service account token.
  LEGACY_GRAFANA_USER/PASSWORD      Fallback; basic auth credentials.

Optional:
  LEGACY_GRAFANA_URL                Default: http://192.168.66.3:30037
  OUTPUT_DIR                        Default: migration-artifacts/grafana-dashboards

Example:
  LEGACY_GRAFANA_TOKEN=... scripts/export-grafana-dashboards.sh
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

curl_auth_args() {
  if [[ -n "${LEGACY_GRAFANA_TOKEN:-}" ]]; then
    printf '%s\0%s\0' -H "Authorization: Bearer ${LEGACY_GRAFANA_TOKEN}"
    return
  fi

  if [[ -n "${LEGACY_GRAFANA_USER:-}" && -n "${LEGACY_GRAFANA_PASSWORD:-}" ]]; then
    printf '%s\0%s\0' -u "${LEGACY_GRAFANA_USER}:${LEGACY_GRAFANA_PASSWORD}"
    return
  fi

  echo "set LEGACY_GRAFANA_TOKEN or LEGACY_GRAFANA_USER/LEGACY_GRAFANA_PASSWORD" >&2
  exit 1
}

slugify() {
  tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' \
    | cut -c1-80
}

require curl
require jq

mkdir -p "$output_dir"

mapfile -d '' auth_args < <(curl_auth_args)
search_json="$(curl -fsS "${auth_args[@]}" "${legacy_url%/}/api/search?type=dash-db")"

count="$(jq 'length' <<<"$search_json")"
if [[ "$count" == "0" ]]; then
  echo "no dashboards found at ${legacy_url}" >&2
  exit 0
fi

jq -r '.[] | [.uid, .title] | @tsv' <<<"$search_json" | while IFS=$'\t' read -r uid title; do
  file_title="$(printf '%s' "$title" | slugify)"
  out="${output_dir}/${file_title:-dashboard}.json"
  tmp="$(mktemp)"

  curl -fsS "${auth_args[@]}" "${legacy_url%/}/api/dashboards/uid/${uid}" \
    | jq '.dashboard | .id = null | .version = 0' >"$tmp"

  mv "$tmp" "$out"
  echo "exported ${title} (${uid}) -> ${out}"
done

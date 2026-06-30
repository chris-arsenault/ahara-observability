# Migration Plan

## Goals

- Move Grafana and related observability services under Komodo management.
- Preserve existing InfluxDB environmental sensor data where practical.
- Make application telemetry OTLP-native for metrics, logs, and traces.

## Phases

1. Snapshot the current manual Grafana and InfluxDB datasets.
2. Export current Grafana dashboards and datasource definitions.
3. Deploy this stack on `192.168.66.3:30038` while the old Grafana can remain on `30037`.
4. Restore or mount the old InfluxDB data into `/mnt/apps/apps/ahara-observability/influxdb`.
5. Verify the `InfluxDB Sensors` datasource in Grafana.
6. Point `dashboards.services.ahara.io` at the managed Grafana port.
7. Configure Bookmarker as the first OTLP producer through the reverse-proxy OTLP gateway.
8. Stop the old manual stack after the managed stack survives restart and sensor ingestion checks.

## Current Live Inventory

- Managed Grafana is healthy on `192.168.66.3:30038`.
- Legacy Grafana is still healthy on `192.168.66.3:30037`, but its API requires
  credentials.
- Managed InfluxDB is healthy on `192.168.66.3:18086`.
- Legacy InfluxDB is not listening on `192.168.66.3:8086` from the current
  network path.
- The managed `env_sensors` bucket exists and is currently queryable.

## Influx Compatibility

The managed InfluxDB service publishes `192.168.66.3:18086` by default to avoid
colliding with an existing manual InfluxDB on `8086`. After migration, either:

- repoint sensor writers to `18086`; or
- change the published port to `8086` once the old service is stopped.

Application telemetry should not be written to InfluxDB. AWS producers send
OTLP to the reverse-proxy Alloy gateway, which forwards directly to
VictoriaMetrics, Loki, and Tempo on TrueNAS.

## Sensor Data Migration

Use `scripts/migrate-influx-sensors.sh` for bucket-scoped migration. The script
uses the upstream `influx` CLI from `influxdb:2.9.1` when a local `influx`
binary is not installed.

The default restore target is a timestamped bucket such as
`env_sensors_migrated_20260630T031500Z`. This avoids deleting or overwriting the
managed `env_sensors` bucket while we confirm the imported data.

```bash
SOURCE_INFLUX_TOKEN=... \
TARGET_INFLUX_TOKEN=... \
scripts/migrate-influx-sensors.sh migrate
```

After verification, either:

- update Grafana's `InfluxDB Sensors` datasource `defaultBucket` to the migrated
  bucket; or
- rerun the restore with `TARGET_BUCKET=env_sensors` after confirming the
  managed bucket can be replaced.

The target token is stored in SSM at
`/ahara/observability/influxdb-admin-token`. Do not commit either source or
target token values.

## Dashboard Migration

Use `scripts/export-grafana-dashboards.sh` to export legacy Grafana dashboards:

```bash
LEGACY_GRAFANA_TOKEN=... scripts/export-grafana-dashboards.sh
```

The script writes provisionable dashboard JSON into
`migration-artifacts/grafana-dashboards/` by default. Review exported dashboards
before moving them into `dashboards/`, especially datasource UIDs and any
hard-coded bucket names.

The managed stack already provisions:

- `Ahara Environmental Sensors`, backed by the `InfluxDB Sensors` datasource.
- `InfluxDB Sensors`, UID `influxdb-sensors`, pointed at managed InfluxDB.

## Rollback

Rollback is intentionally simple:

- leave the old datasets untouched until cutover is verified;
- restore the old reverse-proxy route or port;
- restart the old manual Grafana/Influx stack if needed.

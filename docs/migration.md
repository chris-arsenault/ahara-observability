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
- Legacy InfluxDB is healthy on `192.168.66.3:30115`.
- The legacy Grafana sensor dashboards use InfluxQL datasources backed by
  `voltage-data` and `environment-data`.
- The managed `env_sensors`, `voltage-data`, and `environment-data` buckets
  exist and are currently queryable.

## Influx Compatibility

The managed InfluxDB service publishes `192.168.66.3:18086` by default to avoid
colliding with an existing manual InfluxDB on `8086`. After migration, either:

- repoint sensor writers to `18086`; or
- change the published port to `8086` once the old service is stopped.

Application telemetry should not be written to InfluxDB. AWS producers send
OTLP to the reverse-proxy Alloy gateway, which forwards directly to
VictoriaMetrics, Loki, and Tempo on TrueNAS.

## Data Migration

This repo does not keep one-shot migration scripts. Move legacy data with
operator-controlled TrueNAS, InfluxDB, or Grafana commands outside the deployed
stack, then verify the managed services directly.

The target InfluxDB token is stored in SSM at
`/ahara/observability/influxdb-admin-token`. Do not commit source or target
token values.

The managed stack already provisions:

- `Ahara Environmental Sensors`, backed by the `InfluxDB Sensors` datasource.
- `InfluxDB Sensors`, UID `influxdb-sensors`, pointed at managed InfluxDB.

## Rollback

Rollback is intentionally simple:

- leave the old datasets untouched until cutover is verified;
- restore the old reverse-proxy route or port;
- restart the old manual Grafana/Influx stack if needed.

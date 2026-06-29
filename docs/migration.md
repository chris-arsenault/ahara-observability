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

## Influx Compatibility

The managed InfluxDB service publishes `192.168.66.3:18086` by default to avoid
colliding with an existing manual InfluxDB on `8086`. After migration, either:

- repoint sensor writers to `18086`; or
- change the published port to `8086` once the old service is stopped.

Application telemetry should not be written to InfluxDB. AWS producers send
OTLP to the reverse-proxy gateway, which forwards to TrueNAS Alloy and then to
VictoriaMetrics, Loki, and Tempo.

## Rollback

Rollback is intentionally simple:

- leave the old datasets untouched until cutover is verified;
- restore the old reverse-proxy route or port;
- restart the old manual Grafana/Influx stack if needed.

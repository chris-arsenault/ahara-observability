# Ahara Observability

Ahara's Komodo-managed observability stack for TrueNAS.

This repo manages third-party services and configuration. It does not build
project-owned images; Ahara CI validates the Compose/config files and asks
Komodo to deploy upstream images directly.

## Services

| Service | Purpose |
| --- | --- |
| Grafana | Dashboards, Explore, alerting |
| Alloy | OTLP receiver and routing pipeline |
| VictoriaMetrics | Primary Prometheus-compatible metrics backend |
| Loki | OTLP log storage |
| Tempo | OTLP trace storage |
| InfluxDB | Compatibility store for existing sensor history |

## Local Checks

```bash
make ci
```

The check validates `compose.yaml` with `.env.example`, parses JSON dashboards,
and verifies required config files exist.

## Deployment Modes

The default deployment mode is the full TrueNAS-local observability stack:

```text
truenas_compose_path: compose.yaml
```

Switch `truenas_compose_path` to `compose.cloudwatch.yaml` to run Grafana only.
In that mode, Grafana can still use the provisioned CloudWatch datasource, but
local Loki, Tempo, VictoriaMetrics, Alloy, InfluxDB, and node-exporter are not
started.

Grafana uses AWS SDK default credential resolution for CloudWatch. On TrueNAS,
provide either environment credentials or a credentials file under:

```text
/mnt/apps/apps/ahara-observability/aws
```

The `Ahara Storage Volume` dashboard tracks local ingest rates, filesystem
capacity, disk write throughput, and scrape health.

## Ahara Producer Defaults

Instrumented Lambdas should point to the AWS-private OTLP gateway published by
`ahara-infra`, not directly to TrueNAS:

```text
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=<value of /ahara/observability/otlp-http-endpoint>
```

The gateway runs on the existing reverse proxy EC2 instance and exports to this
TrueNAS stack. Producers do not need direct LAN/VPN coupling.

EC2 host agents send Loki push traffic to the same reverse proxy host. Only the
reverse proxy writes across the VPN to the TrueNAS Loki and Alloy endpoints.

# Ahara Observability

Ahara's Komodo-managed observability stack for TrueNAS.

This repo manages third-party services and configuration. It does not build
project-owned images; Ahara CI validates the Compose/config files and asks
Komodo to deploy upstream images directly.

## Services

| Service | Purpose |
| --- | --- |
| Grafana | Dashboards, Explore, alerting |
| Alloy | Local OTLP collector and router |
| vmagent | Local stack and host metrics scraper |
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

The deployed mode is the full TrueNAS-local observability stack:

```text
truenas_compose_path: compose.yaml
```

Do not create CloudWatch dashboards for product telemetry. CloudWatch remains an
AWS fallback surface for Lambda/runtime logs and selected AWS-native alarms, but
Ahara product dashboards belong in this Grafana stack using Loki, Tempo, and
VictoriaMetrics data.

The `Ahara Storage Volume` dashboard tracks local ingest rates, filesystem
capacity, disk write throughput, and scrape health.

The `Ahara Telemetry Overview` dashboard is the shared cross-product operations
surface. It uses common OTEL labels such as `service.name`, `service.namespace`,
and `operation.type` so individual services do not need their own telemetry
dashboard just to expose request, polling, background-job, outcome, and duration
health.

## Product Dashboards

This repo owns the Grafana runtime, datasource provisioning, platform-level
dashboards, and shared cross-product telemetry dashboards. Product/domain
dashboards should live in the product repo that owns the query semantics,
usually under `observability/dashboards/*.json`.

Product repos deploy those dashboards through the shared Ahara CI workflow by
declaring `observability.dashboards` in `platform.yml`. CI invokes the
`ahara-grafana-dashboard-deploy` Lambda published by `ahara-infra`; Grafana does
not need to be restarted or redeployed for dashboard-only changes.

## Grafana Authentication

Grafana uses Ahara Cognito as a native OIDC provider. The shared ALB forwards
`dashboards.services.ahara.io` through to Grafana without its own Cognito
challenge, so the browser sees one login flow instead of ALB auth plus Grafana
auth.

The local Grafana login form and basic auth are disabled. The admin password is
still provisioned as break-glass configuration for controlled recovery.

## Ahara Producer Defaults

Instrumented Lambdas should point to the AWS-private OTLP gateway published by
`ahara-infra`, not directly to TrueNAS:

```text
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=<value of /ahara/observability/otlp-http-endpoint>
```

The gateway runs on the existing reverse proxy EC2 instance and exports to the
local Alloy collector in this TrueNAS stack. TrueNAS-local producers should send
OTLP directly to `http://192.168.66.3:4318`; Alloy then routes logs to Loki,
metrics to VictoriaMetrics, and traces to Tempo.

EC2 host agents send Loki push traffic to the same reverse proxy host. Only the
reverse proxy writes across the VPN to the TrueNAS Loki, Tempo, and
VictoriaMetrics endpoints.

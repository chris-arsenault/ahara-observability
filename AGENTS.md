# ahara-observability

Komodo-managed observability stack for Ahara services running on TrueNAS.

## Scope

- This repo owns configuration for third-party observability services.
- Do not add project-owned wrapper images unless an upstream image cannot be configured safely.
- Runtime deployment uses Ahara's shared TrueNAS/Komodo workflow with `truenas_images: false`.
- Secrets are referenced by SSM path in `secret-paths.yml`; never commit secret values.
- Run `make ci` before handoff after changing files.
- `truenas_compose_path: compose.yaml` runs the full local stack. Do not add CloudWatch-only dashboard modes or CloudWatch product dashboards.
- Product telemetry must use Ahara OTEL instrumentation, the reverse-proxy OTLP gateway, and Grafana dashboards backed by Loki, Tempo, and VictoriaMetrics. CloudWatch is only an AWS fallback/runtime surface.
- Product/domain dashboard source belongs in the product repo and is deployed by shared CI through the `ahara-grafana-dashboard-deploy` Lambda. Keep this repo focused on Grafana runtime configuration, datasources, platform-level dashboards, and shared cross-product telemetry dashboards.

## Stack

- Grafana for dashboards and alerting
- Alloy as the local OTLP collector and router
- vmagent as the local stack and host metrics scraper
- VictoriaMetrics as the primary metrics backend
- Loki as the log backend
- Tempo as the trace backend
- InfluxDB as a compatibility store for existing environmental sensor history

## Important Ports

- Grafana: `192.168.66.3:30038`
- Loki API: `192.168.66.3:3100`
- Alloy OTLP gRPC: `192.168.66.3:4317`
- Alloy OTLP HTTP: `192.168.66.3:4318`
- VictoriaMetrics remote write/API: `192.168.66.3:8428`
- Influx compatibility endpoint: `192.168.66.3:18086`

AWS Lambdas should use the reverse-proxy OTLP gateway published in SSM by
`ahara-infra`, not these TrueNAS endpoints directly.

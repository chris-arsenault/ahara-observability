# ahara-observability

Komodo-managed observability stack for Ahara services running on TrueNAS.

## Scope

- This repo owns configuration for third-party observability services.
- Do not add project-owned wrapper images unless an upstream image cannot be configured safely.
- Runtime deployment uses Ahara's shared TrueNAS/Komodo workflow with `truenas_images: false`.
- Secrets are referenced by SSM path in `secret-paths.yml`; never commit secret values.
- Run `make ci` before handoff after changing files.
- `truenas_compose_path: compose.yaml` runs the full local stack. Use `compose.cloudwatch.yaml` for Grafana-only CloudWatch-backed operation.

## Stack

- Grafana for dashboards and alerting
- vmagent as the local stack and host metrics scraper
- VictoriaMetrics as the primary metrics backend
- Loki as the log backend
- Tempo as the trace backend
- InfluxDB as a compatibility store for existing environmental sensor history

## Important Ports

- Grafana: `192.168.66.3:30038`
- Loki API: `192.168.66.3:3100`
- Tempo OTLP gRPC: `192.168.66.3:4317`
- Tempo OTLP HTTP: `192.168.66.3:4318`
- VictoriaMetrics remote write/API: `192.168.66.3:8428`
- Influx compatibility endpoint: `192.168.66.3:18086`

AWS Lambdas should use the reverse-proxy OTLP gateway published in SSM by
`ahara-infra`, not these TrueNAS endpoints directly.

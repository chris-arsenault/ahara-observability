# Operations

## Access

Grafana is intended to be exposed through the Ahara reverse proxy at:

```text
https://dashboards.services.ahara.io
```

The managed stack listens on `192.168.66.3:30038`.

## Deployment Mode

The deployed Compose file is controlled by `truenas_compose_path` in
`platform.yml`:

- `compose.yaml`: full TrueNAS-local stack.
- `compose.cloudwatch.yaml`: Grafana only, for CloudWatch-backed operation.

The default is `compose.yaml`. Switching modes is a one-line manifest change and
redeploy.

## OTLP Ingestion

TrueNAS Tempo accepts OTLP from the AWS reverse-proxy gateway on the LAN:

```text
grpc: 192.168.66.3:4317
http: http://192.168.66.3:4318
```

Ahara Lambdas should use the AWS-private endpoint published by `ahara-infra`:

```text
/ahara/observability/otlp-http-endpoint
```

Do not point Lambdas directly at the TrueNAS address. The reverse proxy Alloy
gateway owns collection, batching, retry, and routing across the LAN boundary.

## Host Log Ingestion

EC2 Alloy agents push host logs to the reverse proxy's private Loki-compatible
gateway. The reverse proxy forwards those logs to TrueNAS Loki:

```text
reverse proxy gateway: http://<reverse-proxy-private-ip>:3100/loki/api/v1/push
TrueNAS Loki: http://192.168.66.3:3100/loki/api/v1/push
```

Do not point EC2 hosts other than the reverse proxy directly at the TrueNAS Loki
address.

## Data Retention

- VictoriaMetrics: `12` months
- Loki: `168h`
- Tempo: `168h`
- InfluxDB: no default bucket retention limit for `env_sensors`

Tune Loki and Tempo retention after real ingestion volume is known.

## Storage Monitoring

Use the `Ahara Storage Volume` dashboard to watch:

- Loki log ingest bytes and lines.
- Tempo span ingest.
- VictoriaMetrics row ingest.
- `/mnt/apps` filesystem usage.
- host disk write throughput.
- scrape health for local observability services.

## Secret Sources

Komodo receives these values from SSM via `secret-paths.yml`:

- `/ahara/observability/grafana-admin-password`
- `/ahara/observability/grafana-secret-key`
- `/ahara/observability/influxdb-admin-password`
- `/ahara/observability/influxdb-admin-token`

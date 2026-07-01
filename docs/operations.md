# Operations

## Access

Grafana is intended to be exposed through the Ahara reverse proxy at:

```text
https://dashboards.services.ahara.io
```

The managed stack listens on `192.168.66.3:30038`.

## Deployment Mode

The deployed Compose file is controlled by `truenas_compose_path` in
`platform.yml` and should remain `compose.yaml`.

Do not add a CloudWatch-only deployment mode or CloudWatch-backed product
dashboards. CloudWatch is still useful for AWS fallback logs and selected
AWS-native alarms, but the operational dashboard surface for Ahara products is
Grafana backed by Loki, Tempo, and VictoriaMetrics.

## OTLP Ingestion

TrueNAS Alloy accepts OTLP from the AWS reverse-proxy gateway and local LAN
producers:

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
TrueNAS-local services can use the LAN OTLP endpoint directly.

Application teams should instrument services with Ahara OTEL wrappers and send
traces, metrics, and logs to `/ahara/observability/otlp-http-endpoint`. New
product dashboards should target shared Grafana with Loki, Tempo, and
VictoriaMetrics datasources, not CloudWatch.

Shared cross-product telemetry dashboards live in this repo. Dashboard source
for product/domain data should stay in the repo that owns the domain data.
Product repos declare `observability.dashboards` in `platform.yml`; shared CI
invokes the Grafana dashboard deploy Lambda to upsert those dashboards without
redeploying this Grafana stack.

The dashboard deploy Lambda reads its Grafana service-account token from:

```text
/ahara/observability/grafana-dashboard-deployer-token
```

Keep that token in SSM as a SecureString. Product repos should only receive
permission to invoke the deploy Lambda, not direct access to this token.

The token is not a manually managed secret. After the TrueNAS Grafana stack
deploys, this repo's CI invokes the platform bootstrap Lambda published at:

```text
/ahara/observability/grafana-dashboard-deployer/bootstrap-function-name
```

That Lambda reaches Grafana over the private LAN, authenticates with the admin
password from `/ahara/observability/grafana-admin-password`, creates or updates
the `ahara-dashboard-deployer` service account, rotates the
`ci-dashboard-deployer` token, and writes the resulting SecureString to
`/ahara/observability/grafana-dashboard-deployer-token`. Grafana keeps basic
auth enabled for this admin API flow, while the login form remains disabled and
browser sign-in continues through Cognito OAuth auto-login.

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

## Runtime User

The Compose stack runs services as UID/GID `2401:2401` by default. Keep the
TrueNAS datasets owned by the same numeric identity:

```bash
chown -R 2401:2401 /mnt/apps/apps/ahara-observability
chmod -R u+rwX,g+rwX,o-rwx /mnt/apps/apps/ahara-observability
```

The UID/GID can be overridden with `OBSERVABILITY_UID` and `OBSERVABILITY_GID`,
but the host dataset ownership must match the values passed to Compose.

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
- `/ahara/observability/grafana-cognito-client-id`
- `/ahara/observability/grafana-cognito-client-secret`
- `/ahara/observability/grafana-secret-key`
- `/ahara/observability/influxdb-admin-password`
- `/ahara/observability/influxdb-admin-token`

The dashboard deployer token path is deliberately absent from `secret-paths.yml`;
it is consumed by the AWS dashboard deploy Lambda, not by the TrueNAS Compose
stack.

Grafana authenticates directly with Ahara Cognito using OIDC. The ALB dashboard
route should remain passthrough; otherwise users see both the ALB Cognito
challenge and Grafana's Cognito login.

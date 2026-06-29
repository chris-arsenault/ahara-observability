.PHONY: ci compose-config compose-config-cloudwatch dashboards required-files

ci: compose-config compose-config-cloudwatch dashboards required-files

compose-config:
	docker compose --env-file .env.example -f compose.yaml config >/tmp/ahara-observability-compose.yaml

compose-config-cloudwatch:
	docker compose --env-file .env.example -f compose.cloudwatch.yaml config >/tmp/ahara-observability-cloudwatch-compose.yaml

dashboards:
	find dashboards -name '*.json' -print0 | xargs -0 -n1 jq empty

required-files:
	test -f config/alloy/config.alloy
	test -f config/loki/loki.yaml
	test -f config/tempo/tempo.yaml
	test -f config/grafana/provisioning/datasources/datasources.yaml
	test -f config/grafana/provisioning/dashboards/dashboards.yaml

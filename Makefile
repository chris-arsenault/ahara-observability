.PHONY: ci compose-config dashboards plugin required-files scripts

ci: compose-config dashboards plugin scripts required-files

compose-config:
	docker compose --env-file .env.example -f compose.yaml config >/tmp/ahara-observability-compose.yaml

dashboards:
	find dashboards -name '*.json' -print0 | xargs -0 -n1 jq empty

plugin:
	npm --prefix plugins/ahara-source-panel ci
	npm --prefix plugins/ahara-source-panel run typecheck
	npm --prefix plugins/ahara-source-panel run build
	test -f plugins/ahara-source-panel/dist/module.js
	test -f plugins/ahara-source-panel/dist/plugin.json

scripts:
	find config -name '*.sh' -print0 | xargs -0 -n1 bash -n

required-files:
	test -f config/alloy/local.alloy
	test -f config/loki/loki.yaml
	test -f config/tempo/tempo.yaml
	test -f config/vmagent/prometheus.yml
	test -f config/grafana/provisioning/datasources/datasources.yaml
	test -f config/grafana/provisioning/dashboards/dashboards.yaml

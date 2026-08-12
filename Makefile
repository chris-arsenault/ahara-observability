.PHONY: ci compose-config dashboards plugin required-files scripts

ci: compose-config dashboards plugin scripts required-files

compose-config:
	docker compose --env-file .env.example -f compose.yaml config >/tmp/ahara-observability-compose.yaml

dashboards:
	find dashboards -name '*.json' -print0 | xargs -0 -n1 jq empty
	jq -e '([.panels[] | .fieldConfig.overrides[]? | .properties[]? | select(.id == "links") | .value[] | select(.title == "Inspect source in dashboard")]) as $$links | (($$links | length) == 3) and all($$links[]; (.targetBlank == false) and (.url | contains("viewPanel=") | not) and (.url | contains("var-source_kind=")) and (.url | contains("var-source_label="))) and ((.panels[] | select(.id == 7) | .title) == "File-Level Risks") and ((.panels[] | select(.id == 7) | .targets[0].rawSql) | contains("Cognitive / 100 LOC") and contains("previous_metric.scan_id IS NULL")) and ((.panels[] | select(.id == 8) | .title) == "Complex Functions") and ((.panels[] | select(.id == 8) | .targets[0].rawSql) | contains("finding.rule_key = '\''function-complexity'\''") and contains("JOIN LATERAL")) and ((.panels[] | select(.id == 9) | .title) == "Structural & Duplication Findings") and ((.panels[] | select(.id == 9) | .targets[0].rawSql) | contains("NOT IN ('\''file-complexity'\'', '\''function-complexity'\'')")) and ((.panels[] | select(.id == 11) | .targets[0].rawSql) | contains("finding_annotations")) and ((.panels[] | select(.id == 11) | .gridPos.y) < (.panels[] | select(.id == 10) | .gridPos.y))' dashboards/engineering-quality.json >/dev/null

plugin:
	npm --prefix plugins/ahara-source-panel ci
	npm --prefix plugins/ahara-source-panel test
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

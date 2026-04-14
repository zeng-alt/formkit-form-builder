const require_rules_by_scope = require("./generated/rules-by-scope.cjs");
const require_rules_by_category = require("./generated/rules-by-category.cjs");
const require_configs_by_scope = require("./generated/configs-by-scope.cjs");
const require_configs_by_category = require("./generated/configs-by-category.cjs");
const require_config_helper = require("./config-helper.cjs");
//#region src/configs.ts
var allRulesIncludingNursery = Object.assign({}, ...Object.values(require_rules_by_scope.rules_by_scope_exports));
var allRules = Object.fromEntries(Object.entries(allRulesIncludingNursery).filter(([ruleName]) => !(ruleName in require_rules_by_category.nurseryRules)));
var configs_default = {
	recommended: require_config_helper.overrideDisabledRulesForVueAndSvelteFiles({
		plugins: ["oxlint"],
		rules: require_rules_by_category.correctnessRules
	}),
	all: require_config_helper.overrideDisabledRulesForVueAndSvelteFiles({
		plugins: ["oxlint"],
		rules: allRules
	}),
	"flat/all": require_config_helper.splitDisabledRulesForVueAndSvelteFiles({
		name: "oxlint/all",
		rules: allRules
	}),
	"flat/recommended": require_config_helper.splitDisabledRulesForVueAndSvelteFiles({
		name: "oxlint/recommended",
		rules: require_rules_by_category.correctnessRules
	}),
	...require_config_helper.splitDisabledRulesForVueAndSvelteFilesDeep(require_configs_by_scope.default),
	...require_config_helper.splitDisabledRulesForVueAndSvelteFilesDeep(require_configs_by_category.default)
};
//#endregion
exports.default = configs_default;

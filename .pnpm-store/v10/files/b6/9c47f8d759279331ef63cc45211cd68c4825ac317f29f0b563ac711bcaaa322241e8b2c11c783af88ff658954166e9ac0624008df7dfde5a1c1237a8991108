const require_rules = require("./rules.cjs");
const require_categories = require("./categories.cjs");
const require_plugins = require("./plugins.cjs");
//#region src/build-from-oxlint-config/overrides.ts
var handleOverridesScope = (overrides, configs, baseCategories, options = {}) => {
	for (const [overrideIndex, override] of overrides.entries()) {
		const eslintRules = {};
		const eslintConfig = {
			name: `oxlint/from-oxlint-config-override-${overrideIndex}`,
			files: override.files
		};
		const plugins = require_plugins.readPluginsFromConfig(override);
		if (baseCategories !== void 0 && plugins !== void 0) require_categories.handleCategoriesScope(plugins, baseCategories, eslintRules, options);
		const rules = require_rules.readRulesFromConfig(override);
		if (rules !== void 0) require_rules.handleRulesScope(rules, eslintRules, options);
		eslintConfig.rules = eslintRules;
		configs.push(eslintConfig);
	}
};
var readOverridesFromConfig = (config) => {
	return "overrides" in config && Array.isArray(config.overrides) ? config.overrides : void 0;
};
//#endregion
exports.handleOverridesScope = handleOverridesScope;
exports.readOverridesFromConfig = readOverridesFromConfig;

import { handleRulesScope, readRulesFromConfig } from "./rules.mjs";
import { handleCategoriesScope } from "./categories.mjs";
import { readPluginsFromConfig } from "./plugins.mjs";
//#region src/build-from-oxlint-config/overrides.ts
var handleOverridesScope = (overrides, configs, baseCategories, options = {}) => {
	for (const [overrideIndex, override] of overrides.entries()) {
		const eslintRules = {};
		const eslintConfig = {
			name: `oxlint/from-oxlint-config-override-${overrideIndex}`,
			files: override.files
		};
		const plugins = readPluginsFromConfig(override);
		if (baseCategories !== void 0 && plugins !== void 0) handleCategoriesScope(plugins, baseCategories, eslintRules, options);
		const rules = readRulesFromConfig(override);
		if (rules !== void 0) handleRulesScope(rules, eslintRules, options);
		eslintConfig.rules = eslintRules;
		configs.push(eslintConfig);
	}
};
var readOverridesFromConfig = (config) => {
	return "overrides" in config && Array.isArray(config.overrides) ? config.overrides : void 0;
};
//#endregion
export { handleOverridesScope, readOverridesFromConfig };

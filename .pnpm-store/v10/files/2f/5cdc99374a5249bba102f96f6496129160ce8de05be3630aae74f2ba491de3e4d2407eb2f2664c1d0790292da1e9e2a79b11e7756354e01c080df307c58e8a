const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
const require_config_helper = require("../config-helper.cjs");
const require_utilities = require("./utilities.cjs");
const require_rules = require("./rules.cjs");
const require_categories = require("./categories.cjs");
const require_plugins = require("./plugins.cjs");
const require_ignore_patterns = require("./ignore-patterns.cjs");
const require_overrides = require("./overrides.cjs");
const require_extends = require("./extends.cjs");
let node_path = require("node:path");
node_path = require_runtime.__toESM(node_path);
//#region src/build-from-oxlint-config/index.ts
/**
* builds turned off rules, which are supported by oxlint.
* It accepts an object similar to the .oxlintrc.json file.
*/
var buildFromOxlintConfig = (config, options = {}) => {
	if (config.options?.typeAware === true && options.typeAware === void 0) options.typeAware = true;
	require_extends.resolveRelativeExtendsPaths(config);
	const extendConfigs = require_extends.readExtendsConfigsFromConfig(config);
	if (extendConfigs.length > 0) require_extends.handleExtendsScope(extendConfigs, config);
	const rules = {};
	const plugins = require_plugins.readPluginsFromConfig(config) ?? require_plugins.defaultPlugins;
	const categories = require_categories.readCategoriesFromConfig(config) ?? require_categories.defaultCategories;
	plugins.push("eslint");
	if (plugins.includes("react")) plugins.push("react-hooks");
	require_categories.handleCategoriesScope(plugins, categories, rules, options);
	const configRules = require_rules.readRulesFromConfig(config);
	if (configRules !== void 0) require_rules.handleRulesScope(configRules, rules, options);
	const baseConfig = {
		name: "oxlint/from-oxlint-config",
		rules
	};
	const overrides = require_overrides.readOverridesFromConfig(config);
	const configs = require_config_helper.splitDisabledRulesForVueAndSvelteFiles(baseConfig);
	if (overrides !== void 0) require_overrides.handleOverridesScope(overrides, configs, categories, options);
	const ignorePatterns = require_ignore_patterns.readIgnorePatternsFromConfig(config);
	if (ignorePatterns === void 0) return configs;
	else {
		const ignoreConfig = { name: "oxlint/oxlint-config-ignore-patterns" };
		require_ignore_patterns.handleIgnorePatternsScope(ignorePatterns, ignoreConfig);
		return [ignoreConfig, ...configs];
	}
};
/**
* builds turned off rules, which are supported by oxlint.
* It accepts an filepath to the .oxlintrc.json file.
*
* It the .oxlintrc.json file could not be found or parsed,
* no rules will be deactivated and an error to `console.error` will be emitted
*/
var buildFromOxlintConfigFile = (oxlintConfigFile, options = {}) => {
	const config = require_utilities.getConfigContent(oxlintConfigFile);
	if (config === void 0) return [];
	config.__misc = { filePath: node_path.default.resolve(oxlintConfigFile) };
	return buildFromOxlintConfig(config, options);
};
//#endregion
exports.buildFromOxlintConfig = buildFromOxlintConfig;
exports.buildFromOxlintConfigFile = buildFromOxlintConfigFile;

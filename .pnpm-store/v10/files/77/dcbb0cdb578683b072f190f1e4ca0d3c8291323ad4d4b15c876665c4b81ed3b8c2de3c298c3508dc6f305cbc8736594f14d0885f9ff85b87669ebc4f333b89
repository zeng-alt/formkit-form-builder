import { splitDisabledRulesForVueAndSvelteFiles } from "../config-helper.mjs";
import { getConfigContent } from "./utilities.mjs";
import { handleRulesScope, readRulesFromConfig } from "./rules.mjs";
import { defaultCategories, handleCategoriesScope, readCategoriesFromConfig } from "./categories.mjs";
import { defaultPlugins, readPluginsFromConfig } from "./plugins.mjs";
import { handleIgnorePatternsScope, readIgnorePatternsFromConfig } from "./ignore-patterns.mjs";
import { handleOverridesScope, readOverridesFromConfig } from "./overrides.mjs";
import { handleExtendsScope, readExtendsConfigsFromConfig, resolveRelativeExtendsPaths } from "./extends.mjs";
import path from "node:path";
//#region src/build-from-oxlint-config/index.ts
/**
* builds turned off rules, which are supported by oxlint.
* It accepts an object similar to the .oxlintrc.json file.
*/
var buildFromOxlintConfig = (config, options = {}) => {
	if (config.options?.typeAware === true && options.typeAware === void 0) options.typeAware = true;
	resolveRelativeExtendsPaths(config);
	const extendConfigs = readExtendsConfigsFromConfig(config);
	if (extendConfigs.length > 0) handleExtendsScope(extendConfigs, config);
	const rules = {};
	const plugins = readPluginsFromConfig(config) ?? defaultPlugins;
	const categories = readCategoriesFromConfig(config) ?? defaultCategories;
	plugins.push("eslint");
	if (plugins.includes("react")) plugins.push("react-hooks");
	handleCategoriesScope(plugins, categories, rules, options);
	const configRules = readRulesFromConfig(config);
	if (configRules !== void 0) handleRulesScope(configRules, rules, options);
	const baseConfig = {
		name: "oxlint/from-oxlint-config",
		rules
	};
	const overrides = readOverridesFromConfig(config);
	const configs = splitDisabledRulesForVueAndSvelteFiles(baseConfig);
	if (overrides !== void 0) handleOverridesScope(overrides, configs, categories, options);
	const ignorePatterns = readIgnorePatternsFromConfig(config);
	if (ignorePatterns === void 0) return configs;
	else {
		const ignoreConfig = { name: "oxlint/oxlint-config-ignore-patterns" };
		handleIgnorePatternsScope(ignorePatterns, ignoreConfig);
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
	const config = getConfigContent(oxlintConfigFile);
	if (config === void 0) return [];
	config.__misc = { filePath: path.resolve(oxlintConfigFile) };
	return buildFromOxlintConfig(config, options);
};
//#endregion
export { buildFromOxlintConfig, buildFromOxlintConfigFile };

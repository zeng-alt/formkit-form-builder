const require_constants = require("./constants.cjs");
//#region src/config-helper.ts
var overrideDisabledRulesForVueAndSvelteFiles = (config) => {
	const foundRules = Object.keys(config.rules).filter((rule) => require_constants.rulesDisabledForVueAndSvelteFiles.includes(rule));
	if (foundRules.length === 0) return config;
	const newConfig = structuredClone(config);
	newConfig.overrides = [{
		files: ["*.*"],
		excludedFiles: ["*.vue", "*.svelte"],
		rules: {}
	}];
	for (const rule of foundRules) {
		delete newConfig.rules[rule];
		newConfig.overrides[0].rules[rule] = "off";
	}
	return newConfig;
};
var splitDisabledRulesForVueAndSvelteFiles = (config) => {
	const foundRules = Object.keys(config.rules).filter((rule) => require_constants.rulesDisabledForVueAndSvelteFiles.includes(rule));
	if (foundRules.length === 0) return [config];
	const oldConfig = structuredClone(config);
	const newConfig = {
		name: "oxlint/vue-svelte-exceptions",
		ignores: ["**/*.vue", "**/*.svelte"],
		rules: {}
	};
	for (const rule of foundRules) {
		delete oldConfig.rules[rule];
		newConfig.rules[rule] = "off";
	}
	return [oldConfig, newConfig];
};
var splitDisabledRulesForVueAndSvelteFilesDeep = (config) => {
	const result = {};
	for (const name in config) result[name] = splitDisabledRulesForVueAndSvelteFiles(config[name]);
	return result;
};
//#endregion
exports.overrideDisabledRulesForVueAndSvelteFiles = overrideDisabledRulesForVueAndSvelteFiles;
exports.splitDisabledRulesForVueAndSvelteFiles = splitDisabledRulesForVueAndSvelteFiles;
exports.splitDisabledRulesForVueAndSvelteFilesDeep = splitDisabledRulesForVueAndSvelteFilesDeep;

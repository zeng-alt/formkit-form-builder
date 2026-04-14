const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
const require_utilities = require("./utilities.cjs");
const require_rules = require("./rules.cjs");
const require_plugins = require("./plugins.cjs");
const require_overrides = require("./overrides.cjs");
let node_path = require("node:path");
node_path = require_runtime.__toESM(node_path);
//#region src/build-from-oxlint-config/extends.ts
/**
* tries to return the "extends" section from the config.
* it returns `undefined` when not found or invalid.
*/
var readExtendsFromConfig = (config) => {
	return "extends" in config && Array.isArray(config.extends) ? config.extends : void 0;
};
/**
* Resolves the paths of the "extends" section relative to the given config file.
*/
var resolveRelativeExtendsPaths = (config) => {
	if (!config.__misc?.filePath) return;
	const extendsFiles = readExtendsFromConfig(config);
	if (!extendsFiles?.length) return;
	const configFileDirectory = node_path.default.dirname(config.__misc.filePath);
	config.extends = extendsFiles.map((extendFile) => {
		if (typeof extendFile === "string") return node_path.default.resolve(configFileDirectory, extendFile);
		return extendFile;
	});
};
/**
* Appends plugins, rules and overrides from the extends configs files to the given config.
*/
var handleExtendsScope = (extendsConfigs, config) => {
	let rules = require_rules.readRulesFromConfig(config) ?? {};
	const plugins = require_plugins.readPluginsFromConfig(config) ?? [];
	const overrides = require_overrides.readOverridesFromConfig(config) ?? [];
	for (const extendConfig of extendsConfigs) {
		plugins.unshift(...require_plugins.readPluginsFromConfig(extendConfig) ?? require_plugins.defaultPlugins);
		rules = {
			...require_rules.readRulesFromConfig(extendConfig),
			...rules
		};
		overrides.unshift(...require_overrides.readOverridesFromConfig(extendConfig) ?? []);
	}
	if (plugins.length > 0) config.plugins = [...new Set(plugins)];
	if (Object.keys(rules).length > 0) config.rules = rules;
	if (overrides.length > 0) config.overrides = overrides;
};
/**
* tries to return the content of the chain "extends" section from the config.
*/
var readExtendsConfigsFromConfig = (config) => {
	const extendsFiles = readExtendsFromConfig(config);
	if (!extendsFiles?.length) return [];
	const extendsConfigs = [];
	for (const file of extendsFiles) {
		if (typeof file !== "string") {
			const extended = readExtendsConfigsFromConfig(file);
			delete file.extends;
			extendsConfigs.push(file, ...extended);
			continue;
		}
		const extendConfig = require_utilities.getConfigContent(file);
		if (!extendConfig) continue;
		extendConfig.__misc = { filePath: file };
		resolveRelativeExtendsPaths(extendConfig);
		const extended = readExtendsConfigsFromConfig(extendConfig);
		delete extendConfig.extends;
		extendsConfigs.push(extendConfig, ...extended);
	}
	return extendsConfigs;
};
//#endregion
exports.handleExtendsScope = handleExtendsScope;
exports.readExtendsConfigsFromConfig = readExtendsConfigsFromConfig;
exports.resolveRelativeExtendsPaths = resolveRelativeExtendsPaths;

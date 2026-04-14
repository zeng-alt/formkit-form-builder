import { getConfigContent } from "./utilities.mjs";
import { readRulesFromConfig } from "./rules.mjs";
import { defaultPlugins, readPluginsFromConfig } from "./plugins.mjs";
import { readOverridesFromConfig } from "./overrides.mjs";
import path from "node:path";
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
	const configFileDirectory = path.dirname(config.__misc.filePath);
	config.extends = extendsFiles.map((extendFile) => {
		if (typeof extendFile === "string") return path.resolve(configFileDirectory, extendFile);
		return extendFile;
	});
};
/**
* Appends plugins, rules and overrides from the extends configs files to the given config.
*/
var handleExtendsScope = (extendsConfigs, config) => {
	let rules = readRulesFromConfig(config) ?? {};
	const plugins = readPluginsFromConfig(config) ?? [];
	const overrides = readOverridesFromConfig(config) ?? [];
	for (const extendConfig of extendsConfigs) {
		plugins.unshift(...readPluginsFromConfig(extendConfig) ?? defaultPlugins);
		rules = {
			...readRulesFromConfig(extendConfig),
			...rules
		};
		overrides.unshift(...readOverridesFromConfig(extendConfig) ?? []);
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
		const extendConfig = getConfigContent(file);
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
export { handleExtendsScope, readExtendsConfigsFromConfig, resolveRelativeExtendsPaths };

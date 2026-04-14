import { rules_by_category_exports } from "../generated/rules-by-category.mjs";
import { aliasPluginNames } from "../constants.mjs";
import { isObject } from "./utilities.mjs";
//#region src/build-from-oxlint-config/categories.ts
var defaultCategories = { correctness: "warn" };
/**
* appends all rules which are enabled by a plugin and falls into a specific category
*/
var handleCategoriesScope = (plugins, categories, rules, options = {}) => {
	for (const category in categories) {
		const configName = `${category}Rules`;
		if (category === "nursery" && !options.withNursery) continue;
		if (categories[category] === "off" || !(configName in rules_by_category_exports)) continue;
		const possibleRules = [];
		const typeAwareConfigName = `${category}TypeAwareRules`;
		if (options.typeAware && typeAwareConfigName in rules_by_category_exports) possibleRules.push(...Object.keys(rules_by_category_exports[typeAwareConfigName]));
		possibleRules.push(...Object.keys(rules_by_category_exports[configName]));
		for (const rule of possibleRules) for (const plugin of plugins) {
			const pluginPrefix = plugin in aliasPluginNames ? aliasPluginNames[plugin] : plugin;
			if (pluginPrefix === "" && !rule.includes("/")) rules[rule] = "off";
			else if (rule.startsWith(`${pluginPrefix}/`)) rules[rule] = "off";
		}
	}
};
/**
* tries to return the "categories" section from the config.
* it returns `undefined` when not found or invalid.
*/
var readCategoriesFromConfig = (config) => {
	return "categories" in config && isObject(config.categories) ? config.categories : void 0;
};
//#endregion
export { defaultCategories, handleCategoriesScope, readCategoriesFromConfig };

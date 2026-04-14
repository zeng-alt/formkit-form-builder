const require_rules_by_category = require("../generated/rules-by-category.cjs");
const require_constants = require("../constants.cjs");
const require_utilities = require("./utilities.cjs");
//#region src/build-from-oxlint-config/categories.ts
var defaultCategories = { correctness: "warn" };
/**
* appends all rules which are enabled by a plugin and falls into a specific category
*/
var handleCategoriesScope = (plugins, categories, rules, options = {}) => {
	for (const category in categories) {
		const configName = `${category}Rules`;
		if (category === "nursery" && !options.withNursery) continue;
		if (categories[category] === "off" || !(configName in require_rules_by_category.rules_by_category_exports)) continue;
		const possibleRules = [];
		const typeAwareConfigName = `${category}TypeAwareRules`;
		if (options.typeAware && typeAwareConfigName in require_rules_by_category.rules_by_category_exports) possibleRules.push(...Object.keys(require_rules_by_category.rules_by_category_exports[typeAwareConfigName]));
		possibleRules.push(...Object.keys(require_rules_by_category.rules_by_category_exports[configName]));
		for (const rule of possibleRules) for (const plugin of plugins) {
			const pluginPrefix = plugin in require_constants.aliasPluginNames ? require_constants.aliasPluginNames[plugin] : plugin;
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
	return "categories" in config && require_utilities.isObject(config.categories) ? config.categories : void 0;
};
//#endregion
exports.defaultCategories = defaultCategories;
exports.handleCategoriesScope = handleCategoriesScope;
exports.readCategoriesFromConfig = readCategoriesFromConfig;

const require_rules_by_category = require("../generated/rules-by-category.cjs");
const require_constants = require("../constants.cjs");
const require_utilities = require("./utilities.cjs");
//#region src/build-from-oxlint-config/rules.ts
var allRules = Object.values(require_rules_by_category.rules_by_category_exports).flatMap((rulesObject) => Object.keys(rulesObject));
var typeAwareRules = new Set(Object.entries(require_rules_by_category.rules_by_category_exports).filter(([key]) => key.endsWith("TypeAwareRules")).flatMap(([, rulesObject]) => Object.keys(rulesObject)));
var getEsLintRuleName = (rule, options = {}) => {
	if (!rule.includes("/")) {
		const found = allRules.find((search) => search.endsWith(`/${rule}`) || search === rule);
		if (!found) return;
		if (!options.withNursery && found in require_rules_by_category.nurseryRules) return;
		if (!options.typeAware && typeAwareRules.has(found)) return;
		return found;
	}
	const match = rule.match(/(^.*)\/(.*)/);
	if (match === null) return;
	const pluginName = match[1];
	const ruleName = match[2];
	let esPluginName = pluginName in require_constants.aliasPluginNames ? require_constants.aliasPluginNames[pluginName] : pluginName;
	if (esPluginName === "react" && require_constants.reactHookRulesInsideReactScope.includes(ruleName)) esPluginName = "react-hooks";
	if (esPluginName === "react" && ruleName == "only-export-components") esPluginName = "react-refresh";
	const expectedRule = esPluginName === "" ? ruleName : `${esPluginName}/${ruleName}`;
	const found = allRules.find((rule) => rule === expectedRule);
	if (!found) return;
	if (!options.withNursery && found in require_rules_by_category.nurseryRules) return;
	if (!options.typeAware && typeAwareRules.has(found)) return;
	return found;
};
/**
* checks if value is validSet, or if validSet is an array, check if value is first value of it
*/
var isValueInSet = (value, validSet) => validSet.includes(value) || Array.isArray(value) && validSet.includes(value[0]);
/**
* check if the value is "off", 0, ["off", ...], or [0, ...]
*/
var isDeactivateValue = (value) => isValueInSet(value, ["off", 0]);
/**
* check if the value is "error", "warn", 1, 2, ["error", ...], ["warn", ...], [1, ...], or [2, ...]
*/
var isActiveValue = (value) => isValueInSet(value, [
	"error",
	"warn",
	1,
	2
]);
/**
* checks if the oxlint rule is activated/deactivated and append/remove it.
*/
var handleRulesScope = (oxlintRules, rules, options = {}) => {
	for (const rule in oxlintRules) {
		const eslintName = getEsLintRuleName(rule, options);
		if (eslintName === void 0) continue;
		if (isActiveValue(oxlintRules[rule])) {
			rules[eslintName] = "off";
			if (!eslintName.includes("/") && require_constants.typescriptRulesExtendEslintRules.includes(eslintName)) {
				const tsAlias = `@typescript-eslint/${eslintName}`;
				if (allRules.includes(tsAlias)) rules[tsAlias] = "off";
			}
			if (eslintName.startsWith("@typescript-eslint/")) {
				const baseRule = eslintName.replace("@typescript-eslint/", "");
				if (require_constants.typescriptRulesExtendEslintRules.includes(baseRule) && allRules.includes(baseRule)) rules[baseRule] = "off";
			}
		} else if (rule in rules && isDeactivateValue(oxlintRules[rule])) {
			delete rules[eslintName];
			if (!eslintName.includes("/") && require_constants.typescriptRulesExtendEslintRules.includes(eslintName)) {
				const tsAlias = `@typescript-eslint/${eslintName}`;
				if (tsAlias in rules) delete rules[tsAlias];
			}
			if (eslintName.startsWith("@typescript-eslint/")) {
				const baseRule = eslintName.replace("@typescript-eslint/", "");
				if (baseRule in rules) delete rules[baseRule];
			}
		}
	}
};
/**
* tries to return the "rules" section from the config.
* it returns `undefined` when not found or invalid.
*/
var readRulesFromConfig = (config) => {
	return "rules" in config && require_utilities.isObject(config.rules) ? config.rules : void 0;
};
//#endregion
exports.handleRulesScope = handleRulesScope;
exports.readRulesFromConfig = readRulesFromConfig;

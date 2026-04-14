import { rules_by_scope_exports } from "./generated/rules-by-scope.mjs";
import { correctnessRules, nurseryRules } from "./generated/rules-by-category.mjs";
import configByScope from "./generated/configs-by-scope.mjs";
import configByCategory from "./generated/configs-by-category.mjs";
import { overrideDisabledRulesForVueAndSvelteFiles, splitDisabledRulesForVueAndSvelteFiles, splitDisabledRulesForVueAndSvelteFilesDeep } from "./config-helper.mjs";
//#region src/configs.ts
var allRulesIncludingNursery = Object.assign({}, ...Object.values(rules_by_scope_exports));
var allRules = Object.fromEntries(Object.entries(allRulesIncludingNursery).filter(([ruleName]) => !(ruleName in nurseryRules)));
var configs_default = {
	recommended: overrideDisabledRulesForVueAndSvelteFiles({
		plugins: ["oxlint"],
		rules: correctnessRules
	}),
	all: overrideDisabledRulesForVueAndSvelteFiles({
		plugins: ["oxlint"],
		rules: allRules
	}),
	"flat/all": splitDisabledRulesForVueAndSvelteFiles({
		name: "oxlint/all",
		rules: allRules
	}),
	"flat/recommended": splitDisabledRulesForVueAndSvelteFiles({
		name: "oxlint/recommended",
		rules: correctnessRules
	}),
	...splitDisabledRulesForVueAndSvelteFilesDeep(configByScope),
	...splitDisabledRulesForVueAndSvelteFilesDeep(configByCategory)
};
//#endregion
export { configs_default as default };

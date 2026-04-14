const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
let node_fs = require("node:fs");
node_fs = require_runtime.__toESM(node_fs);
let jsonc_parser = require("jsonc-parser");
//#region src/build-from-oxlint-config/utilities.ts
/**
* Detects it the value is an object
*/
var isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
/**
* tries to read the oxlint config file and returning its JSON content.
* if the file is not found or could not be parsed, undefined is returned.
* And an error message will be emitted to `console.error`
*/
var getConfigContent = (oxlintConfigFile) => {
	try {
		const content = node_fs.default.readFileSync(oxlintConfigFile, "utf8");
		try {
			const configContent = (0, jsonc_parser.parse)(content);
			if (!isObject(configContent)) throw new TypeError("not an valid config file");
			return configContent;
		} catch {
			console.error(`eslint-plugin-oxlint: could not parse oxlint config file: ${oxlintConfigFile}`);
			return;
		}
	} catch {
		console.error(`eslint-plugin-oxlint: could not find oxlint config file: ${oxlintConfigFile}`);
		return;
	}
};
//#endregion
exports.getConfigContent = getConfigContent;
exports.isObject = isObject;

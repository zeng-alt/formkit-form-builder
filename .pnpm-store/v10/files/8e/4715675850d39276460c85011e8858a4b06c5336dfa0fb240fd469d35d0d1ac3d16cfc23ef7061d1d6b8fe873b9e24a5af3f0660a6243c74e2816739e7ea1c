//#region src/build-from-oxlint-config/ignore-patterns.ts
/**
* adds the ignore patterns to the config
*/
var handleIgnorePatternsScope = (ignorePatterns, config) => {
	config.ignores = ignorePatterns;
};
/**
* tries to return the "ignorePattern" section from the config.
* it returns `undefined` when not found or invalid.
*/
var readIgnorePatternsFromConfig = (config) => {
	return "ignorePatterns" in config && Array.isArray(config.ignorePatterns) ? config.ignorePatterns : void 0;
};
//#endregion
exports.handleIgnorePatternsScope = handleIgnorePatternsScope;
exports.readIgnorePatternsFromConfig = readIgnorePatternsFromConfig;

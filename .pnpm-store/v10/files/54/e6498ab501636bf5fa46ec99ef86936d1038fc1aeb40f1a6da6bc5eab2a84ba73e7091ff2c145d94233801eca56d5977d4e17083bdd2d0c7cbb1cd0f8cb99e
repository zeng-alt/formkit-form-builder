//#region src/build-from-oxlint-config/plugins.ts
var defaultPlugins = ["unicorn", "typescript"];
/**
* tries to return the "plugins" section from the config.
* it returns `undefined` when not found or invalid.
*/
var readPluginsFromConfig = (config) => {
	return "plugins" in config && Array.isArray(config.plugins) ? config.plugins : void 0;
};
//#endregion
export { defaultPlugins, readPluginsFromConfig };

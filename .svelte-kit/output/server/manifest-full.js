export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "obbba-scatter/_app",
	assets: new Set(["household_tax_income_changes_senate_current_law_baseline.csv"]),
	mimeTypes: {".csv":"text/csv"},
	_: {
		client: {start:"_app/immutable/entry/start.sSqjIpwT.js",app:"_app/immutable/entry/app.drSDwt1k.js",imports:["_app/immutable/entry/start.sSqjIpwT.js","_app/immutable/chunks/lKdqf9M1.js","_app/immutable/chunks/DJJb56M5.js","_app/immutable/chunks/hF6vYYgm.js","_app/immutable/entry/app.drSDwt1k.js","_app/immutable/chunks/hF6vYYgm.js","_app/immutable/chunks/DJJb56M5.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/D7N969Ix.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

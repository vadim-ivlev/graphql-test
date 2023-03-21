// import App from './App.svelte';


// var app = new App({
// 	target: document.body
// });

// export default app;

import AppTabbed from './AppTabbed.svelte';


var app = new AppTabbed({
	target: document.getElementById('graphql-test') ? document.getElementById('graphql-test') : document.body
});

export default app;

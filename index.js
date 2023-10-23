// Require the adapter
const { run } = require('@probot/adapter-github-actions');

// Require your Probot app's entrypoint
const app = require('probot-settings');

// Adapt the Probot app for Actions
// This also acts as the main entrypoint for the Action
console.debug(`app = ${app}`);
run(app).catch((error) => {
  console.error(error);
  process.exit(1);
});

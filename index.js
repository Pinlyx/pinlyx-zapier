// Entry point for Zapier's runtime.
//
// This file has to exist, and has to be here. The generated `zapierwrapper.js` loads
// `path.resolve(__dirname, 'index.js')` literally and never reads `main` from
// package.json, and the build's "smart inclusion" walks the require tree from this same
// file to decide what to ship. Without it the zip contains no integration code at all
// and every call fails with "Cannot find module '/var/task/index.js'".
//
// The compiled output stays in lib/ (git-ignored); this is the one hand-written file at
// the root, and it is deliberately a single require so the build can follow it.
module.exports = require('./lib/src/index.js');

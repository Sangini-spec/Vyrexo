const fs = require("fs");
const path = require("path");

const standaloneServer = path.join(__dirname, ".next", "standalone", "server.js");
const frontendStandaloneServer = path.join(
  __dirname,
  "frontend",
  ".next",
  "standalone",
  "frontend",
  "server.js"
);

if (fs.existsSync(standaloneServer)) {
  require(standaloneServer);
} else if (fs.existsSync(frontendStandaloneServer)) {
  require(frontendStandaloneServer);
} else {
  console.error(
    "Production standalone server not found. Run `npm run build` before `npm start`."
  );
  process.exit(1);
}

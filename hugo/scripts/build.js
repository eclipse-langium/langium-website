import { execSync, spawnSync } from "child_process";
import { dirname, resolve } from "path";

const baseUrl = getBaseUrl();
console.log(`Building website for location '${baseUrl}'...`);
performHugoBuild(baseUrl);

function getBaseUrl() {
  return process.env["BASE_URL"] || "/";
}

function performHugoBuild(rootDir) {
  const executable = resolve(dirname(process.execPath), "npx");
  spawnSync(executable, ["hugo", "--config", "config.toml", "-b", rootDir, "-d", "../public", "--gc", "--minify"], {
    shell: true,
    stdio: "inherit",
  });
}

import { execSync } from "node:child_process";

/**
 * Frees the ports the responsive sweep needs.
 *
 * The sweep serves the production build and owns its own backend, both
 * with `reuseExistingServer: false`, so it always tests a freshly built
 * bundle against a freshly started API. Without this step Playwright aborts
 * with "http://localhost:5173 is already used" whenever a previous run was
 * interrupted and left a server behind — and worse, it can leave the sweep
 * talking to a backend that dies mid-run and hangs every request.
 *
 * This has to run as a separate step rather than Playwright's `globalSetup`,
 * because Playwright checks the webServer port before globalSetup runs.
 *
 * The client port has to be 5173 because the backend validates the request
 * `Origin` against `CLIENT_URL` (default http://localhost:5173) and rejects
 * anything else with a 403.
 */
const PORTS = [process.env.SWEEP_PORT || "5173", "4000"];

/**
 * Finds the PIDs listening on a port.
 *
 * Note: `netstat -ano -p tcp` omits IPv6 rows, and Vite binds `[::1]`, so
 * the plain `netstat -ano` output is used and the LOCAL address column is
 * matched exactly. The remote address is ignored so an unrelated outbound
 * connection to the same port is never mistaken for the listener.
 */
function listeningPids(port) {
  const output = execSync("netstat -ano", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 8 * 1024 * 1024,
  });

  const pids = new Set();

  for (const line of output.split("\n")) {
    if (!/LISTENING/i.test(line)) continue;

    const parts = line.trim().split(/\s+/);
    const localAddress = parts[1] || "";
    const pid = parts[parts.length - 1] || "";

    if (!localAddress.endsWith(`:${port}`)) continue;
    if (!/^\d+$/.test(pid) || Number(pid) === 0) continue;

    pids.add(pid);
  }

  return [...pids];
}

function freePortOnWindows(port) {
  for (const pid of listeningPids(port)) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
      console.log(`[sweep] freed port ${port} (pid ${pid})`);
    } catch {
      // The process may have exited on its own.
    }
  }
}

function freePortOnUnix(port) {
  try {
    execSync(`lsof -ti tcp:${port} | xargs -r kill -9`, { stdio: "ignore" });
    console.log(`[sweep] freed port ${port}`);
  } catch {
    // Nothing is listening — nothing to free.
  }
}

for (const port of PORTS) {
  if (process.platform === "win32") freePortOnWindows(port);
  else freePortOnUnix(port);
}

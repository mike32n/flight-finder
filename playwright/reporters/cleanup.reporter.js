const { rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { basename, dirname, resolve } = require("node:path");

class CleanupReporter {
  constructor({ directory }) {
    this.directory = resolve(directory);
  }

  printsToStdio() {
    return false;
  }

  async onExit() {
    try {
      if (
        dirname(this.directory) !== resolve(tmpdir()) ||
        !/^flight-finder-e2e-[A-Za-z0-9]+$/.test(basename(this.directory))
      ) {
        throw new Error(`Unexpected E2E directory: ${this.directory}`);
      }

      await rm(this.directory, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100,
      });

      console.log(`[E2E] Removed temporary directory: ${this.directory}`);
    } catch (error) {
      console.error("[E2E] Temporary directory cleanup failed:", error);
    }
  }
}

module.exports = CleanupReporter;

import { defineConfig } from "@playwright/test";
import base from "./mermas.config.js";

export default defineConfig({
  ...base,
  testMatch: "solicitudes.spec.js",
});

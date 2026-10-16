// Resolve official modular APIs from the backend dependency tree.
import { createRequire } from "node:module";
const require = createRequire(new URL("../../functions/package.json", import.meta.url));
export const adminApps = require("firebase-admin/app");
export const adminFirestore = require("firebase-admin/firestore");
export const adminAuth = require("firebase-admin/auth");

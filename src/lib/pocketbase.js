import PocketBase from "pocketbase";

const url = import.meta.env.PUBLIC_POCKETBASE_URL;

// The deployed site is served over HTTPS, so browsers block an http:// API as
// mixed content, and auth tokens would travel unencrypted.
if (import.meta.env.PROD && !url?.startsWith("https://")) {
  throw new Error(
    `PUBLIC_POCKETBASE_URL must be an https:// URL for production builds (got "${url}")`
  );
}

export const pb = new PocketBase(url);

// Build-time pages and components fire several requests at once.
pb.autoCancellation(false);

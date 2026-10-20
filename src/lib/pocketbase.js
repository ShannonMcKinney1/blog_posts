import PocketBase from "pocketbase";

export const pb = new PocketBase(import.meta.env.PUBLIC_POCKETBASE_URL);

// Build-time pages and components fire several requests at once.
pb.autoCancellation(false);

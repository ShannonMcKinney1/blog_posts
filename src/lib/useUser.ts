import { useState, useEffect } from "react";
import { pb } from "./pocketbase";

// Current signed-in user record (or null), kept in sync with the PocketBase auth store.
export function useUser() {
  const [user, setUser] = useState(() => pb.authStore.record);
  useEffect(() => pb.authStore.onChange(() => setUser(pb.authStore.record)), []);
  return user;
}

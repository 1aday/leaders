"use client";

import { useEffect } from "react";

/**
 * Clear old localStorage keys from the previous localStorage-first architecture.
 * Runs once on app mount to clean up migration artifacts.
 */
export function ClearOldStorage() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Clear main leaders storage
      localStorage.removeItem("profilemaker.leaders.v1");

      // Clear deleted IDs tracking
      localStorage.removeItem("profilemaker.deletedLeaderIds.v1");

      // Clear all old chat keys (pattern match)
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("profilemaker.leaderChat.v1.")) {
          localStorage.removeItem(key);
        }
      });
    }
  }, []);

  return null;
}

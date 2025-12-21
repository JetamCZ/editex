import { useState, useCallback } from "react";
import type { UserPresenceMessage } from "~/types/collaboration";

export interface ActiveUser extends UserPresenceMessage {
  color: string;
}

const USER_COLORS = [
  "#ef4444", // red
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

const usePresenceUsers = () => {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

  // Handle user presence updates
  const handlePresenceUpdate = useCallback((presence: UserPresenceMessage) => {
    console.log("👥 Presence update:", presence);

    setActiveUsers((prev) => {
      const filtered = prev.filter((u) => u.userId !== presence.userId);

      if (presence.status === "JOINED" || presence.status === "EDITING") {
        // Assign a color to this user
        const colorIndex = (presence.userId || 0) % USER_COLORS.length;
        const userWithColor: ActiveUser = {
          ...presence,
          color: USER_COLORS[colorIndex],
        };
        return [...filtered, userWithColor];
      } else if (presence.status === "LEFT") {
        return filtered;
      }

      return prev;
    });
  }, []);

  return { activeUsers, handlePresenceUpdate };
};

export default usePresenceUsers;

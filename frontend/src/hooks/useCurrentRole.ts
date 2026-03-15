import { useWorkspaceStore } from "../stores/useWorkspaceStore";

export const useCurrentRole = () => {
  const { activeWorkspace } = useWorkspaceStore();
  const role = activeWorkspace?.role || "VIEWER"; // Fallback if missing

  return {
    role,
    isOwner: role === "OWNER",
    isAdmin: role === "OWNER" || role === "ADMIN",
    isMember: role === "OWNER" || role === "ADMIN" || role === "MEMBER",
    isViewer: role === "VIEWER",
  };
};

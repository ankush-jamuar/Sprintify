import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function useKeyboardShortcuts(onSearchToggle: () => void) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K for Search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onSearchToggle();
      }
      
      // Ctrl+N or Cmd+N for New Project (since new task is usually project specific, we can just redirect to projects)
      // Actually, standard is maybe we just handle modal opens if we had global modals.
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
         // Optionally handle new items here
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearchToggle, navigate]);
}

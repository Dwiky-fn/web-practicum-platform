import { useNavigate, useLocation } from "react-router-dom";

export interface BackNavigationOptions {
  parentPath: string;
  fallbackPath?: string;
  preserveQueryParams?: string[];
}

export function useBackNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = (options: BackNavigationOptions) => {
    const { parentPath, fallbackPath = "/dashboard", preserveQueryParams = [] } = options;

    // Resolve query parameters to preserve
    const currentParams = new URLSearchParams(location.search);
    const targetParams = new URLSearchParams();

    preserveQueryParams.forEach((param) => {
      const value = currentParams.get(param);
      if (value) {
        targetParams.set(param, value);
      }
    });

    // Check if parentPath is valid (doesn't contain undefined/null)
    let resolvedParent = parentPath;
    if (
      !resolvedParent ||
      resolvedParent.includes("undefined") ||
      resolvedParent.includes("null") ||
      resolvedParent.includes("//")
    ) {
      resolvedParent = fallbackPath;
    }

    // Verify parent is valid
    if (
      !resolvedParent ||
      resolvedParent.includes("undefined") ||
      resolvedParent.includes("null") ||
      resolvedParent.includes("//")
    ) {
      resolvedParent = "/dashboard";
    }

    const queryStr = targetParams.toString();
    const finalTarget = queryStr ? `${resolvedParent}?${queryStr}` : resolvedParent;

    // Prevent navigation loop: if target matches current page exactly, go to fallback
    const currentPath = location.pathname;
    const normalize = (p: string) => p.replace(/\/+$/, "").split("?")[0];

    let targetPath = finalTarget;
    if (normalize(resolvedParent) === normalize(currentPath)) {
      let resolvedFallback = fallbackPath;
      if (
        !resolvedFallback ||
        resolvedFallback.includes("undefined") ||
        resolvedFallback.includes("null") ||
        resolvedFallback.includes("//")
      ) {
        resolvedFallback = "/dashboard";
      }
      targetPath = queryStr ? `${resolvedFallback}?${queryStr}` : resolvedFallback;
    }

    navigate(targetPath);
  };

  return { handleBack, goBackToParent: handleBack };
}

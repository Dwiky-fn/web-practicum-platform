import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

interface ScrollToTopButtonProps {
  targetRef?: React.RefObject<HTMLElement | null>;
  threshold?: number;
}

export default function ScrollToTopButton({
  targetRef,
  threshold = 300,
}: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // If targetRef is provided, we listen to its container scroll.
    // Otherwise, we default to window scroll.
    const scrollTarget = targetRef ? targetRef.current : window;
    if (!scrollTarget) return;

    function getScrollTop() {
      if (targetRef?.current) {
        return targetRef.current.scrollTop;
      }
      return window.scrollY;
    }

    function handleScroll() {
      setIsVisible(getScrollTop() > threshold);
    }

    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
    
    // Call handler once to initialize visibility state
    handleScroll();

    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
    };
  }, [targetRef, targetRef?.current, threshold]);

  function scrollToTop() {
    if (targetRef?.current) {
      targetRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Kembali ke atas"
      title="Kembali ke atas"
      className={`fixed z-50 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-900/20 hover:bg-blue-700 hover:shadow-blue-900/30 active:bg-blue-800 transition-all duration-300 ease-in-out cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500
        right-6 bottom-6 w-11 h-11
        max-sm:right-4 max-sm:bottom-4 max-sm:w-10 max-sm:h-10
        ${
          isVisible
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-4 scale-90 pointer-events-none"
        }`}
    >
      <ArrowUp className="w-5 h-5 transition-transform duration-200 hover:-translate-y-0.5" />
    </button>
  );
}

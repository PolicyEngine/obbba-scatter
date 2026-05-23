/**
 * Creates a render queue that ensures renders are not lost during rapid updates.
 * This prevents the issue where scrolling too fast can cause dots not to render.
 *
 * @param {Function} renderFn - The render function to call
 * @param {Object} options - Configuration options
 * @param {number} options.debounceMs - Milliseconds to debounce (default: 16 for ~60fps)
 * @returns {Object} Queue interface with enqueue method
 */
export function createRenderQueue(renderFn, options = {}) {
  const { debounceMs = 16 } = options;

  let pendingTimeoutId = null;  // Timeout ID for clearing
  let needsRenderAfterCurrent = false;  // Flag for pending render
  let isRendering = false;
  let lastState = null;

  const performRender = () => {
    if (isRendering) {
      // If already rendering, mark that we need another render after
      needsRenderAfterCurrent = true;
      return;
    }

    isRendering = true;

    try {
      // Call render function synchronously (canvas rendering is sync)
      renderFn(lastState);
    } finally {
      isRendering = false;

      // If there was a request while we were rendering, do another render
      if (needsRenderAfterCurrent) {
        needsRenderAfterCurrent = false;
        // Use requestAnimationFrame for smooth animation
        requestAnimationFrame(performRender);
      }
    }
  };

  const enqueue = (state) => {
    // Update the state to render
    if (state !== undefined) {
      lastState = state;
    }

    // Clear any existing timeout
    if (pendingTimeoutId !== null) {
      clearTimeout(pendingTimeoutId);
      pendingTimeoutId = null;
    }

    // Schedule render with debouncing
    pendingTimeoutId = setTimeout(() => {
      pendingTimeoutId = null;
      performRender();
    }, debounceMs);
  };

  const forceRender = () => {
    // Cancel pending render
    if (pendingTimeoutId !== null) {
      clearTimeout(pendingTimeoutId);
      pendingTimeoutId = null;
    }

    // Render immediately
    performRender();
  };

  const cancel = () => {
    if (pendingTimeoutId !== null) {
      clearTimeout(pendingTimeoutId);
      pendingTimeoutId = null;
    }
    needsRenderAfterCurrent = false;
  };

  return {
    enqueue,
    forceRender,
    cancel,
    get isRendering() {
      return isRendering;
    },
    get hasPending() {
      return pendingTimeoutId !== null || needsRenderAfterCurrent;
    }
  };
}
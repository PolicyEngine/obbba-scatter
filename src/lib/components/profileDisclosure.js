export function revealProvisionDetails(detailsElement, prefersReducedMotion = false) {
  const revealTarget = detailsElement?.firstElementChild || detailsElement;
  if (!revealTarget) return;

  revealTarget.scrollIntoView({
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    block: 'nearest',
    inline: 'nearest'
  });
}

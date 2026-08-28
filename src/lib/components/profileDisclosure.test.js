import { describe, expect, it, vi } from 'vitest';
import { revealProvisionDetails } from './profileDisclosure.js';

describe('revealProvisionDetails', () => {
  it('brings the first provision row into view', () => {
    const firstProvision = { scrollIntoView: vi.fn() };

    revealProvisionDetails({ firstElementChild: firstProvision });

    expect(firstProvision.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest'
    });
  });

  it('respects reduced-motion preferences', () => {
    const firstProvision = { scrollIntoView: vi.fn() };

    revealProvisionDetails({ firstElementChild: firstProvision }, true);

    expect(firstProvision.scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'auto' })
    );
  });
});

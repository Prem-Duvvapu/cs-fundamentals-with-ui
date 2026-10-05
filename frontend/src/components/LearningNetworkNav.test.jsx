import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import LearningNetworkNav from './LearningNetworkNav';

describe('Learning network navigation', () => {
  it('offers native same-tab routes to the hub and all four subjects', () => {
    render(<LearningNetworkNav />);
    const navigation = screen.getByRole('navigation', { name: 'Learning network' });
    const links = within(navigation).getAllByRole('link');
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      'https://learning-hub-with-ui.vercel.app/',
      'https://dsa-with-ui.vercel.app/',
      'https://lld-with-ui.vercel.app/',
      'https://hld-with-ui.vercel.app/',
      'https://cs-fundamentals-with-ui.vercel.app/',
    ]);
    for (const link of links) expect(link.hasAttribute('target')).toBe(false);
    const current = links.filter(link => link.getAttribute('aria-current') === 'location');
    expect(current).toHaveLength(1);
    expect(current[0].textContent.trim()).toBe('CS fundamentals');
  });
});

export interface Card {
  id: number;
  position: { left: string; top: string };
  title: string;
  description: string;
  colorClass: string;
  size: string;
  shape?: string;
  details?: string;
  // Add more fields as needed for different card types
}

export const CARDS: Card[] = [
  {
    id: 0,
    position: { left: '45%', top: '35%' },
    title: 'Research Area 1',
    description: 'Zoom in to explore more details about this research...',
    colorClass: 'bg-indigo-500/20 hover:bg-indigo-500/30',
    size: 'w-64 h-64',
    details: `
## Research Focus

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

## Key Findings

- Finding 1
- Finding 2
- Finding 3

## Publications

1. Paper Title 1 (2023)
2. Paper Title 2 (2022)
    `
  },
  // ... rest of your cards with added details
]; 
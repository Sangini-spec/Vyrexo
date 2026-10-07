import { test, expect } from 'bun:test';
import { render, fireEvent } from '@testing-library/react';
import App from '../src/components/App';

// Test to ensure the app renders without crashing
test('App renders without crashing', () => {
  const { getByText } = render(<App />);
  expect(getByText('Inkwell')).toBeTruthy();
});

// Test to check if the article composer can be toggled
test('Article composer toggles on button click', () => {
  const { getByText, queryByText } = render(<App />);
  const button = getByText('New Article');
  fireEvent.click(button);
  expect(queryByText('Publish')).toBeTruthy();
  fireEvent.click(button);
  expect(queryByText('Publish')).toBeNull();
});

// Test to check if subscription tier changes
test('Subscription tier changes', () => {
  const { getByText } = render(<App />);
  const freeTierButton = getByText('Free');
  fireEvent.click(freeTierButton);
  expect(freeTierButton.classList.contains('active')).toBe(true);
});

# Simple Counter Application

## Architectural Documentation

This project implements a basic counter tool as a single-page web application using React with TypeScript. The architecture is straightforward, focusing on a single, self-contained component (`App.tsx`) to manage and display the counter state.

### Core Technologies:
*   **React**: For building the user interface with a component-based approach.
*   **TypeScript**: For type safety and improved code maintainability.
*   **Tailwind CSS**: For utility-first styling, enabling rapid UI development with a consistent dark theme.
*   **Bun**: As the JavaScript runtime and package manager, also used for testing and building.
*   **FontAwesome 6**: For modern, scalable icons.

### Component Structure:
*   `src/components/App.tsx`: The main application component. It manages the counter's state using React's `useState` hook and provides functions to increment, decrement, and reset the count. `useCallback` is used to optimize event handlers.
*   `src/types/index.ts`: Contains TypeScript type definitions, specifically `CounterState` to define the shape of our counter's value.

### Styling:
Tailwind CSS is configured to provide a dark, high-contrast, and accessible theme:
*   `bg-slate-950`: Deep dark background.
*   `text-white`: White text for readability.
*   `border-slate-800`: Subtle borders for structural elements.
*   `indigo-600`/`emerald-500`: Accent colors for primary actions and count display.

### State Management:
The counter's value is managed locally within the `App` component using `useState`. The logic for incrementing, decrementing, and resetting the count is encapsulated in simple helper functions, making them easy to test and understand.

## Feature List

*   **Display Current Count**: Clearly shows the current numerical value of the counter.
*   **Increment Button**: Increases the counter's value by one.
*   **Decrement Button**: Decreases the counter's value by one, with a safeguard to prevent it from going below zero.
*   **Reset Button**: Resets the counter's value back to zero.
*   **Responsive Design**: The application is designed to be usable across various screen sizes.
*   **Dark Theme**: A modern, high-contrast dark theme for improved aesthetics and reduced eye strain.
*   **Interactive UI**: Buttons provide visual feedback on hover, active states, and focus.

## Usage Guide

### Prerequisites
*   [Bun](https://bun.sh/) installed on your system.

### Installation
1.  **Clone the repository** (or create the files manually as provided).
2.  **Navigate to the project directory** in your terminal.
3.  **Install dependencies** using Bun:
    ```bash
    bun install
    ```

### Running the Application
To start the development server:
```bash
bun run dev
```
This will typically start the application on `http://localhost:3000` (or another available port) and open it in your browser. The `--hot` flag enables hot module reloading for a smooth development experience.

### Building for Production
To create a production-ready build:
```bash
bun run build
```
This command will compile the React component into the `dist` directory.

### Running Tests
To execute the unit tests for the counter logic:
```bash
bun run test
```
The tests verify the core functionality of the increment, decrement, and reset operations, including edge cases like decrementing below zero.

# Inkwell Substack Publication Platform

## Overview
Inkwell is a modern publication platform inspired by Substack, designed to facilitate the creation, distribution, and monetization of written content. It features an article feed, category filters, a reader view modal with reading time, an article composer for drafting and publishing essays, paid subscriber tiers, and a commenting system.

## Features
- **Article Feed**: Browse articles by categories with real-time updates.
- **Reader View Modal**: View full articles with reading time and comments.
- **Article Composer**: Draft and publish new essays with ease.
- **Subscription Tiers**: Choose between Free, Paid, and Founding Member tiers.
- **Comments**: Engage with readers through a commenting system.

## Component Hierarchy
- `App`: Main application component.
  - `ArticleFeed`: Displays a list of articles.
  - `ReaderViewModal`: Shows full article content.
  - `ArticleComposer`: Interface for creating new articles.
  - `SubscriptionPicker`: Allows users to select subscription tiers.

## Installation
1. Clone the repository.
2. Run `bun install` to install dependencies.
3. Start the development server with `bun run dev`.

## Testing
Run `bun test tests/app.test.ts` to execute unit tests.

## License
This project is licensed under the MIT License.

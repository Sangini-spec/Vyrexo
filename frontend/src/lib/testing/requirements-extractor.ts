export interface AcceptanceCriterion {
  id: string;
  category: "functional" | "ui_element" | "workflow" | "validation" | "runtime_health";
  title: string;
  description: string;
  targetSelector?: string;
  expectedOutcome: string;
  status: "Passed" | "Failed" | "Blocked" | "Not tested";
  evidence?: {
    screenshot?: string;
    consoleLogs?: string[];
    networkErrors?: string[];
    observedDom?: string;
    failureReason?: string;
  };
}

/**
 * Extracts structured, testable acceptance criteria from a user prompt and project specification.
 */
export function extractAcceptanceCriteria(
  userPrompt: string,
  projectTitle: string = "Application",
  techStack: string[] = []
): AcceptanceCriterion[] {
  const criteria: AcceptanceCriterion[] = [];
  const lowerPrompt = userPrompt.toLowerCase();

  // 1. Core Runtime Health Requirement (always required)
  criteria.push({
    id: "crit-health",
    category: "runtime_health",
    title: "Application Renders Cleanly Without Runtime Exceptions",
    description: "The application root view mounts without uncaught JavaScript exceptions, blank screen crashes, or fatal console errors.",
    targetSelector: "#root, [data-testid='app-root'], main, body",
    expectedOutcome: "The DOM tree contains active, styled elements and window.onerror was not triggered.",
    status: "Not tested",
  });

  // 2. Primary Navigation / Header View
  criteria.push({
    id: "crit-nav",
    category: "ui_element",
    title: "Primary Application Header and Branding Are Visible",
    description: `The application renders visible branding, page title, or header controls matching "${projectTitle}".`,
    targetSelector: "header, h1, nav, [role='banner']",
    expectedOutcome: "Header element is visible with non-empty text content.",
    status: "Not tested",
  });

  // 3. Detect domain-specific interactive features
  if (lowerPrompt.includes("calc") || lowerPrompt.includes("calculator") || lowerPrompt.includes("math")) {
    criteria.push({
      id: "crit-calc-action",
      category: "functional",
      title: "Interactive Numeric Computation Controls",
      description: "Clicking numeric input keys and operator buttons updates the calculation display accurately.",
      targetSelector: "button",
      expectedOutcome: "Display output updates with computed mathematical result.",
      status: "Not tested",
    });
  } else if (lowerPrompt.includes("cart") || lowerPrompt.includes("shop") || lowerPrompt.includes("ecommerce") || lowerPrompt.includes("product")) {
    criteria.push({
      id: "crit-shop-action",
      category: "functional",
      title: "Add to Cart / Product Selection Workflow",
      description: "Clicking product cards or 'Add to Cart' buttons updates the item count or cart summary modal.",
      targetSelector: "button:has-text('Add'), button:has-text('Cart'), button",
      expectedOutcome: "Cart badge or order summary increments visibly.",
      status: "Not tested",
    });
  } else if (lowerPrompt.includes("task") || lowerPrompt.includes("todo") || lowerPrompt.includes("kanban")) {
    criteria.push({
      id: "crit-task-action",
      category: "functional",
      title: "Task Creation and Status Toggle",
      description: "Users can enter a new task item and toggle its completion state.",
      targetSelector: "input[type='text'], button",
      expectedOutcome: "New item appears in the list and completion checkbox reflects toggled state.",
      status: "Not tested",
    });
  } else {
    // General interactive action requirement
    criteria.push({
      id: "crit-interactive-action",
      category: "functional",
      title: "Interactive Controls Respond to User Input",
      description: "Interactive controls (buttons, tabs, or inputs) trigger state updates or visual changes when clicked.",
      targetSelector: "button, [role='button'], a[href], input",
      expectedOutcome: "Clicking the primary interactive element triggers an active DOM or state change.",
      status: "Not tested",
    });
  }

  // 4. Form / Input Validation Requirement (if prompt references forms, inputs, auth, or submission)
  if (
    lowerPrompt.includes("form") ||
    lowerPrompt.includes("input") ||
    lowerPrompt.includes("search") ||
    lowerPrompt.includes("login") ||
    lowerPrompt.includes("signup") ||
    lowerPrompt.includes("filter")
  ) {
    criteria.push({
      id: "crit-input-validation",
      category: "validation",
      title: "Input Fields Accept Data and Handle Boundary States",
      description: "Entering search or form text updates the field value and triggers appropriate filtering or validation.",
      targetSelector: "input, textarea, select",
      expectedOutcome: "Typing triggers value change and prevents empty or invalid submission.",
      status: "Not tested",
    });
  }

  // 5. Responsive Layout & Viewport Verification
  criteria.push({
    id: "crit-viewport",
    category: "ui_element",
    title: "Responsive Viewport & CSS Theme Integration",
    description: "The layout renders cleanly without horizontal page overflow, clipping, or unstyled raw text.",
    targetSelector: "body, main",
    expectedOutcome: "Document width conforms to viewport bounds with valid CSS styling.",
    status: "Not tested",
  });

  return criteria;
}

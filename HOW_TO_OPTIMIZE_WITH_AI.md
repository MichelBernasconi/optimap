# OptMap: AI Optimization Workflow

Since this project integrates with AI agents (like Antigravity), we can use the agent itself to perform complex structural optimizations.

## Agent Instructions

When the user asks you to "Optimize the project structure using OptiMap", follow these steps:

1.  **Analyze**: Run the `OptiMap: Analyze AI Workflow Paths` command to generate the graph and the optimization list.
2.  **Evaluate**: Look at the "Optimization Tips" sidebar.
    *   **Cycles**: Use your `replace_file_content` tool to break circular dependencies by removing redundant links.
    *   **Redundancies**: Merge related `.md` files or clarify instructions to reduce the agent's "wandering".
    *   **Shortcuts**: Add direct links to the relevant files.
3.  **Execute**: Apply the changes and re-run the analysis to verify success.

## Manual "Apply Fix"

Each suggestion in the OptiMap UI now has an **"Apply Fix"** button.
-   **Add Link**: Automatically appends a shortcut link to the file.
-   **Delegate to AI**: Triggers an agent request to perform a more complex refactoring.

## Feedback Loop

Optimized workflows mean shorter traces, fewer API calls, and faster results.

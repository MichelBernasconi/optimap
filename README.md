# OptiMap README

OptiMap is a specialized extension for VS Code and Antigravity designed to streamline and optimize AI agent workflows. It focuses on analyzing, visualizing, and restructuring the network of `.md` files (Skills and Workflows) that guide AI assistants through complex tasks.

## Core Mission

When an AI assistant navigates a project's documentation and workflows, it often follows a trail of linked Markdown files. OptiMap ensures this trail is efficient, logical, and free of bottlenecks.

## Key Features

- **Workflow Analysis**: Tracks the paths an AI assistant takes through `.md` files to identify common traversal patterns.
- **Visual Mapping**: Generates an interactive graph showing how files link to one another (e.g., Skill A -> Workflow B).
- **Diagnostic Insights**: Automatically highlights:
    - **Loops**: Circular references that cause an AI to get stuck.
    - **Wandering Files**: Orphaned or incorrectly linked files that don't contribute to a clear goal.
- **Efficiency Optimization**: Suggests structural changes (like merging redundant steps or creating direct links) to minimize the number of jumps the AI needs to perform.

## How it Works

1. **Scan**: OptiMap scans your `.agents/workflows` and `.agents/skills` directories.
2. **Parse**: It identifies links, file references, and "see also" sections within Markdown.
3. **Visualize**: It renders a dynamic graph in a VS Code Webview.
4. **Optimize**: It provides a "One-Click Optimize" feature to prune unnecessary steps.

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## How to Test Locally

### 1. VS Code Extension Mode (Full UI)
1.  Open the `optimap` folder in Visual Studio Code.
2.  Press **F5** (or go to `Run and Debug` -> `Launch Extension`).
3.  A new **[Extension Development Host]** window will open.
4.  In the new window, open any folder containing `.md` files.
5.  Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) and run **"OptiMap: Analyze AI Workflow Paths"**.
6.  The visual map and optimization sidebar will appear.

### 2. Standalone Logic Test (No VS Code required)
If you want to verify the graph parsing and trace analysis logic quickly:
1.  Open your terminal.
2.  Run `npm run compile`.
3.  Run `node ./out/validate.js`.
4.  This will output the results of the analysis on the bundled `trace.log` and `mock_workflow.md` files.

### 3. Integrated AI Optimization
You can ask your AI assistant (e.g., Antigravity) to:
*"Analyze this project with OptiMap and tell me if there are any infinite loops or redundant steps."*
The agent will use its internal tools to read the analysis and suggest fixes.

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**

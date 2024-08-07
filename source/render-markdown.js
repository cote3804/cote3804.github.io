// Initialize markdown-it
const md = window.markdownit();

// Use markdown-it-katex plugin
md.use(window.markdownitKatex);

// Example Markdown content
const markdownFileContent = `
# Hello, World!
This is a **Markdown** document.

## Math Example
Here is a math equation using KaTeX:

Inline math: $E = mc^2$

Block math:
$$
\\int_{a}^{b} f(x) \\,dx
$$

## List Example
- Item 1
- Item 2
- Item 3

[Link to Google](https://www.google.com)
`;

// Convert Markdown to HTML
const htmlContent = md.render(markdownFileContent);

// Insert the rendered HTML into the page
document.getElementById('markdown-content').innerHTML = htmlContent;
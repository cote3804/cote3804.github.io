// research-render.js
// Page-specific initialization for the research page

console.log('Research page script loading...');

// Load the research content into the designated div
initializeMarked();
loadMarkdownFile('research.md', 'research-content');
loadMarkdownFile('biography.md', 'biography-content');
loadMarkdownFile('main.md', 'main-content');

// Optional: Force MathJax rerender after content loads
setTimeout(() => {
    if (window.forceRerender) {
        forceRerender();
    }
}, 500);
// research-render.js
// Page-specific initialization for the research page

console.log('Research page script loading...');

// Ensure marked is initialized before loading markdown files to avoid a race.
(async function() {
    await initializeMarked();

    // Load the research content into the designated div
    loadMarkdownFile('research.md', 'research-content');
    loadMarkdownFile('biography.md', 'biography-content');
    loadMarkdownFile('main.md', 'main-content');

    // Optional: Force MathJax rerender after content loads
    setTimeout(() => {
        if (window.forceRerender) {
            forceRerender();
        }
    }, 500);
})();
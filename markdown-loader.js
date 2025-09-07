// markdown-loader.js

function waitForMarked() {
    return new Promise((resolve) => {
        if (typeof marked !== 'undefined') {
            resolve();
        } else {
            // Check every 50ms until marked is available
            const checkMarked = setInterval(() => {
                if (typeof marked !== 'undefined') {
                    clearInterval(checkMarked);
                    resolve();
                }
            }, 50);
        }
    });
}

async function initializeMarked() {
    await waitForMarked();
    console.log('marked.js is ready');
    
    // Create custom renderer for images
    const renderer = new marked.Renderer();
    
    // Custom image renderer with default sizing
    renderer.image = function(href, title, text) {
        console.log('Image renderer called with:', { href, title, text });
        let html = '<img src="' + href + '" alt="' + text + '"';
        
        // 1. SET DEFAULT STYLES (this is the fallback 250x250)
        let styles = ['max-width: 250px', 'max-height: 250px', 'height: auto', 'width: auto'];
        let classes = ['img-fluid', 'rounded'];
        
        // 2. PARSE THE TITLE ATTRIBUTE - this is where the magic happens!
        if (title) {
            // Split on pipe character: "Title|size|alignment" becomes ["Title", "size", "alignment"]
            const titleParts = title.split('|');
            const actualTitle = titleParts[0].trim();  // First part = real title
            
            // 3. CHECK IF SIZE WAS SPECIFIED (second part exists)
            if (titleParts.length > 1) {
                const sizeSpec = titleParts[1].trim();  // Extract size specification
                
                // 4. PARSE PREDEFINED SIZE LABELS - THIS IS WHERE "small", "medium" etc. get converted
                if (sizeSpec === 'small') {
                    styles = ['max-width: 150px', 'max-height: 150px', 'height: auto', 'width: auto'];
                } else if (sizeSpec === 'medium') {
                    styles = ['max-width: 300px', 'max-height: 300px', 'height: auto', 'width: auto'];
                } else if (sizeSpec === 'large') {
                    styles = ['max-width: 500px', 'max-height: 500px', 'height: auto', 'width: auto'];
                } else if (sizeSpec === 'full') {
                    styles = ['width: 100%', 'height: auto'];
                } 
                // 5. PARSE EXPLICIT DIMENSIONS like "400x300"
                else if (sizeSpec.includes('x')) {
                    const dimensions = sizeSpec.split('x');
                    if (dimensions.length === 2) {
                        const width = dimensions[0].trim();   // Extract width
                        const height = dimensions[1].trim();  // Extract height
                        styles = [`width: ${width}px`, `height: ${height}px`];  // Convert to CSS
                    }
                }
                
                // 6. PARSE ALIGNMENT (third part if it exists)
                if (titleParts.length > 2) {
                    const additionalClass = titleParts[2].trim();
                    if (additionalClass === 'center') {
                        classes.push('d-block', 'mx-auto');  // Bootstrap center classes
                    } else if (additionalClass === 'float-left') {
                        classes.push('float-start', 'me-3', 'mb-2');  // Bootstrap float left
                    } else if (additionalClass === 'float-right') {
                        classes.push('float-end', 'ms-3', 'mb-2');   // Bootstrap float right
                    }
                }
            }
            // 7. ADD THE CLEANED TITLE (without size/alignment parts)
            if (actualTitle) {
                html += ' title="' + actualTitle + '"';
            }
        }
        console.log('Image renderer styles:', styles);
        // 8. APPLY THE PARSED STYLES AND CLASSES TO THE HTML
        html += ' style="' + styles.join('; ') + '"';  // Convert styles array to CSS string
        html += ' class="' + classes.join(' ') + '"';   // Convert classes array to class string
        
        html += '>';
        console.log('Image renderer HTML:', html);
        return html;  // Return the final HTML with custom sizing
    };
    // Configure marked.js
    marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: true,
        mangle: false,
        sanitize: false,
        smartLists: true,
        smartypants: true,
        renderer: renderer
    });
}

// Main function to load markdown files
async function loadMarkdownFile(filename, targetElementId = 'content') {
    const contentDiv = document.getElementById(targetElementId);
    
    if (!contentDiv) {
        console.error(`Element with ID '${targetElementId}' not found`);
        return;
    }
    
    // Show loading state
    contentDiv.innerHTML = '<div class="loading">Loading ' + filename + '...</div>';
    
    try {
        const response = await fetch(filename);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const markdownText = await response.text();
        const htmlContent = marked.parse(markdownText);
        
        // Render the HTML
        contentDiv.innerHTML = htmlContent;
        
        // Smooth scroll to content
        contentDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
    } catch (error) {
        console.error('Error loading markdown file:', error);
        contentDiv.innerHTML = `
            <div class="error">
                <h3>Error Loading Content</h3>
                <p>Could not load <strong>${filename}</strong></p>
                <p>Error: ${error.message}</p>
            </div>
        `;
    }
}

// Alternative function for loading from URLs
async function loadMarkdownFromURL(url, targetElementId = 'content') {
    return loadMarkdownFile(url, targetElementId);
}

// Utility function to update active navigation buttons
function updateActiveButton(clickedButton, navSelector = '.nav button') {
    document.querySelectorAll(navSelector).forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
}

// Hash-based navigation setup
function setupHashNavigation() {
    // Handle hash changes
    window.addEventListener('hashchange', function() {
        const hash = window.location.hash.substring(1);
        if (hash) {
            loadMarkdownFile(hash + '.md');
        }
    });
    
    // Handle initial hash on page load
    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        loadMarkdownFile(hash + '.md');
    }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setupHashNavigation();
});
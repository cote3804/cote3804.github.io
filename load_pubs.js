/**
 * Publications Loader
 * Loads publications from JSON file parsed from Google Scholar
 */

async function loadPublications() {
    try {
        const response = await fetch('./scripts/publications.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading publications:', error);
        return null;
    }
}

async function loadLastTime() {
    try {
        const response = await fetch('./scripts/last_updated.txt');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error('Error loading last updated time:', error);
        return null;
    }
}

async function displayPublications() {
    const data = await loadPublications();
    const time = await loadLastTime();

    const container = document.getElementById('publications');
    const lastUpdatedEl = document.getElementById('last-updated');

    if (!data) {
        container.innerHTML = '<div class="publication error"><p>Unable to load publications. Please try again later.</p></div>';
        if (lastUpdatedEl) lastUpdatedEl.textContent = 'Failed to load data';
        return;
    }

    if (lastUpdatedEl && time) {
        lastUpdatedEl.textContent = `Last updated: ${time}`;
    }

    const publications = Object.values(data);
    if (publications.length === 0) {
        container.innerHTML = '<div class="publication"><p>No publications found.</p></div>';
        return;
    }

    const html = publications.map(pub => `
        <div class="mb-3">
            <button class="transparent-button" onclick="window.open('${pub.url}', '_blank')">
                ${pub.title}
            </button>
            <p class="text-light opacity-75 ms-2">${pub.journal} (${pub.year})</p>
        </div>
    `).join('');

    container.innerHTML = html;
}

// Script to load in publications from a JSON file

async function loadPublications() {
    try {
        const response = await fetch('./scripts/publications.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const publications = await response.json();
        console.log('Publications loaded:', publications);
        return publications;
    } catch (error) {
        console.error('Error loading publications:', error);
    }
}

async function loadLastTime() {
    try {
        const response = await fetch('./scripts/last_updated.txt');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const lastTime = await response.text();
        console.log('Last updated time loaded:', lastTime);
        return lastTime;
    } catch (error) {
        console.error('Error loading last updated time:', error);
    }
}

async function displayPublications() {
    const data = await loadPublications();
    const time = await loadLastTime();
    
    if (!data) {
        document.getElementById('publications').innerHTML = '<div class="publication error"><p>Unable to load publications. Please try again later.</p></div>';
        document.getElementById('last-updated').textContent = 'Failed to load data';
        return;
    }
    
    const container = document.getElementById('publications');
    
    // Update last updated info
    document.getElementById('last-updated').textContent = `Last updated: ${time}`;
    
    var count = 0;
    for(var prop in data) {
        if (data.hasOwnProperty(prop)) {
            count++;
        }
    }
    console.log('Total properties in data:', count);
    if (count === 0) {
        container.innerHTML = '<div class="publication"><p>No publications found.</p></div>';
        return;
    }
    var html = '';
    for(var pub in data) {
        console.log('Processing publication:', pub);
        html += `<div>
                    <button class="transparent-button" onclick="window.open('${data[pub].url}', '_blank')">
                        ${data[pub].title}
                    </button>
                </div>
                <div>
                    <p class=\"text-light\">${data[pub].journal} (${data[pub].year})</p>
                 </div>`;
    }
    
    container.innerHTML = html;
    console.log("HTML", html);
}
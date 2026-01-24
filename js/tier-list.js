/**
 * Tier List - QM/MD Software Ranking
 * Drag and drop software items into tier categories
 * With Firebase voting integration
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc, increment, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBtz6cOOT13xzvSvFWtGim46mfqPO6uFPg",
    authDomain: "personal-site-93b51.firebaseapp.com",
    projectId: "personal-site-93b51",
    storageBucket: "personal-site-93b51.firebasestorage.app",
    messagingSenderId: "56775535053",
    appId: "1:56775535053:web:22cba3b0941c16af23bc84"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Track if user has voted this session (resets on page reload)
let hasVotedThisSession = false;
let chart = null; // Global chart instance

const TIER_COLORS = {
    'S': '#ffbf7f',
    'A': '#ffd97f',
    'B': '#ffff7f',
    'C': '#bfff7f',
    'D': '#7fffff',
    'NA': '#555555'
};

function hasVoted() {
    return hasVotedThisSession;
}

function markAsVoted() {
    hasVotedThisSession = true;
}

// Collect current tier placements
function collectVotes() {
    const votes = {};
    const tiers = document.querySelectorAll('.tier');

    tiers.forEach(tier => {
        const tierName = tier.dataset.tier;
        const balls = tier.querySelectorAll('.tier-ball');
        balls.forEach(ball => {
            const software = ball.dataset.software;
            if (software) {
                votes[software] = tierName;
            }
        });
    });

    // Items still in ball-container count as NA
    const unranked = document.querySelectorAll('#ball-container .tier-ball');
    unranked.forEach(ball => {
        const software = ball.dataset.software;
        if (software) {
            votes[software] = 'NA';
        }
    });

    return votes;
}

// Submit votes to Firebase
async function submitVotes() {
    const submitBtn = document.getElementById('submit-vote');
    const statusEl = document.getElementById('vote-status');

    if (hasVoted()) {
        statusEl.textContent = 'You have already voted!';
        statusEl.style.color = '#ffbf7f';
        return;
    }

    const votes = collectVotes();

    // Check if at least one item is ranked (not NA)
    const rankedItems = Object.values(votes).filter(v => v !== 'NA');
    if (rankedItems.length === 0) {
        statusEl.textContent = 'Please rank at least one item before voting.';
        statusEl.style.color = '#ff7f7f';
        return;
    }

    submitBtn.disabled = true;
    statusEl.textContent = 'Submitting...';
    statusEl.style.color = '#fff';

    try {
        // Update counts for each software
        for (const [software, tier] of Object.entries(votes)) {
            if (tier === 'NA') continue; // Skip unranked items

            console.log(`Submitting: ${software} -> ${tier}`);
            const docRef = doc(db, 'tierlist_votes', software);

            // Use setDoc with merge to create or update
            const data = {
                [tier]: increment(1),
                total: increment(1)
            };
            console.log('Data being sent:', Object.keys(data));

            await setDoc(docRef, data, { merge: true });
            console.log(`Success: ${software}`);
        }

        markAsVoted();
        submitBtn.textContent = 'Vote Submitted!';
        submitBtn.disabled = true;
        statusEl.textContent = 'Thank you for voting!';
        statusEl.style.color = '#7fff7f';
        
        // Show visualization panel
        await showVisualizationPanel();

    } catch (error) {
        console.error('Error submitting vote:', error);
        submitBtn.disabled = false;
        statusEl.textContent = 'Error submitting vote. Please try again.';
        statusEl.style.color = '#ff7f7f';
    }
}

// Fetch voting statistics for a software
async function fetchVotingStats(software) {
    try {
        const docRef = doc(db, 'tierlist_votes', software);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            return { S: 0, A: 0, B: 0, C: 0, D: 0, NA: 0, total: 0 };
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
        return null;
    }
}

// Update chart with voting data
function updateChart(software, stats) {
    const ctx = document.getElementById('distribution-chart').getContext('2d');
    const tiers = ['S', 'A', 'B', 'C', 'D'];
    const data = tiers.map(tier => stats[tier] || 0);
    const colors = tiers.map(tier => TIER_COLORS[tier]);
    
    if (chart) {
        chart.destroy();
    }
    
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: tiers,
            datasets: [{
                label: 'Number of Votes',
                data: data,
                backgroundColor: colors,
                borderColor: '#333',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'x',
            plugins: {
                legend: {
                    labels: { color: '#fff' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#fff' },
                    grid: { color: '#444' }
                },
                x: {
                    ticks: { color: '#fff' },
                    grid: { color: '#444' }
                }
            }
        }
    });
}

// Update vote statistics text
function updateStatsText(software, stats) {
    const total = stats.total || 0;
    const statsEl = document.getElementById('vote-stats');
    
    if (total === 0) {
        statsEl.innerHTML = '<p>No votes yet for this software.</p>';
        return;
    }
    
    const percentages = {
        S: ((stats.S || 0) / total * 100).toFixed(1),
        A: ((stats.A || 0) / total * 100).toFixed(1),
        B: ((stats.B || 0) / total * 100).toFixed(1),
        C: ((stats.C || 0) / total * 100).toFixed(1),
        D: ((stats.D || 0) / total * 100).toFixed(1)
    };
    
    statsEl.innerHTML = `
        <p><strong>Total Votes:</strong> ${total}</p>
        <p><strong>Tier Breakdown:</strong></p>
        <ul style="list-style: none; padding: 0;">
            <li>🏆 S-Tier: ${stats.S || 0} votes (${percentages.S}%)</li>
            <li>⭐ A-Tier: ${stats.A || 0} votes (${percentages.A}%)</li>
            <li>👍 B-Tier: ${stats.B || 0} votes (${percentages.B}%)</li>
            <li>👌 C-Tier: ${stats.C || 0} votes (${percentages.C}%)</li>
            <li>👎 D-Tier: ${stats.D || 0} votes (${percentages.D}%)</li>
        </ul>
    `;
}

// Show visualization panel and populate software dropdown
async function showVisualizationPanel() {
    const panel = document.getElementById('visualization-panel');
    const selector = document.getElementById('software-selector');
    
    // Get all software items
    const allSoftware = Array.from(document.querySelectorAll('.tier-ball'))
        .map(ball => ({
            id: ball.dataset.software,
            name: ball.querySelector('span').textContent
        }));
    
    // Populate dropdown if not already done
    if (selector.children.length === 1) {
        allSoftware.forEach(software => {
            const option = document.createElement('option');
            option.value = software.id;
            option.textContent = software.name;
            selector.appendChild(option);
        });
    }
    
    // Show panel
    panel.style.display = 'block';
    
    // Add change listener for dropdown
    selector.addEventListener('change', handleSoftwareSelection);
}

// Handle software selection change
async function handleSoftwareSelection(event) {
    const software = event.target.value;
    const chartTitle = document.getElementById('chart-title');
    const distributionChart = document.getElementById('distribution-chart');
    
    if (!software) {
        chartTitle.textContent = 'Tier Distribution - Select a software';
        distributionChart.style.display = 'none';
        document.getElementById('vote-stats').innerHTML = '';
        return;
    }
    
    // Get selected software name
    const softwareName = event.target.options[event.target.selectedIndex].text;
    chartTitle.textContent = `Tier Distribution - ${softwareName}`;
    distributionChart.style.display = 'block';
    
    // Fetch and display stats
    const stats = await fetchVotingStats(software);
    if (stats) {
        updateChart(software, stats);
        updateStatsText(software, stats);
    }
}

// Initialize drag and drop
document.addEventListener('DOMContentLoaded', () => {
    const ballContainer = document.getElementById('ball-container');
    const tiers = document.querySelectorAll('.tier');
    const submitBtn = document.getElementById('submit-vote');

    // Check if already voted
    if (hasVoted()) {
        submitBtn.textContent = 'Already Voted';
        submitBtn.disabled = true;
    }

    // Vote button click handler
    submitBtn.addEventListener('click', submitVotes);

    // Drag and drop handling
    document.addEventListener('mousedown', (event) => {
        const ball = event.target.closest('.tier-ball');
        if (!ball) return;

        event.preventDefault();

        const rect = ball.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;

        const originalParent = ball.parentElement;

        ball.style.position = 'fixed';
        ball.style.left = rect.left + 'px';
        ball.style.top = rect.top + 'px';
        ball.style.zIndex = '1000';
        ball.style.pointerEvents = 'none';
        document.body.appendChild(ball);

        function onMouseMove(e) {
            ball.style.left = (e.clientX - offsetX) + 'px';
            ball.style.top = (e.clientY - offsetY) + 'px';
        }

        function onMouseUp(e) {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            ball.style.pointerEvents = '';

            const ballRect = ball.getBoundingClientRect();
            const centerX = ballRect.left + ballRect.width / 2;
            const centerY = ballRect.top + ballRect.height / 2;

            let dropped = false;

            for (const tier of tiers) {
                const tierRect = tier.getBoundingClientRect();
                if (centerX >= tierRect.left && centerX <= tierRect.right &&
                    centerY >= tierRect.top && centerY <= tierRect.bottom) {
                    tier.appendChild(ball);
                    dropped = true;
                    break;
                }
            }

            if (!dropped) {
                const containerRect = ballContainer.getBoundingClientRect();
                if (centerX >= containerRect.left && centerX <= containerRect.right &&
                    centerY >= containerRect.top && centerY <= containerRect.bottom) {
                    ballContainer.appendChild(ball);
                    dropped = true;
                }
            }

            if (!dropped) {
                originalParent.appendChild(ball);
            }

            ball.style.position = '';
            ball.style.left = '';
            ball.style.top = '';
            ball.style.zIndex = '';
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
});

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resultsList = document.getElementById('resultsList');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const currentFile = document.getElementById('currentFile');
const statusMessage = document.getElementById('statusMessage');
const emptyState = document.querySelector('.empty-state');

// State
let searchResults = [];
let selectedTracks = new Set();
let currentAlbumUrl = '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupElectronListeners();
});

// Event Listeners
function setupEventListeners() {
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    selectAllBtn.addEventListener('click', handleSelectAll);
    downloadBtn.addEventListener('click', handleDownload);
}

// Setup Electron IPC listeners
function setupElectronListeners() {
    window.electronAPI.onDownloadStart((data) => {
        progressSection.style.display = 'block';
        showStatus(`Starting download of ${data.total} tracks from ${data.albumName}`, 'info');
    });

    window.electronAPI.onDownloadProgress((data) => {
        updateProgress(data.current, data.total, data.fileName);
    });

    window.electronAPI.onDownloadWarning((message) => {
        console.warn(message);
    });
}

// Search Handler
async function handleSearch() {
    const query = searchInput.value.trim();
    
    if (!query) {
        showStatus('Please enter a Khinsider album URL', 'error');
        return;
    }

    // Validate URL format
    if (!query.includes('https://downloads.khinsider.com/game-soundtracks/album/')) {
        showStatus('Please enter a valid Khinsider album URL (e.g., https://downloads.khinsider.com/game-soundtracks/album/...)', 'error');
        return;
    }

    setSearching(true);
    showStatus('Fetching album information...', 'info');

    try {
        const albumInfo = await window.electronAPI.searchAlbum(query);
        
        currentAlbumUrl = query;
        searchResults = albumInfo.tracks;
        displayResults(albumInfo.tracks);
        showStatus(`Found ${albumInfo.tracks.length} tracks in ${albumInfo.albumName}`, 'success');
    } catch (error) {
        showStatus(`Search failed: ${error.message}`, 'error'); // Cannot read properties of undefined (reading 'searchAlbum')
        searchResults = [];
        displayResults([]);
    } finally {
        setSearching(false);
    }
}

// Display Results
function displayResults(results) {
    resultsList.innerHTML = '';
    selectedTracks.clear();

    if (results.length === 0) {
        emptyState.style.display = 'flex';
        resultsList.style.display = 'none';
        selectAllBtn.disabled = true;
        downloadBtn.disabled = true;
        return;
    }

    emptyState.style.display = 'none';
    resultsList.style.display = 'block';
    selectAllBtn.disabled = false;

    results.forEach(track => {
        const trackElement = createTrackElement(track);
        resultsList.appendChild(trackElement);
    });

    updateDownloadButton();
}

// Create Track Element
function createTrackElement(track) {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.dataset.trackId = track.id;

    div.innerHTML = `
        <input type="checkbox" class="track-checkbox" data-track-id="${track.id}">
        <div class="track-info">
            <div class="track-title">${escapeHtml(track.title)}</div>
        </div>
    `;

    const checkbox = div.querySelector('.track-checkbox');
    checkbox.addEventListener('change', () => handleTrackSelection(track.id, checkbox.checked));

    return div;
}

// Handle Track Selection
function handleTrackSelection(trackId, isChecked) {
    if (isChecked) {
        selectedTracks.add(trackId);
    } else {
        selectedTracks.delete(trackId);
    }
    updateDownloadButton();
    updateSelectAllButton();
}

// Handle Select All
function handleSelectAll() {
    const checkboxes = document.querySelectorAll('.track-checkbox');
    const allSelected = selectedTracks.size === searchResults.length;

    if (allSelected) {
        checkboxes.forEach(cb => {
            cb.checked = false;
        });
        selectedTracks.clear();
        selectAllBtn.textContent = 'Select All';
    } else {
        checkboxes.forEach(cb => {
            cb.checked = true;
        });
        selectedTracks = new Set(searchResults.map(t => t.id));
        selectAllBtn.textContent = 'Deselect All';
    }

    updateDownloadButton();
}

// Update Select All Button
function updateSelectAllButton() {
    if (searchResults.length > 0 && selectedTracks.size === searchResults.length) {
        selectAllBtn.textContent = 'Deselect All';
    } else {
        selectAllBtn.textContent = 'Select All';
    }
}

// Update Download Button
function updateDownloadButton() {
    downloadBtn.disabled = selectedTracks.size === 0;
    if (selectedTracks.size > 0) {
        downloadBtn.innerHTML = `
            <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Selected (${selectedTracks.size})
        `;
    } else {
        // Reset button text when nothing selected
        downloadBtn.innerHTML = `
            <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Selected
        `;
    }
}

// Handle Download
async function handleDownload() {
    if (selectedTracks.size === 0) return;

    // Get selected track indices
    const trackIndices = Array.from(selectedTracks).map(id => parseInt(id));
    
    // Optional: Let user select download directory
    const outputDir = await window.electronAPI.selectDirectory();
    if (!outputDir) {
        showStatus('Download cancelled - no directory selected', 'info');
        return;
    }
    
    // Show progress section
    progressSection.style.display = 'block';
    downloadBtn.disabled = true;
    searchBtn.disabled = true;
    selectAllBtn.disabled = true;

    try {
        const result = await window.electronAPI.downloadTracks(
            currentAlbumUrl,
            trackIndices,
            outputDir
        );
        
        showStatus(`Download completed! ${result.downloaded} of ${result.total} tracks downloaded successfully.`, 'success');
        
        // Hide progress section after completion
        setTimeout(() => {
            progressSection.style.display = 'none';
            // Reset progress bar for next download
            progressBar.style.width = '0%';
            progressText.textContent = '0 / 0';
            currentFile.textContent = '';
        }, 2000); // Wait 2 seconds so user can see completion
        
    } catch (error) {
        showStatus(`Download failed: ${error.message}`, 'error');
        
        // Hide progress section after error
        setTimeout(() => {
            progressSection.style.display = 'none';
            progressBar.style.width = '0%';
            progressText.textContent = '0 / 0';
            currentFile.textContent = '';
        }, 2000);
        
    } finally {
        downloadBtn.disabled = false;
        searchBtn.disabled = false;
        selectAllBtn.disabled = false;
    }
}

// Update Progress UI
function updateProgress(current, total, fileName) {
    const percentage = (current / total) * 100;
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${current} / ${total}`;
    currentFile.textContent = `Downloading: ${fileName}`;
}

// Show Status Message
function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
    statusMessage.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 5000);
}

// UI Helper Functions
function setSearching(isSearching) {
    searchBtn.disabled = isSearching;
    searchInput.disabled = isSearching;
    if (isSearching) {
        searchBtn.textContent = 'Searching...';
    } else {
        searchBtn.innerHTML = `
            <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
            </svg>
            Search
        `;
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
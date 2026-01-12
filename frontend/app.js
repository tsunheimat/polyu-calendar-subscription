document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const dropArea = document.getElementById('drop-area');
    const fileMsg = dropArea.querySelector('.file-msg');
    const uploadBtn = document.getElementById('upload-btn');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');

    const uploadSection = document.getElementById('upload-section');
    const resultSection = document.getElementById('result-section');
    const feedUrlInput = document.getElementById('feed-url');
    const copyBtn = document.getElementById('copy-btn');
    const webcalLink = document.getElementById('webcal-link');
    const resetBtn = document.getElementById('reset-btn');

    // Drag and Drop Effects
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropArea.classList.add('dragover');
    }

    function unhighlight(e) {
        dropArea.classList.remove('dragover');
    }

    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        fileInput.files = files;
        updateFileLabel();
    }

    fileInput.addEventListener('change', updateFileLabel);

    function updateFileLabel() {
        if (fileInput.files.length > 0) {
            fileMsg.textContent = fileInput.files[0].name;
            errorMessage.classList.add('hidden');
        } else {
            fileMsg.textContent = 'Drag & Drop or Click to Select';
        }
    }

    // Upload Logic
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (fileInput.files.length === 0) {
            showError('Please select a file first.');
            return;
        }

        const file = fileInput.files[0];

        // Basic Client-side validation
        if (file.size > 1024 * 1024) {
            showError('File is too large. Max 1MB.');
            return;
        }

        if (!file.name.endsWith('.ics')) {
            showError('Invalid file type. Please upload a .ics file.');
            return;
        }

        startLoading();

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Note: In development/local, we might need to point to localhost:8787
            // logic to determine API URL:
            const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? 'http://127.0.0.1:8787/api/upload' // Assuming worker runs on 8787
                : '/api/upload';

            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showResult(data.feedUrl);
            } else {
                showError(data.error?.message || 'Upload failed. Please try again.');
            }
        } catch (err) {
            console.error(err);
            showError('Connection error. Is the backend running?');
        } finally {
            stopLoading();
        }
    });

    // Copy Logic
    copyBtn.addEventListener('click', () => {
        feedUrlInput.select();
        document.execCommand('copy'); // Fallback or use Navigator Clipboard

        // Visual feedback
        const originalIcon = copyBtn.innerHTML;
        copyBtn.innerHTML = '<span style="font-size: 1.2rem;">✓</span>';
        setTimeout(() => {
            copyBtn.innerHTML = originalIcon;
        }, 2000);
    });

    // Reset
    resetBtn.addEventListener('click', () => {
        resultSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        fileInput.value = '';
        updateFileLabel();
    });

    function startLoading() {
        uploadBtn.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
        errorMessage.classList.add('hidden');
    }

    function stopLoading() {
        uploadBtn.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
    }

    function showResult(url) {
        uploadSection.classList.add('hidden');
        resultSection.classList.remove('hidden');

        feedUrlInput.value = url;

        // Create webcal:// link
        let webcal = url.replace('https://', 'webcal://').replace('http://', 'webcal://');
        webcalLink.href = webcal;
    }
});

// ui-controller.js - UI interactions and DOM manipulation

document.addEventListener('DOMContentLoaded', function() {
    // Initialize StoryEngine
    const storyEngine = new StoryEngine();

    // DOM Elements
    const elements = {
        inputSection: document.getElementById('input-section'),
        jsonInput: document.getElementById('json-input'),
        loadButton: document.getElementById('load-button'),
        toggleButton: document.getElementById('toggle-input'),
        errorMessage: document.getElementById('error-message'),
        storyContainer: document.getElementById('story-container'),
        storyTitle: document.getElementById('story-title'),
        storyContent: document.getElementById('story-content'),
        choicesContainer: document.getElementById('choices-container'),
        shareButton: document.getElementById('share-button'),
        shareUrlContainer: document.getElementById('share-url-container'),
        shareUrl: document.getElementById('share-url'),
        copyUrlButton: document.getElementById('copy-url-button'),
        resetButton: document.getElementById('reset-button')
    };

    // UI Controller functions
    const uiController = {
        // Toggle input section visibility
        toggleInputSection: function() {
            elements.inputSection.classList.toggle('collapsed');
            this.updateToggleIcons();
        },

        // Update all toggle icons to match collapsed state
        updateToggleIcons: function() {
            const isCollapsed = elements.inputSection.classList.contains('collapsed');
            const icons = elements.inputSection.querySelectorAll('.toggle-icon');
            icons.forEach(icon => {
                icon.textContent = isCollapsed ? '►' : '▼';
            });
        },

        // Display error message
        showError: function(message) {
            elements.errorMessage.textContent = message;
            elements.errorMessage.style.display = 'block';
            elements.storyContainer.style.display = 'none';

            // Expand input section to show the error
            elements.inputSection.classList.remove('collapsed');
            this.updateToggleIcons();
        },

        // Hide error message
        hideError: function() {
            elements.errorMessage.textContent = '';
            elements.errorMessage.style.display = 'none';
        },

        // Display a passage
        displayPassage: function(passage) {
            // Set story title
            elements.storyTitle.textContent = storyEngine.getStoryTitle();

            // Clear previous content
            elements.storyContent.innerHTML = '';
            elements.choicesContainer.innerHTML = '';

            // Hide share URL if visible
            elements.shareUrlContainer.style.display = 'none';

            // Display passage content
            passage.content.forEach(item => {
                if (typeof item === 'string') {
                    // Text paragraph
                    const paragraph = document.createElement('p');
                    paragraph.className = 'story-paragraph';
                    paragraph.textContent = item;
                    elements.storyContent.appendChild(paragraph);
                } else if (item.choices) {
                    // Choices
                    for (const [choiceText, targetPassageName] of Object.entries(item.choices)) {
                        const choiceButton = document.createElement('button');
                        choiceButton.className = 'choice-button';
                        choiceButton.textContent = choiceText;

                        // Handle choice click
                        choiceButton.addEventListener('click', () => {
                            // Find target passage
                            const targetPassage = storyEngine.getPassage(targetPassageName);

                            if (targetPassage) {
                                // Display target passage
                                this.displayPassage(targetPassage);

                                // Scroll choices into view smoothly
                                setTimeout(() => {
                                    elements.choicesContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }, 100);
                            } else {
                                this.showError(`Passage "${targetPassageName}" not found!`);
                            }
                        });

                        elements.choicesContainer.appendChild(choiceButton);
                    }
                }
            });
        },

        // Try to load story from input
        loadStoryFromInput: function() {
            try {
                // Parse JSON
                const data = JSON.parse(elements.jsonInput.value);

                // Load story using engine
                const startPassage = storyEngine.loadStory(data);

                // Hide error message
                this.hideError();

                // Show story container
                elements.storyContainer.style.display = 'block';

                // Collapse input section to focus on story
                elements.inputSection.classList.add('collapsed');
                this.updateToggleIcons();

                // Display the start passage
                this.displayPassage(startPassage);

                // Scroll to story section
                document.getElementById('story-section').scrollIntoView({ behavior: 'smooth' });

            } catch (error) {
                this.showError(error.message || 'Invalid JSON. Please check your input.');
            }
        },

        // Handle share button click
        handleShareClick: function() {
            if (!storyEngine.storyData) {
                this.showError('No story loaded to share.');
                return;
            }

            const url = SharingUtils.generateShareableUrl(storyEngine.storyData);
            if (url) {
                elements.shareUrl.value = url;
                elements.shareUrlContainer.style.display = 'flex';

                // Select the URL text for easy copying
                elements.shareUrl.select();
            }
        },

        // Handle copy URL button click
        handleCopyUrlClick: function() {
            SharingUtils.copyToClipboard(elements.shareUrl.value, () => {
                // Visual feedback
                const originalText = elements.copyUrlButton.textContent;
                elements.copyUrlButton.textContent = 'Copied!';
                setTimeout(() => {
                    elements.copyUrlButton.textContent = originalText;
                }, 2000);
            });
        },

        // Check URL for story data
        checkUrlForStory: function() {
            const storyData = SharingUtils.extractStoryFromUrl();

            if (storyData) {
                try {
                    // Place story in the JSON input field
                    elements.jsonInput.value = JSON.stringify(storyData, null, 4);

                    // Load the story
                    const startPassage = storyEngine.loadStory(storyData);
                    this.displayPassage(startPassage);
                    elements.storyContainer.style.display = 'block';
                } catch (error) {
                    this.showError('Invalid story data in URL.');
                }
            }
        },

        // Reset story to start
        resetStory: function() {
            if (!storyEngine.storyData) {
                this.showError('No story loaded to reset.');
                return;
            }

            let startPassage = storyEngine.getPassage("Start");
            if (!startPassage && storyEngine.storyData.passages.length > 0) {
                startPassage = storyEngine.storyData.passages[0];
            }

            if (startPassage) {
                this.displayPassage(startPassage);
                document.getElementById('story-section').scrollIntoView({ behavior: 'smooth' });
            } else {
                this.showError('No start passage found in the story.');
            }
        },

        // Initialize the sample story
        initSampleStory: function() {
            const sampleStory = storyEngine.getSampleStory();
            elements.jsonInput.value = JSON.stringify(sampleStory, null, 4);
        }
    };

    // Event Listeners
    elements.toggleButton.addEventListener('click', () => uiController.toggleInputSection());

    // Make the header clickable to toggle as well
    elements.inputSection.querySelector('.header-row').addEventListener('click', () => uiController.toggleInputSection());

    // Load story button
    elements.loadButton.addEventListener('click', () => uiController.loadStoryFromInput());

    // Share button
    elements.shareButton.addEventListener('click', () => uiController.handleShareClick());

    // Copy URL button
    elements.copyUrlButton.addEventListener('click', () => uiController.handleCopyUrlClick());

    // Reset button
    elements.resetButton.addEventListener('click', () => uiController.resetStory());

    // Initialize sample story in the textarea
    uiController.initSampleStory();

    // Check for story in URL when page loads
    uiController.checkUrlForStory();
});
// ui-controller.js - UI interactions and DOM manipulation

document.addEventListener('DOMContentLoaded', function() {
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

    // Initialize StoryEngine
    const storyEngine = new StoryEngine();

    // Set up event listeners for StoryEngine events
    storyEngine
        .on('passageChanged', passage => uiController.renderPassage(passage))
        .on('error', errorMessage => uiController.showError(errorMessage))
        .on('storyLoaded', () => {
            // Hide error message
            uiController.hideError();

            // Show story container
            elements.storyContainer.style.display = 'block';

            // Update story title
            elements.storyTitle.textContent = storyEngine.getStoryTitle();

            // Collapse input section to focus on story
            elements.inputSection.classList.add('collapsed');
            uiController.updateToggleIcons();

            // Scroll to story section
            document.getElementById('story-section').scrollIntoView({ behavior: 'smooth' });
        });

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

        // Render a passage (UI specific)
        renderPassage: function(passage) {
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
                            // Make choice using the engine
                            if (storyEngine.makeChoice(targetPassageName)) {
                                // Scroll choices into view smoothly
                                setTimeout(() => {
                                    elements.choicesContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }, 100);
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

                // Load story using engine (will trigger storyLoaded event)
                storyEngine.loadStory(data);
            } catch (error) {
                this.showError(error.message || 'Invalid JSON. Please check your input.');
            }
        },

        // Handle share button click
        handleShareClick: function() {
            const storyData = storyEngine.getStoryData();

            if (!storyData) {
                this.showError('No story loaded to share.');
                return;
            }

            const url = SharingUtils.generateShareableUrl(storyData);
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

                    // Load the story (will trigger appropriate events)
                    storyEngine.loadStory(storyData);
                } catch (error) {
                    this.showError('Invalid story data in URL.');
                }
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
    elements.resetButton.addEventListener('click', () => storyEngine.resetToStart());

    // Initialize sample story in the textarea
    uiController.initSampleStory();

    // Check for story in URL when page loads
    uiController.checkUrlForStory();
});
class UIController {
    constructor(elements, storyEngine) {
        this.elements = elements;
        this.storyEngine = storyEngine;
        this.setupUIEventListeners();
    }

    setupUIEventListeners() {
        // Toggle input section
        this.elements.toggleButton.addEventListener('click', () => this.toggleInputSection());

        // Make the header clickable to toggle as well
        this.elements.inputSection.querySelector('.header-row').addEventListener('click', () =>
            this.toggleInputSection()
        );

        // Load story button
        this.elements.loadButton.addEventListener('click', () => this.loadStoryFromInput());

        // Share button
        this.elements.shareButton.addEventListener('click', () => this.handleShareClick());

        // Copy URL button
        this.elements.copyUrlButton.addEventListener('click', () => this.handleCopyUrlClick());

        // Reset button
        this.elements.resetButton.addEventListener('click', () => this.storyEngine.resetToStart());
    }

    // Toggle input section visibility
    toggleInputSection() {
        this.elements.inputSection.classList.toggle('collapsed');
        this.updateToggleIcons();
    }

    // Collapse input section
    collapseInputSection() {
        this.elements.inputSection.classList.add('collapsed');
        this.updateToggleIcons();
    }

    // Update all toggle icons to match collapsed state
    updateToggleIcons() {
        const isCollapsed = this.elements.inputSection.classList.contains('collapsed');
        const icons = this.elements.inputSection.querySelectorAll('.toggle-icon');
        icons.forEach(icon => {
            icon.textContent = isCollapsed ? '►' : '▼';
        });
    }

    // Show story container
    showStoryContainer() {
        this.elements.storyContainer.style.display = 'block';
    }

    // Update story title
    updateStoryTitle(title) {
        this.elements.storyTitle.textContent = title;
    }

    // Display error message
    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.style.display = 'block';
        this.elements.storyContainer.style.display = 'none';

        // Expand input section to show the error
        this.elements.inputSection.classList.remove('collapsed');
        this.updateToggleIcons();
    }

    // Hide error message
    hideError() {
        this.elements.errorMessage.textContent = '';
        this.elements.errorMessage.style.display = 'none';
    }

    // Render a passage (UI specific)
    renderPassage(passage) {
        // Clear previous content
        this.elements.storyContent.innerHTML = '';
        this.elements.choicesContainer.innerHTML = '';

        // Hide share URL if visible
        this.elements.shareUrlContainer.style.display = 'none';

        // Display passage content
        passage.content.forEach(item => {
            if (typeof item === 'string') {
                // Text paragraph
                const paragraph = document.createElement('p');
                paragraph.className = 'story-paragraph';
                paragraph.textContent = item;
                this.elements.storyContent.appendChild(paragraph);
            } else if (item.choices) {
                // Choices
                for (const [choiceText, targetPassageName] of Object.entries(item.choices)) {
                    const choiceButton = document.createElement('button');
                    choiceButton.className = 'choice-button';
                    choiceButton.textContent = choiceText;

                    // Handle choice click
                    choiceButton.addEventListener('click', () => {
                        // Make choice using the engine
                        if (this.storyEngine.makeChoice(targetPassageName)) {
                            // Scroll choices into view smoothly
                            setTimeout(() => {
                                this.elements.choicesContainer.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'nearest'
                                });
                            }, 100);
                        }
                    });

                    this.elements.choicesContainer.appendChild(choiceButton);
                }
            }
        });
    }

    // Try to load story from input
    loadStoryFromInput() {
        try {
            // Parse JSON
            const data = JSON.parse(this.elements.jsonInput.value);

            // Load story using engine (will trigger storyLoaded event)
            this.storyEngine.loadStory(data);
        } catch (error) {
            this.showError(error.message || 'Invalid JSON. Please check your input.');
        }
    }

    // Handle share button click
    handleShareClick() {
        const storyData = this.storyEngine.getStoryData();

        if (!storyData) {
            this.showError('No story loaded to share.');
            return;
        }

        const url = SharingUtils.generateShareableUrl(storyData);
        if (url) {
            this.elements.shareUrl.value = url;
            this.elements.shareUrlContainer.style.display = 'flex';

            // Select the URL text for easy copying
            this.elements.shareUrl.select();
        }
    }

    // Handle copy URL button click
    handleCopyUrlClick() {
        SharingUtils.copyToClipboard(this.elements.shareUrl.value, () => {
            // Visual feedback
            const originalText = this.elements.copyUrlButton.textContent;
            this.elements.copyUrlButton.textContent = 'Copied!';
            setTimeout(() => {
                this.elements.copyUrlButton.textContent = originalText;
            }, 2000);
        });
    }

    // Check URL for story data
    checkUrlForStory() {
        const storyData = SharingUtils.extractStoryFromUrl();

        if (storyData) {
            try {
                // Place story in the JSON input field
                this.elements.jsonInput.value = JSON.stringify(storyData, null, 4);

                // Load the story (will trigger appropriate events)
                this.storyEngine.loadStory(storyData);
            } catch (error) {
                this.showError('Invalid story data in URL.');
            }
        }
    }

    // Initialize the sample story
    initSampleStory(storyData) {
        this.elements.jsonInput.value = JSON.stringify(storyData, null, 4);
    }
}
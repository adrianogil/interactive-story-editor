// story-engine.js - Core functionality for the interactive story engine

class StoryEngine {
    constructor() {
        this.storyData = null;
        this.currentPassage = null;
        this.eventListeners = {};
        this.history = []; // Track navigation history
    }

    // Event system
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
        return this; // Allow method chaining
    }

    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(data));
        }
    }

    // Load story from data object
    loadStory(data) {
        // Validate story data
        if (!this.validateStoryData(data)) {
            throw new Error('Invalid story format. Story should have a name and passages array.');
        }

        // Set story data
        this.storyData = data;
        this.history = []; // Reset history when loading a new story
        this.emit('storyLoaded', this.storyData);

        // Load the first passage (usually named "Start")
        let startPassage = this.getPassage("Start");

        // If no passage named "Start", use the first passage
        if (!startPassage && this.storyData.passages.length > 0) {
            startPassage = this.storyData.passages[0];
        }

        if (startPassage) {
            this.navigateToPassage(startPassage.name);
            return startPassage;
        } else {
            throw new Error('No passages found in the story.');
        }
    }

    // Validate story data
    validateStoryData(data) {
        return (
            data &&
            typeof data === 'object' &&
            data.story_name &&
            Array.isArray(data.passages) &&
            data.passages.length > 0
        );
    }

    // Get passage by name
    getPassage(passageName) {
        if (!this.storyData || !this.storyData.passages) return null;
        return this.storyData.passages.find(p => p.name === passageName);
    }

    // Navigate to a specific passage
    navigateToPassage(passageName) {
        const targetPassage = this.getPassage(passageName);

        if (!targetPassage) {
            this.emit('error', `Passage "${passageName}" not found!`);
            return false;
        }

        // Add current passage to history before changing (if there is one)
        if (this.currentPassage) {
            this.history.push(this.currentPassage.name);
        }

        this.currentPassage = targetPassage;
        this.emit('passageChanged', targetPassage);
        return true;
    }

    // Handle choice selection
    makeChoice(targetPassageName) {
        return this.navigateToPassage(targetPassageName);
    }

    // Go back to previous passage
    goBack() {
        if (this.history.length === 0) {
            this.emit('error', 'No previous passages to navigate to.');
            return false;
        }

        const previousPassage = this.history.pop();

        // Don't add to history when going back
        const targetPassage = this.getPassage(previousPassage);
        if (!targetPassage) {
            this.emit('error', `Previous passage "${previousPassage}" not found!`);
            return false;
        }

        this.currentPassage = targetPassage;
        this.emit('passageChanged', targetPassage);
        return true;
    }

    // Reset to start passage
    resetToStart() {
        if (!this.storyData) {
            this.emit('error', 'No story loaded to reset.');
            return false;
        }

        // Clear history when resetting
        this.history = [];
        return this.navigateToPassage("Start");
    }

    // Get story title
    getStoryTitle() {
        return this.storyData ? this.storyData.story_name : '';
    }

    // Get story data for sharing
    getStoryData() {
        return this.storyData;
    }

    // Get the current passage
    getCurrentPassage() {
        return this.currentPassage;
    }
}
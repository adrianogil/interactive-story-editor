// main.js - Main application initialization

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    const app = new StoryApp();
    app.initialize();
});

class StoryApp {
    constructor() {
        // Core components
        this.storyEngine = new StoryEngine();
        this.uiController = null;
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;

        // Get DOM elements
        const elements = this.getDOMElements();

        // Initialize UI controller with DOM elements
        this.uiController = new UIController(elements, this.storyEngine);

        // Set up event listeners for StoryEngine events
        this.setupEventListeners();

        // Initialize sample story in the textarea
        this.uiController.initSampleStory(this.getSampleStory());

        // Check for story in URL when page loads
        this.uiController.checkUrlForStory();

        this.initialized = true;
    }

    getDOMElements() {
        return {
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
    }

    setupEventListeners() {
        this.storyEngine
            .on('passageChanged', passage => this.uiController.renderPassage(passage))
            .on('error', errorMessage => this.uiController.showError(errorMessage))
            .on('storyLoaded', () => {
                // Hide error message
                this.uiController.hideError();

                // Update story title and show story container
                this.uiController.updateStoryTitle(this.storyEngine.getStoryTitle());
                this.uiController.showStoryContainer();

                // Collapse input section to focus on story
                this.uiController.collapseInputSection();

                // Scroll to story section
                document.getElementById('story-section').scrollIntoView({ behavior: 'smooth' });
            });
    }

    getSampleStory() {
        return {
            "story_name": "Echoes of the Dragon",
            "passages": [
                {
                    "name": "Start",
                    "content": [
                        "You find yourself standing at the entrance of a dark forest.",
                        "The path splits into two: one leading deeper into the woods, and the other leading to a nearby village.",
                        {
                            "choices": {
                                "Enter the forest": "Forest",
                                "Go to the village": "Village"
                            }
                        }
                    ]
                },
                {
                    "name": "Forest",
                    "content": [
                        "The trees are dense and the path is overgrown. As you walk, you hear a faint crying sound.",
                        "Following the sound, you come across a baby dragon, trapped under some fallen branches.",
                        {
                            "choices": {
                                "Help the dragon": "HelpDragon",
                                "Leave the forest": "Start"
                            }
                        }
                    ]
                },
                {
                    "name": "Village",
                    "content": [
                        "You arrive at a small village. The villagers seem nervous and on edge.",
                        "An old man approaches you and warns about a dragon that has been terrorizing the area.",
                        {
                            "choices": {
                                "Offer to help": "OfferHelp",
                                "Go back to the forest entrance": "Start"
                            }
                        }
                    ]
                },
                {
                    "name": "HelpDragon",
                    "content": [
                        "You carefully remove the branches, freeing the baby dragon.",
                        "It looks at you gratefully and nuzzles against your hand. You've made a friend!",
                        {
                            "choices": {
                                "Take the dragon with you": "DragonFriend",
                                "Leave the dragon and go to the village": "Village"
                            }
                        }
                    ]
                },
                {
                    "name": "OfferHelp",
                    "content": [
                        "The villagers thank you and give you a sword to fight the dragon.",
                        "They point you toward a cave in the mountains where the dragon lives.",
                        {
                            "choices": {
                                "Go to the cave": "DragonCave",
                                "Head to the forest instead": "Forest"
                            }
                        }
                    ]
                },
                {
                    "name": "DragonFriend",
                    "content": [
                        "The baby dragon follows you. As you walk through the forest, it grows rapidly.",
                        "By the time you reach the village, it's the size of a horse. The villagers are terrified!",
                        {
                            "choices": {
                                "Explain that the dragon is friendly": "DragonPeace",
                                "Leave the village with your dragon": "DragonAdventure"
                            }
                        }
                    ]
                },
                {
                    "name": "DragonCave",
                    "content": [
                        "You reach the cave and find an enormous dragon sleeping on a pile of gold.",
                        "As you approach, you notice something around its neck - it looks like a collar with strange markings.",
                        {
                            "choices": {
                                "Attack the dragon": "DragonFight",
                                "Try to remove the collar": "DragonCollar"
                            }
                        }
                    ]
                },
                {
                    "name": "DragonPeace",
                    "content": [
                        "You convince the villagers that your dragon means no harm. They're skeptical but agree to a truce.",
                        "Over time, the dragon helps protect the village, and peace is established.",
                        {
                            "choices": {
                                "Start a new adventure": "Start"
                            }
                        }
                    ]
                },
                {
                    "name": "DragonAdventure",
                    "content": [
                        "You and your dragon companion leave the village behind, embarking on a journey of adventure.",
                        "Who knows what exciting challenges await you both in the wide world?",
                        {
                            "choices": {
                                "Start a new adventure": "Start"
                            }
                        }
                    ]
                },
                {
                    "name": "DragonFight",
                    "content": [
                        "You attack the dragon, but your sword barely scratches its scales.",
                        "The dragon awakens, angry and confused. It breathes fire in your direction!",
                        {
                            "choices": {
                                "Try to dodge": "DragonDodge",
                                "Run away": "Forest"
                            }
                        }
                    ]
                },
                {
                    "name": "DragonCollar",
                    "content": [
                        "You carefully approach and manage to cut the collar off without waking the dragon.",
                        "The dragon's demeanor instantly changes. It wakes up calmly, looks at you gratefully, and flies away.",
                        "When you return to the village, you're celebrated as a hero.",
                        {
                            "choices": {
                                "Start a new adventure": "Start"
                            }
                        }
                    ]
                },
                {
                    "name": "DragonDodge",
                    "content": [
                        "You narrowly avoid the dragon's fire breath!",
                        "In the chaos, you notice that the collar seems to be controlling the dragon, making it aggressive.",
                        {
                            "choices": {
                                "Try to remove the collar": "DragonCollar",
                                "Continue fighting": "DragonDefeat"
                            }
                        }
                    ]
                },
                {
                    "name": "DragonDefeat",
                    "content": [
                        "The battle is fierce, but ultimately, you're outmatched by the dragon's power.",
                        "Before the dragon can deliver a final blow, a baby dragon - the one you saved earlier - flies in and distracts it.",
                        "This gives you a chance to escape.",
                        {
                            "choices": {
                                "Return to the forest": "Forest",
                                "Go back to the village": "Village"
                            }
                        }
                    ]
                }
            ]
        };
    }
}


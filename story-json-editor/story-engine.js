// story-engine.js - Core functionality for the interactive story engine

class StoryEngine {
    constructor() {
        this.storyData = null;
        this.currentPassage = null;
        this.eventListeners = {};
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
        if (!data.story_name || !Array.isArray(data.passages) || data.passages.length === 0) {
            throw new Error('Invalid story format. Story should have a name and passages array.');
        }

        // Set story data
        this.storyData = data;
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

    // Get passage by name
    getPassage(passageName) {
        return this.storyData?.passages.find(p => p.name === passageName);
    }

    // Navigate to a specific passage
    navigateToPassage(passageName) {
        const targetPassage = this.getPassage(passageName);

        if (!targetPassage) {
            this.emit('error', `Passage "${passageName}" not found!`);
            return false;
        }

        this.currentPassage = targetPassage;
        this.emit('passageChanged', targetPassage);
        return true;
    }

    // Handle choice selection
    makeChoice(targetPassageName) {
        return this.navigateToPassage(targetPassageName);
    }

    // Reset to start passage
    resetToStart() {
        if (!this.storyData) {
            this.emit('error', 'No story loaded to reset.');
            return false;
        }

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

    // Sample story data
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
const assert = require('node:assert/strict');
const test = require('node:test');

const StoryEngine = require('../story-json-editor/story-engine.js');

test('keeps the existing Start passage preference when no explicit start is set', () => {
    const engine = new StoryEngine();
    engine.loadStory({
        story_name: 'Existing behavior',
        passages: [
            { name: 'Other', content: [] },
            { name: 'Start', content: [] }
        ]
    });

    assert.equal(engine.getCurrentPassage().name, 'Start');
});

test('uses and resets to an explicit start passage', () => {
    const engine = new StoryEngine();
    engine.loadStory({
        story_name: 'Explicit start',
        start_passage: 'Opening',
        passages: [
            { name: 'Start', content: [] },
            { name: 'Opening', content: [] },
            { name: 'Ending', content: [] }
        ]
    });

    assert.equal(engine.getCurrentPassage().name, 'Opening');
    assert.equal(engine.navigateToPassage('Ending'), true);
    assert.equal(engine.resetToStart(), true);
    assert.equal(engine.getCurrentPassage().name, 'Opening');
});

test('retains first-passage fallback and can reset stories without Start', () => {
    const engine = new StoryEngine();
    engine.loadStory({
        story_name: 'First fallback',
        passages: [
            { name: 'Opening', content: [] },
            { name: 'Ending', content: [] }
        ]
    });

    engine.navigateToPassage('Ending');
    assert.equal(engine.resetToStart(), true);
    assert.equal(engine.getCurrentPassage().name, 'Opening');
});

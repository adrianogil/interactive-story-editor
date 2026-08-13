const assert = require('node:assert/strict');
const test = require('node:test');

const { TwineExporter, TwineExportError } = require('../story-json-editor/twine-exporter.js');

global.window = global;
require('../story-json-editor/vendor/sugarcube-2.37.3/format.js');

function minimalStory(overrides = {}) {
    return {
        story_name: 'Minimal Story',
        passages: [
            {
                name: 'Start',
                content: ['Hello, world.']
            }
        ],
        ...overrides
    };
}

function getStoryDataTag(html) {
    return html.match(/<tw-storydata\b[^>]*>/)[0];
}

function getPassageTag(html, pid) {
    const pattern = new RegExp(`<tw-passagedata\\b[^>]*pid="${pid}"[^>]*>.*?<\\/tw-passagedata>`, 's');
    return html.match(pattern)[0];
}

function decodeHtmlEntities(value) {
    return value
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

function getPassageSource(html, pid) {
    const tag = getPassageTag(html, pid);
    const source = tag.slice(tag.indexOf('>') + 1, tag.lastIndexOf('</tw-passagedata>'));
    return decodeHtmlEntities(source);
}

test('exports a minimal, playable Twine 2 SugarCube document', () => {
    const html = TwineExporter.generateHtml(minimalStory());
    const storyTag = getStoryDataTag(html);

    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.match(storyTag, /name="Minimal Story"/);
    assert.match(storyTag, /startnode="1"/);
    assert.match(storyTag, /format="SugarCube"/);
    assert.match(storyTag, /format-version="2\.37\.3"/);
    assert.match(storyTag, /ifid="[0-9A-F-]{36}"/);
    assert.match(getPassageSource(html, 1), /<p><nowiki>Hello, world\.<\/nowiki><\/p>/);
    assert.doesNotMatch(html, /\{\{(?:STORY_NAME|STORY_DATA)\}\}/);
    assert.doesNotMatch(html, /<(?:script|link)\b[^>]*(?:src|href)="https?:/i);
});

test('maps branching choices to standard Twine link syntax', () => {
    const story = minimalStory({
        passages: [
            {
                name: 'Start',
                content: [
                    'Choose carefully.',
                    { choices: { 'Take the left path': 'Left', 'Wait & listen': 'Ending' } }
                ]
            },
            { name: 'Left', content: [{ choices: { Continue: 'Ending' } }] },
            { name: 'Ending', content: ['The end.'] }
        ]
    });
    const source = getPassageSource(TwineExporter.generateHtml(story), 1);

    assert.match(source, /\[\["Take the left path"->Left\]\]/);
    assert.match(source, /\[\["Wait & listen"->Ending\]\]/);
});

test('escapes attributes and content while preserving Unicode and verbatim text', () => {
    const story = {
        story_name: '“Café” <夜> & Friends',
        start_passage: 'Início "A&B"',
        passages: [
            {
                name: 'Início "A&B"',
                content: [
                    'Olá, 世界 <script>alert("no")</script> [[not a link]] <<set $x = 1>>',
                    { choices: { 'Avançar <agora> & sorrir': 'Fim' } }
                ]
            },
            { name: 'Fim', content: ['Até logo 👋'] }
        ]
    };
    const html = TwineExporter.generateHtml(story);
    const storyTag = getStoryDataTag(html);
    const firstPassage = getPassageTag(html, 1);
    const source = getPassageSource(html, 1);

    assert.match(storyTag, /name="“Café” &lt;夜&gt; &amp; Friends"/);
    assert.match(firstPassage, /name="Início &quot;A&amp;B&quot;"/);
    assert.match(source, /<nowiki>Olá, 世界 <script>alert\("no"\)<\/script> \[\[not a link\]\] <<set \$x = 1>><\/nowiki>/);
    assert.match(source, /\[\["Avançar <agora> & sorrir"->Fim\]\]/);
    assert.match(html, /Até logo 👋/);
});

test('produces byte-for-byte deterministic output and a deterministic version-5 IFID', () => {
    const story = minimalStory();
    const first = TwineExporter.generateHtml(story);
    const second = TwineExporter.generateHtml(JSON.parse(JSON.stringify(story)));
    const ifid = getStoryDataTag(first).match(/ifid="([^"]+)"/)[1];

    assert.equal(first, second);
    assert.equal(ifid[14], '5');
    assert.match(ifid[19], /[89AB]/);
});

test('maps story metadata, explicit start, tags, positions, and sizes', () => {
    const story = {
        story_name: 'Mapped Story',
        start_passage: 'Second',
        metadata: {
            ifid: 'D674C58C-DEFA-4F70-B7A2-27742230C0FC',
            tags: ['demo', 'release'],
            zoom: 1.25
        },
        passages: [
            { name: 'First', tags: ['unreachable'], position: { x: 12.5, y: -4 }, content: ['One'] },
            {
                name: 'Second',
                tags: ['opening'],
                position: { x: 640, y: 320 },
                size: { width: 140, height: 120 },
                content: ['Two']
            }
        ]
    };
    const html = TwineExporter.generateHtml(story);
    const storyTag = getStoryDataTag(html);

    assert.match(storyTag, /startnode="2"/);
    assert.match(storyTag, /ifid="D674C58C-DEFA-4F70-B7A2-27742230C0FC"/);
    assert.match(storyTag, /zoom="1\.25"/);
    assert.match(storyTag, /tags="demo release"/);
    assert.match(getPassageTag(html, 1), /tags="unreachable" position="12\.5,-4" size="100,100"/);
    assert.match(getPassageTag(html, 2), /tags="opening" position="640,320" size="140,120"/);
});

test('reports invalid and unsupported story constructs clearly', async t => {
    const cases = [
        ['invalid root', null, 'JSON root must be an object'],
        [
            'duplicate passage names',
            minimalStory({ passages: [{ name: 'Start', content: [] }, { name: 'Start', content: [] }] }),
            'Duplicate passage name "Start"'
        ],
        [
            'missing explicit start',
            minimalStory({ start_passage: 'Missing' }),
            'Start passage "Missing" does not exist'
        ],
        [
            'broken choice target',
            minimalStory({ passages: [{ name: 'Start', content: [{ choices: { Go: 'Missing' } }] }] }),
            'links to missing passage "Missing"'
        ],
        [
            'unsupported content object',
            minimalStory({ passages: [{ name: 'Start', content: [{ image: 'cover.png' }] }] }),
            'must be a string or an object containing choices'
        ],
        [
            'unsupported link delimiter',
            minimalStory({ passages: [{ name: 'Start', content: [{ choices: { 'Bad -> link': 'Start' } }] }] }),
            'unsupported Twine link delimiter'
        ],
        [
            'reserved behavior tag',
            minimalStory({ passages: [{ name: 'Start', tags: ['script'], content: [] }] }),
            'unsupported SugarCube behavior tag'
        ],
        [
            'closing nowiki markup',
            minimalStory({ passages: [{ name: 'Start', content: ['Unsafe </nowiki> markup'] }] }),
            'unsupported closing nowiki markup'
        ],
        [
            'unsafe HTML control character',
            minimalStory({ passages: [{ name: 'Start', content: ['Unsafe\u0000text'] }] }),
            'cannot be stored safely in HTML'
        ],
        [
            'invalid IFID',
            minimalStory({ metadata: { ifid: 'lowercase-id' } }),
            'metadata.ifid must contain 8-63 uppercase letters'
        ]
    ];

    for (const [name, story, expectedMessage] of cases) {
        await t.test(name, () => {
            assert.throws(
                () => TwineExporter.generateHtml(story),
                error => error instanceof TwineExportError && error.message.includes(expectedMessage)
            );
        });
    }
});

test('downloads through a temporary DOM anchor and revokes the object URL', () => {
    const events = [];
    const anchor = {
        style: {},
        click() { events.push('click'); },
        remove() { events.push('remove'); }
    };
    const documentMock = {
        body: {
            appendChild(element) {
                assert.equal(element, anchor);
                events.push('append');
            }
        },
        createElement(tagName) {
            assert.equal(tagName, 'a');
            return anchor;
        }
    };
    const urlMock = {
        createObjectURL(blob) {
            assert.equal(blob.type, 'text/html;charset=utf-8');
            events.push('create-url');
            return 'blob:story';
        },
        revokeObjectURL(url) {
            assert.equal(url, 'blob:story');
            events.push('revoke-url');
        }
    };

    const result = TwineExporter.downloadStory(minimalStory(), {
        document: documentMock,
        URL: urlMock,
        Blob,
        schedule: callback => callback()
    });

    assert.equal(result.filename, 'minimal-story-twine.html');
    assert.equal(anchor.href, 'blob:story');
    assert.equal(anchor.download, 'minimal-story-twine.html');
    assert.deepEqual(events, ['create-url', 'append', 'click', 'remove', 'revoke-url']);
});

test('creates portable, bounded filenames', () => {
    assert.equal(TwineExporter.createFilename('  Olá, 世界!  '), 'ola-twine.html');
    assert.equal(TwineExporter.createFilename('CON'), 'story-con-twine.html');
    assert.equal(TwineExporter.createFilename('👋'), 'story-twine.html');
    assert.ok(TwineExporter.createFilename('a'.repeat(200)).length <= 83);
});

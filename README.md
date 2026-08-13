# Interactive Story Editor

A lightweight, browser-based editor and player for branching stories defined in JSON.
Paste a story, load it, and click through choices. Share stories by URL for quick
collaboration or demos.

## Features

- **JSON-powered story editor** with a built-in sample story.
- **Branching passage navigation** with clickable choice buttons.
- **Visual story map** with clickable passages, labeled branches, zoom, pan,
  current/visited state, and structural diagnostics.
- **Story reset** to restart from the beginning.
- **Shareable URLs** that embed story data in the query string.
- **Twine HTML export** as a self-contained, playable SugarCube story.
- **Collapsible editor panel** to focus on the story playback.
- **Error handling** for invalid JSON or missing passages.

## Getting Started

1. Open `story-json-editor/storyeditor.html` in your browser.
2. Paste or edit story JSON in the editor panel.
3. Click **Load Story** to start reading and choosing branches.
4. Use **Share Story** to generate a URL with the story embedded.
5. Use **Export Twine HTML** to download the JSON currently in the editor as a
   playable `.html` file.
6. Click **Reset Story** to return to the beginning.

> Tip: If you need a local web server (for clipboard support in some browsers), run:
>
> ```bash
> python3 -m http.server
> ```
>
> Then open `http://localhost:8000/story-json-editor/storyeditor.html`.

## Story JSON Format

Each story includes a name and an array of passages. Each passage has a `name` and
`content`, which is a list of strings and choice blocks.

```json
{
  "story_name": "Echoes of the Dragon",
  "passages": [
    {
      "name": "Start",
      "content": [
        "You find yourself standing at the entrance of a dark forest.",
        {
          "choices": {
            "Enter the forest": "Forest",
            "Go to the village": "Village"
          }
        }
      ]
    }
  ]
}
```

The optional export fields below are also supported. Existing stories do not need
them: the start remains the passage named `Start`, or the first passage when there
is no `Start` passage.

```json
{
  "story_name": "A Night Journey",
  "start_passage": "Platform",
  "metadata": {
    "ifid": "D674C58C-DEFA-4F70-B7A2-27742230C0FC",
    "tags": ["mystery", "demo"],
    "zoom": 1
  },
  "passages": [
    {
      "name": "Platform",
      "tags": ["opening"],
      "position": { "x": 320, "y": 200 },
      "size": { "width": 100, "height": 100 },
      "content": [
        "The last train is waiting.",
        { "choices": { "Board the train": "Carriage" } }
      ]
    },
    {
      "name": "Carriage",
      "content": ["The doors close behind you."]
    }
  ]
}
```

## Twine HTML Export

Export follows the
[Twine 2 HTML Output Specification v1.0.2](https://github.com/iftechfoundation/twine-specs/blob/master/twine-2-htmloutput-spec.md)
and targets [SugarCube 2.37.3](https://www.motoslave.net/sugarcube/2/releases.php).
The official SugarCube runtime is bundled under its BSD-2-Clause license, so the
downloaded file has no CDN or network dependency. It opens directly in a modern
browser and can be imported with **Import From File** in Twine 2.

The mapping is deterministic:

- Passage order becomes sequential Twine PIDs; `start_passage` becomes
  `startnode`.
- `story_name`, `metadata.ifid`, story tags, and zoom become `<tw-storydata>`
  metadata.
- Passage names, tags, positions, and sizes become `<tw-passagedata>` metadata.
- String content becomes escaped, verbatim SugarCube paragraphs. Text that looks
  like HTML, a macro, or a Twine link remains literal text.
- Choice blocks become standard `[[label->target]]` passage links.
- Missing positions use a stable four-column layout; missing sizes use `100,100`.
- Without `metadata.ifid`, export derives a deterministic UUIDv5-style IFID from
  the story. Set an IFID explicitly to keep the same project identity across
  story edits.

### Export validation and limitations

The editor continues to load and play the original JSON format as before. Twine
export is stricter and reports all detected issues together. It rejects duplicate
passage names, missing explicit start passages, broken choice targets, malformed
content, invalid metadata/geometry/tags, and unsupported SugarCube behavior tags
(`init`, `script`, `stylesheet`, and `widget`).

Only strings and `{ "choices": { ... } }` content blocks are exported. Arbitrary
Twine/SugarCube macros, scripts, stylesheets, media blocks, and choice setters are
not supported. Passage names and choice labels/targets cannot contain Twine link
delimiters (`[[`, `]]`, `->`, `<-`, or `|`). Tags cannot contain whitespace. All
HTML attribute and passage data characters are escaped before insertion into the
Twine document. Because plain text uses SugarCube's verbatim wrapper, a literal
closing `</nowiki>` token in a text item is unsupported.

## Tests

The project uses Node's built-in test runner and has no package dependencies:

```bash
npm run check
```

This runs JavaScript syntax checks plus export, validation, determinism, Unicode,
metadata, and DOM download tests.

## Project Layout

- `story-json-editor/storyeditor.html`: The UI shell.
- `story-json-editor/storyeditor.css`: Styles for the editor and story view.
- `story-json-editor/main.js`: App bootstrap and sample story data.
- `story-json-editor/story-engine.js`: Story loading, navigation, and history.
- `story-json-editor/story-graph.js`: SVG graph layout, rendering, diagnostics,
  and graph interactions.
- `story-json-editor/twine-exporter.js`: Twine validation, serialization, and
  browser download support.
- `story-json-editor/ui-controller.js`: UI rendering and interactions.
- `story-json-editor/sharing-utils.js`: Shareable URL and clipboard helpers.
- `story-json-editor/vendor/sugarcube-2.37.3/`: Pinned offline story format
  runtime and its license.
- `tests/`: Node-based automated coverage.

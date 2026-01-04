# Interactive Story Editor

A lightweight, browser-based editor and player for branching stories defined in JSON.
Paste a story, load it, and click through choices. Share stories by URL for quick
collaboration or demos.

## Features

- **JSON-powered story editor** with a built-in sample story.
- **Branching passage navigation** with clickable choice buttons.
- **Story reset** to restart from the beginning.
- **Shareable URLs** that embed story data in the query string.
- **Collapsible editor panel** to focus on the story playback.
- **Error handling** for invalid JSON or missing passages.

## Getting Started

1. Open `story-json-editor/storyeditor.html` in your browser.
2. Paste or edit story JSON in the editor panel.
3. Click **Load Story** to start reading and choosing branches.
4. Use **Share Story** to generate a URL with the story embedded.
5. Click **Reset Story** to return to the beginning.

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

## Project Layout

- `story-json-editor/storyeditor.html`: The UI shell.
- `story-json-editor/storyeditor.css`: Styles for the editor and story view.
- `story-json-editor/main.js`: App bootstrap and sample story data.
- `story-json-editor/story-engine.js`: Story loading, navigation, and history.
- `story-json-editor/ui-controller.js`: UI rendering and interactions.
- `story-json-editor/sharing-utils.js`: Shareable URL and clipboard helpers.

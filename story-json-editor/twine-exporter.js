// twine-exporter.js - Deterministic Twine 2 / SugarCube HTML export

(function(root) {
    'use strict';

    const STORY_FORMAT_NAME = 'SugarCube';
    const STORY_FORMAT_VERSION = '2.37.3';
    const TWINE_OUTPUT_SPEC_VERSION = '1.0.2';
    const CREATOR_NAME = 'Interactive Story Editor';
    const CREATOR_VERSION = '1.0.0';
    const IFID_NAMESPACE = 'F0B86E68-3E7E-5D21-8D42-50D38B2C6A9D';
    const DEFAULT_PASSAGE_SIZE = { width: 100, height: 100 };
    const RESERVED_PASSAGE_TAGS = new Set(['init', 'script', 'stylesheet', 'widget']);
    const LINK_DELIMITERS = ['[[', ']]', '->', '<-', '|'];

    class TwineExportError extends Error {
        constructor(message, issues = []) {
            super(message);
            this.name = 'TwineExportError';
            this.issues = issues;
        }
    }

    class TwineExporter {
        static registerStoryFormat(format) {
            if (
                !format ||
                format.name !== STORY_FORMAT_NAME ||
                format.version !== STORY_FORMAT_VERSION ||
                typeof format.source !== 'string'
            ) {
                throw new TwineExportError(
                    `Expected the ${STORY_FORMAT_NAME} ${STORY_FORMAT_VERSION} story format.`
                );
            }

            this.storyFormat = format;
        }

        static generateHtml(storyData) {
            const story = this.validateAndNormalize(storyData);
            const format = this.storyFormat;

            if (!format) {
                throw new TwineExportError(
                    `${STORY_FORMAT_NAME} ${STORY_FORMAT_VERSION} is not available for export.`
                );
            }

            const storyMarkup = this.createStoryDataMarkup(story);
            const replacements = {
                STORY_NAME: escapeHtml(story.name),
                STORY_DATA: storyMarkup
            };
            const html = format.source.replace(
                /\{\{(STORY_NAME|STORY_DATA)\}\}/g,
                (placeholder, key) => replacements[key]
            );

            if (/\{\{(?:STORY_NAME|STORY_DATA)\}\}/.test(html)) {
                throw new TwineExportError('The Twine story format template is incomplete.');
            }

            return html;
        }

        static downloadStory(storyData, environment = {}) {
            const html = this.generateHtml(storyData);
            const documentObject = environment.document || root.document;
            const urlObject = environment.URL || root.URL;
            const BlobConstructor = environment.Blob || root.Blob;
            const schedule = environment.schedule || (callback => root.setTimeout(callback, 0));

            if (!documentObject || !urlObject || !BlobConstructor) {
                throw new TwineExportError('This browser cannot create a local story download.');
            }

            const filename = this.createFilename(storyData.story_name);
            const blob = new BlobConstructor([html], { type: 'text/html;charset=utf-8' });
            const url = urlObject.createObjectURL(blob);
            const anchor = documentObject.createElement('a');

            anchor.href = url;
            anchor.download = filename;
            anchor.style.display = 'none';
            documentObject.body.appendChild(anchor);

            try {
                anchor.click();
            } finally {
                if (typeof anchor.remove === 'function') anchor.remove();
                else documentObject.body.removeChild(anchor);
                schedule(() => urlObject.revokeObjectURL(url));
            }

            return { filename, html, blob };
        }

        static createFilename(storyName) {
            const asciiName = String(storyName || '')
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();
            let slug = asciiName
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 72)
                .replace(/-+$/g, '');

            if (!slug) slug = 'story';
            if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(slug)) slug = `story-${slug}`;
            return `${slug}-twine.html`;
        }

        static validateAndNormalize(data) {
            const issues = [];

            if (!isPlainObject(data)) {
                throw new TwineExportError('Story export failed: the JSON root must be an object.');
            }

            const storyName = validateNonEmptyString(data.story_name, 'story_name', issues);
            if (!Array.isArray(data.passages) || data.passages.length === 0) {
                issues.push('passages must be a non-empty array.');
            }

            const metadata = this.normalizeMetadata(data.metadata, issues);
            const passages = [];
            const passageNames = new Set();

            if (Array.isArray(data.passages)) {
                data.passages.forEach((passage, index) => {
                    const path = `passages[${index}]`;
                    if (!isPlainObject(passage)) {
                        issues.push(`${path} must be an object.`);
                        return;
                    }

                    const name = validateNonEmptyString(passage.name, `${path}.name`, issues);
                    if (name) {
                        if (passageNames.has(name)) {
                            issues.push(`Duplicate passage name "${name}".`);
                        } else {
                            passageNames.add(name);
                        }
                        validateLinkComponent(name, `${path}.name`, issues);
                    }

                    const content = this.normalizeContent(passage.content, path, issues);
                    const tags = normalizeTags(passage.tags, `${path}.tags`, issues, true);
                    const position = normalizePoint(
                        passage.position,
                        `${path}.position`,
                        defaultPosition(index),
                        issues
                    );
                    const size = normalizeSize(passage.size, `${path}.size`, issues);

                    passages.push({ name, content, tags, position, size });
                });
            }

            const explicitStart = data.start_passage === undefined
                ? null
                : validateNonEmptyString(data.start_passage, 'start_passage', issues);
            let startPassageName = explicitStart;

            if (!startPassageName && passages.length > 0) {
                startPassageName = passageNames.has('Start') ? 'Start' : passages[0].name;
            }

            if (explicitStart && !passageNames.has(explicitStart)) {
                issues.push(`Start passage "${explicitStart}" does not exist.`);
            }

            passages.forEach((passage, passageIndex) => {
                passage.content.forEach((item, itemIndex) => {
                    if (item.type !== 'choices') return;
                    item.choices.forEach(choice => {
                        if (!passageNames.has(choice.target)) {
                            issues.push(
                                `passages[${passageIndex}].content[${itemIndex}] links to missing passage "${choice.target}".`
                            );
                        }
                    });
                });
            });

            if (issues.length > 0) {
                throw new TwineExportError(
                    `Story export failed:\n- ${issues.join('\n- ')}`,
                    issues
                );
            }

            const startIndex = passages.findIndex(passage => passage.name === startPassageName);
            const canonicalStory = {
                story_name: storyName,
                start_passage: startPassageName,
                metadata: {
                    tags: metadata.tags,
                    zoom: metadata.zoom
                },
                passages
            };
            const ifid = metadata.ifid || createUuidV5(stableStringify(canonicalStory), IFID_NAMESPACE);

            return {
                name: storyName,
                ifid,
                tags: metadata.tags,
                zoom: metadata.zoom,
                startPid: String(startIndex + 1),
                passages
            };
        }

        static normalizeMetadata(value, issues) {
            if (value === undefined) {
                return { ifid: null, tags: [], zoom: 1 };
            }

            if (!isPlainObject(value)) {
                issues.push('metadata must be an object when provided.');
                return { ifid: null, tags: [], zoom: 1 };
            }

            const supportedKeys = new Set(['ifid', 'tags', 'zoom']);
            Object.keys(value).forEach(key => {
                if (!supportedKeys.has(key)) {
                    issues.push(`metadata.${key} is not supported for Twine export.`);
                }
            });

            let ifid = null;
            if (value.ifid !== undefined) {
                if (typeof value.ifid !== 'string' || !/^[0-9A-Z-]{8,63}$/.test(value.ifid)) {
                    issues.push(
                        'metadata.ifid must contain 8-63 uppercase letters, digits, or hyphens.'
                    );
                } else {
                    ifid = value.ifid;
                }
            }

            const tags = normalizeTags(value.tags, 'metadata.tags', issues, false);
            let zoom = 1;
            if (value.zoom !== undefined) {
                if (typeof value.zoom !== 'number' || !Number.isFinite(value.zoom) || value.zoom <= 0) {
                    issues.push('metadata.zoom must be a finite number greater than zero.');
                } else {
                    zoom = value.zoom;
                }
            }

            return { ifid, tags, zoom };
        }

        static normalizeContent(value, passagePath, issues) {
            if (!Array.isArray(value)) {
                issues.push(`${passagePath}.content must be an array.`);
                return [];
            }

            const content = [];
            value.forEach((item, index) => {
                const path = `${passagePath}.content[${index}]`;
                if (typeof item === 'string') {
                    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(item)) {
                        issues.push(`${path} contains characters that cannot be stored safely in HTML.`);
                    }
                    if (/<\/nowiki\s*>/i.test(item)) {
                        issues.push(`${path} contains unsupported closing nowiki markup.`);
                    }
                    content.push({ type: 'text', text: item });
                    return;
                }

                if (!isPlainObject(item) || !isPlainObject(item.choices)) {
                    issues.push(`${path} must be a string or an object containing choices.`);
                    return;
                }

                const itemKeys = Object.keys(item);
                if (itemKeys.length !== 1 || itemKeys[0] !== 'choices') {
                    issues.push(`${path} contains unsupported fields; only choices is supported.`);
                }

                const choiceEntries = Object.entries(item.choices);
                if (choiceEntries.length === 0) {
                    issues.push(`${path}.choices must contain at least one choice.`);
                }

                const choices = [];
                choiceEntries.forEach(([label, target]) => {
                    if (!label.trim()) issues.push(`${path}.choices contains an empty label.`);
                    validateLinkComponent(label, `${path} choice label`, issues);
                    if (typeof target !== 'string' || !target.trim()) {
                        issues.push(`${path}.choices[${JSON.stringify(label)}] must target a passage name.`);
                    } else {
                        validateLinkComponent(target, `${path} choice target`, issues);
                        choices.push({ label, target });
                    }
                });

                content.push({ type: 'choices', choices });
            });

            return content;
        }

        static createStoryDataMarkup(story) {
            const storyAttributes = [
                ['name', story.name],
                ['startnode', story.startPid],
                ['creator', CREATOR_NAME],
                ['creator-version', CREATOR_VERSION],
                ['ifid', story.ifid],
                ['zoom', formatNumber(story.zoom)],
                ['format', STORY_FORMAT_NAME],
                ['format-version', STORY_FORMAT_VERSION],
                ['options', ''],
                ['tags', story.tags.join(' ')]
            ];
            const lines = [
                `<tw-storydata ${formatAttributes(storyAttributes)} hidden>`,
                '<style role="stylesheet" id="twine-user-stylesheet" type="text/twine-css"></style>',
                '<script role="script" id="twine-user-script" type="text/twine-javascript"></script>'
            ];

            story.passages.forEach((passage, index) => {
                const passageSource = passage.content.map(item => {
                    if (item.type === 'text') {
                        return `<p><nowiki>${item.text}</nowiki></p>`;
                    }

                    return item.choices
                        .map(choice => `[[${quoteTwineScriptString(choice.label)}->${choice.target}]]`)
                        .join('\n');
                }).join('\n\n');
                const attributes = [
                    ['pid', String(index + 1)],
                    ['name', passage.name],
                    ['tags', passage.tags.join(' ')],
                    ['position', `${formatNumber(passage.position.x)},${formatNumber(passage.position.y)}`],
                    ['size', `${formatNumber(passage.size.width)},${formatNumber(passage.size.height)}`]
                ];

                lines.push(
                    `<tw-passagedata ${formatAttributes(attributes)}>${escapeHtml(passageSource)}</tw-passagedata>`
                );
            });

            lines.push('</tw-storydata>');
            return lines.join('\n');
        }
    }

    TwineExporter.storyFormat = null;
    TwineExporter.STORY_FORMAT_NAME = STORY_FORMAT_NAME;
    TwineExporter.STORY_FORMAT_VERSION = STORY_FORMAT_VERSION;
    TwineExporter.TWINE_OUTPUT_SPEC_VERSION = TWINE_OUTPUT_SPEC_VERSION;

    function isPlainObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function validateNonEmptyString(value, path, issues) {
        if (typeof value !== 'string' || !value.trim()) {
            issues.push(`${path} must be a non-empty string.`);
            return '';
        }
        if (/[\u0000-\u001F\u007F]/.test(value)) {
            issues.push(`${path} cannot contain control characters.`);
        }
        return value;
    }

    function validateLinkComponent(value, path, issues) {
        if (typeof value !== 'string') return;
        if (/[\u0000-\u001F\u007F]/.test(value)) {
            issues.push(`${path} cannot contain control characters.`);
        }
        LINK_DELIMITERS.forEach(delimiter => {
            if (value.includes(delimiter)) {
                issues.push(`${path} contains unsupported Twine link delimiter "${delimiter}".`);
            }
        });
    }

    function normalizeTags(value, path, issues, rejectReserved) {
        if (value === undefined) return [];
        if (!Array.isArray(value)) {
            issues.push(`${path} must be an array of tag strings.`);
            return [];
        }

        const tags = [];
        const seen = new Set();
        value.forEach((tag, index) => {
            if (typeof tag !== 'string' || !tag || /\s/.test(tag)) {
                issues.push(`${path}[${index}] must be a non-empty tag without whitespace.`);
                return;
            }
            if (rejectReserved && RESERVED_PASSAGE_TAGS.has(tag.toLowerCase())) {
                issues.push(`${path}[${index}] uses unsupported SugarCube behavior tag "${tag}".`);
                return;
            }
            if (seen.has(tag)) {
                issues.push(`${path} contains duplicate tag "${tag}".`);
                return;
            }
            seen.add(tag);
            tags.push(tag);
        });
        return tags;
    }

    function normalizePoint(value, path, fallback, issues) {
        if (value === undefined) return fallback;
        if (
            !isPlainObject(value) ||
            typeof value.x !== 'number' ||
            !Number.isFinite(value.x) ||
            typeof value.y !== 'number' ||
            !Number.isFinite(value.y)
        ) {
            issues.push(`${path} must contain finite numeric x and y values.`);
            return fallback;
        }
        return { x: value.x, y: value.y };
    }

    function normalizeSize(value, path, issues) {
        if (value === undefined) return { ...DEFAULT_PASSAGE_SIZE };
        if (
            !isPlainObject(value) ||
            typeof value.width !== 'number' ||
            !Number.isFinite(value.width) ||
            value.width <= 0 ||
            typeof value.height !== 'number' ||
            !Number.isFinite(value.height) ||
            value.height <= 0
        ) {
            issues.push(`${path} must contain positive finite width and height values.`);
            return { ...DEFAULT_PASSAGE_SIZE };
        }
        return { width: value.width, height: value.height };
    }

    function defaultPosition(index) {
        return {
            x: 100 + (index % 4) * 220,
            y: 100 + Math.floor(index / 4) * 180
        };
    }

    function formatNumber(value) {
        return String(Object.is(value, -0) ? 0 : value);
    }

    function formatAttributes(attributes) {
        return attributes
            .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
            .join(' ');
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function stableStringify(value) {
        if (Array.isArray(value)) {
            return `[${value.map(stableStringify).join(',')}]`;
        }
        if (isPlainObject(value)) {
            return `{${Object.keys(value).sort().map(key => (
                `${JSON.stringify(key)}:${stableStringify(value[key])}`
            )).join(',')}}`;
        }
        return JSON.stringify(value);
    }

    function quoteTwineScriptString(value) {
        return JSON.stringify(value)
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029');
    }

    function createUuidV5(name, namespace) {
        const namespaceBytes = namespace.replace(/-/g, '').match(/.{2}/g)
            .map(byte => parseInt(byte, 16));
        const nameBytes = Array.from(new TextEncoder().encode(name));
        const hash = sha1(namespaceBytes.concat(nameBytes)).slice(0, 16);
        hash[6] = (hash[6] & 0x0f) | 0x50;
        hash[8] = (hash[8] & 0x3f) | 0x80;
        const hex = hash.map(byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    function sha1(inputBytes) {
        const bitLength = inputBytes.length * 8;
        const totalLength = Math.ceil((inputBytes.length + 9) / 64) * 64;
        const bytes = new Uint8Array(totalLength);
        bytes.set(inputBytes);
        bytes[inputBytes.length] = 0x80;
        const view = new DataView(bytes.buffer);
        view.setUint32(totalLength - 8, Math.floor(bitLength / 0x100000000), false);
        view.setUint32(totalLength - 4, bitLength >>> 0, false);

        let h0 = 0x67452301;
        let h1 = 0xefcdab89;
        let h2 = 0x98badcfe;
        let h3 = 0x10325476;
        let h4 = 0xc3d2e1f0;
        const words = new Uint32Array(80);

        for (let offset = 0; offset < totalLength; offset += 64) {
            for (let index = 0; index < 16; index += 1) {
                words[index] = view.getUint32(offset + index * 4, false);
            }
            for (let index = 16; index < 80; index += 1) {
                words[index] = rotateLeft(
                    words[index - 3] ^ words[index - 8] ^ words[index - 14] ^ words[index - 16],
                    1
                );
            }

            let a = h0;
            let b = h1;
            let c = h2;
            let d = h3;
            let e = h4;

            for (let index = 0; index < 80; index += 1) {
                let f;
                let k;
                if (index < 20) {
                    f = (b & c) | (~b & d);
                    k = 0x5a827999;
                } else if (index < 40) {
                    f = b ^ c ^ d;
                    k = 0x6ed9eba1;
                } else if (index < 60) {
                    f = (b & c) | (b & d) | (c & d);
                    k = 0x8f1bbcdc;
                } else {
                    f = b ^ c ^ d;
                    k = 0xca62c1d6;
                }

                const temp = (rotateLeft(a, 5) + f + e + k + words[index]) >>> 0;
                e = d;
                d = c;
                c = rotateLeft(b, 30);
                b = a;
                a = temp;
            }

            h0 = (h0 + a) >>> 0;
            h1 = (h1 + b) >>> 0;
            h2 = (h2 + c) >>> 0;
            h3 = (h3 + d) >>> 0;
            h4 = (h4 + e) >>> 0;
        }

        const result = [];
        [h0, h1, h2, h3, h4].forEach(word => {
            result.push(word >>> 24, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff);
        });
        return result;
    }

    function rotateLeft(value, count) {
        return ((value << count) | (value >>> (32 - count))) >>> 0;
    }

    root.TwineExporter = TwineExporter;
    root.TwineExportError = TwineExportError;
    root.storyFormat = format => TwineExporter.registerStoryFormat(format);

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { TwineExporter, TwineExportError };
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);

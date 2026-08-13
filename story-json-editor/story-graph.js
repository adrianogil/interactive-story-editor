// story-graph.js - Dependency-free SVG visualization for story passages

class StoryGraph {
    constructor(elements, storyEngine) {
        this.elements = elements;
        this.storyEngine = storyEngine;
        this.svgNamespace = 'http://www.w3.org/2000/svg';
        this.nodeWidth = 180;
        this.nodeHeight = 64;
        this.columnGap = 120;
        this.rowGap = 70;
        this.padding = 50;
        this.nodeElements = new Map();
        this.visitedPassages = new Set();
        this.currentPassageName = null;
        this.viewportGroup = null;
        this.transform = { x: 0, y: 0, scale: 1 };
        this.dragState = null;

        this.setupControls();
    }

    setupControls() {
        this.elements.zoomInButton.addEventListener('click', () => this.zoomBy(1.2));
        this.elements.zoomOutButton.addEventListener('click', () => this.zoomBy(1 / 1.2));
        this.elements.fitButton.addEventListener('click', () => this.fit());

        this.elements.svg.addEventListener('pointerdown', event => {
            if (event.target.closest('.story-graph-node')) return;

            this.dragState = {
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY
            };
            this.elements.svg.setPointerCapture(event.pointerId);
            this.elements.svg.classList.add('is-panning');
        });

        this.elements.svg.addEventListener('pointermove', event => {
            if (!this.dragState || this.dragState.pointerId !== event.pointerId) return;

            const rect = this.elements.svg.getBoundingClientRect();
            const viewBox = this.elements.svg.viewBox.baseVal;
            const svgUnitsPerPixel = viewBox.width / rect.width;
            const deltaX = (event.clientX - this.dragState.x) * svgUnitsPerPixel;
            const deltaY = (event.clientY - this.dragState.y) * svgUnitsPerPixel;

            this.transform.x += deltaX;
            this.transform.y += deltaY;
            this.dragState.x = event.clientX;
            this.dragState.y = event.clientY;
            this.updateTransform();
        });

        const endDrag = event => {
            if (!this.dragState || this.dragState.pointerId !== event.pointerId) return;
            this.dragState = null;
            this.elements.svg.classList.remove('is-panning');
        };

        this.elements.svg.addEventListener('pointerup', endDrag);
        this.elements.svg.addEventListener('pointercancel', endDrag);
    }

    render(storyData) {
        const graph = this.buildGraph(storyData);
        const layout = this.layoutGraph(graph);

        this.nodeElements.clear();
        this.visitedPassages.clear();
        this.currentPassageName = null;
        this.elements.svg.replaceChildren();
        this.elements.svg.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);

        this.addArrowMarker();
        this.viewportGroup = this.createSvgElement('g', { class: 'story-graph-canvas' });
        const edgeLayer = this.createSvgElement('g', { class: 'story-graph-edges' });
        const nodeLayer = this.createSvgElement('g', { class: 'story-graph-nodes' });

        graph.edges.forEach(edge => {
            const source = layout.positions.get(edge.source);
            const target = layout.positions.get(edge.target);
            if (source && target) edgeLayer.appendChild(this.createEdge(edge, source, target));
        });

        graph.nodes.forEach(node => {
            const position = layout.positions.get(node.id);
            if (position) nodeLayer.appendChild(this.createNode(node, position));
        });

        this.viewportGroup.append(edgeLayer, nodeLayer);
        this.elements.svg.appendChild(this.viewportGroup);
        this.fit();
        this.updateStatus(graph);
    }

    buildGraph(storyData) {
        const passageNodes = new Map();
        const duplicateNames = new Set();
        const edges = [];
        const brokenTargets = new Set();

        storyData.passages.forEach(passage => {
            if (passageNodes.has(passage.name)) {
                duplicateNames.add(passage.name);
                return;
            }

            passageNodes.set(passage.name, {
                id: passage.name,
                passage,
                broken: false,
                unreachable: false
            });
        });

        storyData.passages.forEach(passage => {
            if (!passageNodes.has(passage.name) || !Array.isArray(passage.content)) return;

            passage.content.forEach(item => {
                if (!item || typeof item !== 'object' || !item.choices) return;

                Object.entries(item.choices).forEach(([label, target]) => {
                    if (typeof target !== 'string') return;
                    edges.push({ source: passage.name, target, label });
                    if (!passageNodes.has(target)) brokenTargets.add(target);
                });
            });
        });

        brokenTargets.forEach(target => {
            passageNodes.set(target, {
                id: target,
                passage: null,
                broken: true,
                unreachable: false
            });
        });

        const startName = (
            typeof storyData.start_passage === 'string' &&
            passageNodes.has(storyData.start_passage)
        )
            ? storyData.start_passage
            : (passageNodes.has('Start') ? 'Start' : storyData.passages[0].name);
        const reachable = this.findReachablePassages(startName, edges, passageNodes);

        passageNodes.forEach(node => {
            node.unreachable = !node.broken && !reachable.has(node.id);
        });

        return {
            nodes: Array.from(passageNodes.values()),
            edges,
            startName,
            duplicateNames,
            brokenTargets
        };
    }

    findReachablePassages(startName, edges, nodes) {
        const reachable = new Set();
        const queue = [startName];
        const outgoing = new Map();

        edges.forEach(edge => {
            if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
            outgoing.get(edge.source).push(edge.target);
        });

        while (queue.length > 0) {
            const passageName = queue.shift();
            if (reachable.has(passageName) || !nodes.has(passageName)) continue;

            reachable.add(passageName);
            (outgoing.get(passageName) || []).forEach(target => {
                const targetNode = nodes.get(target);
                if (targetNode && !targetNode.broken && !reachable.has(target)) {
                    queue.push(target);
                }
            });
        }

        return reachable;
    }

    layoutGraph(graph) {
        const depths = new Map([[graph.startName, 0]]);
        const queue = [graph.startName];
        const outgoing = new Map();

        graph.edges.forEach(edge => {
            if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
            outgoing.get(edge.source).push(edge.target);
        });

        while (queue.length > 0) {
            const source = queue.shift();
            const sourceDepth = depths.get(source);

            (outgoing.get(source) || []).forEach(target => {
                const targetNode = graph.nodes.find(node => node.id === target);
                if (!targetNode || targetNode.broken || depths.has(target)) return;
                depths.set(target, sourceDepth + 1);
                queue.push(target);
            });
        }

        const reachableDepths = Array.from(depths.values());
        const lastReachableDepth = reachableDepths.length > 0
            ? Math.max(...reachableDepths)
            : 0;
        const brokenDepth = lastReachableDepth + 1;
        const unreachableDepth = brokenDepth + (graph.brokenTargets.size > 0 ? 1 : 0);

        graph.nodes.forEach(node => {
            if (node.broken) depths.set(node.id, brokenDepth);
            else if (node.unreachable) depths.set(node.id, unreachableDepth);
        });

        const columns = new Map();
        graph.nodes.forEach(node => {
            const depth = depths.get(node.id) || 0;
            if (!columns.has(depth)) columns.set(depth, []);
            columns.get(depth).push(node);
        });

        const positions = new Map();
        let maxRows = 1;

        Array.from(columns.entries())
            .sort(([depthA], [depthB]) => depthA - depthB)
            .forEach(([depth, nodes]) => {
                maxRows = Math.max(maxRows, nodes.length);
                nodes.sort((nodeA, nodeB) => nodeA.id.localeCompare(nodeB.id));
                nodes.forEach((node, row) => {
                    positions.set(node.id, {
                        x: this.padding + depth * (this.nodeWidth + this.columnGap),
                        y: this.padding + row * (this.nodeHeight + this.rowGap)
                    });
                });
            });

        const maxDepth = Math.max(...Array.from(columns.keys()), 0);
        return {
            positions,
            width: this.padding * 2 + this.nodeWidth + maxDepth * (this.nodeWidth + this.columnGap),
            height: this.padding * 2 + this.nodeHeight + (maxRows - 1) * (this.nodeHeight + this.rowGap)
        };
    }

    createEdge(edge, source, target) {
        const group = this.createSvgElement('g', { class: 'story-graph-edge' });
        const startX = source.x + this.nodeWidth;
        const startY = source.y + this.nodeHeight / 2;
        const endX = target.x;
        const endY = target.y + this.nodeHeight / 2;
        const direction = endX >= startX ? 1 : -1;
        const curve = Math.max(70, Math.abs(endX - startX) * 0.45);
        const pathData = [
            `M ${startX} ${startY}`,
            `C ${startX + curve * direction} ${startY},`,
            `${endX - curve * direction} ${endY},`,
            `${endX} ${endY}`
        ].join(' ');
        const path = this.createSvgElement('path', {
            d: pathData,
            'marker-end': 'url(#story-graph-arrow)'
        });
        const title = this.createSvgElement('title');
        title.textContent = `${edge.label}: ${edge.source} → ${edge.target}`;
        path.appendChild(title);

        const label = this.createSvgElement('text', {
            x: (startX + endX) / 2,
            y: (startY + endY) / 2 - 8,
            class: 'story-graph-edge-label',
            'text-anchor': 'middle'
        });
        label.textContent = this.truncate(edge.label, 24);
        group.append(path, label);
        return group;
    }

    createNode(node, position) {
        const classes = ['story-graph-node'];
        if (node.id === this.storyEngine.getStartPassageName()) classes.push('is-start');
        if (node.unreachable) classes.push('is-unreachable');
        if (node.broken) classes.push('is-broken');

        const group = this.createSvgElement('g', {
            class: classes.join(' '),
            transform: `translate(${position.x} ${position.y})`,
            'data-passage-name': node.id
        });
        const title = this.createSvgElement('title');
        title.textContent = node.broken
            ? `Missing passage: ${node.id}`
            : `Navigate to ${node.id}`;
        const rectangle = this.createSvgElement('rect', {
            width: this.nodeWidth,
            height: this.nodeHeight,
            rx: 10
        });
        const text = this.createSvgElement('text', {
            x: this.nodeWidth / 2,
            y: node.broken || node.unreachable ? 25 : 35,
            'text-anchor': 'middle',
            class: 'story-graph-node-label'
        });
        text.textContent = this.truncate(node.id, 24);

        group.append(title, rectangle, text);

        if (node.broken || node.unreachable) {
            const status = this.createSvgElement('text', {
                x: this.nodeWidth / 2,
                y: 46,
                'text-anchor': 'middle',
                class: 'story-graph-node-status'
            });
            status.textContent = node.broken ? 'Missing passage' : 'Unreachable';
            group.appendChild(status);
        }

        if (!node.broken) {
            group.setAttribute('role', 'button');
            group.setAttribute('tabindex', '0');
            group.setAttribute('aria-label', `Navigate to passage ${node.id}`);
            group.addEventListener('click', () => this.storyEngine.navigateToPassage(node.id));
            group.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.storyEngine.navigateToPassage(node.id);
                }
            });
        }

        this.nodeElements.set(node.id, group);
        return group;
    }

    setCurrentPassage(passageName) {
        if (this.currentPassageName && this.nodeElements.has(this.currentPassageName)) {
            this.nodeElements.get(this.currentPassageName).classList.remove('is-current');
        }

        this.currentPassageName = passageName;
        this.visitedPassages.add(passageName);

        this.nodeElements.forEach((element, name) => {
            element.classList.toggle('is-visited', this.visitedPassages.has(name));
        });

        if (this.nodeElements.has(passageName)) {
            this.nodeElements.get(passageName).classList.add('is-current');
        }
    }

    updateStatus(graph) {
        const diagnostics = [];
        if (graph.brokenTargets.size > 0) {
            diagnostics.push(`${graph.brokenTargets.size} broken link target(s)`);
        }

        const unreachableCount = graph.nodes.filter(node => node.unreachable).length;
        if (unreachableCount > 0) diagnostics.push(`${unreachableCount} unreachable passage(s)`);
        if (graph.duplicateNames.size > 0) {
            diagnostics.push(`${graph.duplicateNames.size} duplicate passage name(s)`);
        }

        const summary = `${graph.nodes.filter(node => !node.broken).length} passages · ${graph.edges.length} branches`;
        this.elements.status.textContent = diagnostics.length > 0
            ? `${summary} · ${diagnostics.join(' · ')}`
            : `${summary} · No structural issues found`;
    }

    addArrowMarker() {
        const definitions = this.createSvgElement('defs');
        const marker = this.createSvgElement('marker', {
            id: 'story-graph-arrow',
            viewBox: '0 0 10 10',
            refX: 9,
            refY: 5,
            markerWidth: 7,
            markerHeight: 7,
            orient: 'auto-start-reverse'
        });
        const path = this.createSvgElement('path', {
            d: 'M 0 0 L 10 5 L 0 10 z'
        });
        marker.appendChild(path);
        definitions.appendChild(marker);
        this.elements.svg.appendChild(definitions);
    }

    zoomBy(factor) {
        this.transform.scale = Math.min(3, Math.max(0.45, this.transform.scale * factor));
        this.updateTransform();
    }

    fit() {
        this.transform = { x: 0, y: 0, scale: 1 };
        this.updateTransform();
    }

    updateTransform() {
        if (!this.viewportGroup) return;
        const { x, y, scale } = this.transform;
        this.viewportGroup.setAttribute('transform', `translate(${x} ${y}) scale(${scale})`);
    }

    createSvgElement(tagName, attributes = {}) {
        const element = document.createElementNS(this.svgNamespace, tagName);
        Object.entries(attributes).forEach(([name, value]) => {
            element.setAttribute(name, value);
        });
        return element;
    }

    truncate(value, maxLength) {
        return value.length > maxLength
            ? `${value.slice(0, maxLength - 1)}…`
            : value;
    }
}

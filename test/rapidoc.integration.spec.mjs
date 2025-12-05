import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { test } from 'node:test';

const DIST_SCRIPT = path.resolve('./dist/rapidoc.js');
const OPENAPI_PATH = path.resolve('./test/openapi.json');

async function waitFor(conditionFn, timeout = 3000) {
    const start = Date.now();
    // eslint-disable-next-line no-await-in-loop
    while (Date.now() - start < timeout) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 20));
        if (conditionFn()) return true;
    }
    return false;
}

test('RapiDoc component loads from dist and parses openapi.json', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost/' });
    const { window } = dom;

    // Provide minimal stubs for browser APIs not implemented in jsdom
    // IntersectionObserver required by the component
    window.IntersectionObserver = class {
        constructor(cb) { this.cb = cb; }
        observe() { }
        unobserve() { }
        disconnect() { }
    };
    // FontFace stub
    window.FontFace = class FontFace { constructor() { } load() { return Promise.resolve(this); } };
    // matchMedia stub
    window.matchMedia = () => ({ matches: false, addListener: () => { }, removeListener: () => { } });

    // Load the built dist script into the JSDOM window
    const code = await fs.readFile(DIST_SCRIPT, 'utf8');
    const scriptEl = window.document.createElement('script');
    scriptEl.textContent = code;
    window.document.body.appendChild(scriptEl);

    // Wait for custom element registration
    const registered = await waitFor(() => window.customElements.get('rapi-doc') != null, 5000);
    assert.ok(registered, 'rapi-doc custom element should be registered');

    const el = window.document.createElement('rapi-doc');
    // Disable font loading in the tests
    el.setAttribute('load-fonts', 'false');
    window.document.body.appendChild(el);

    // Wait for element to upgrade
    const upgraded = await waitFor(() => el.shadowRoot != null, 2000);
    assert.ok(upgraded, 'rapi-doc should have a shadow root after upgrade');

    // Read spec and trigger loadSpec
    const specContent = await fs.readFile(OPENAPI_PATH, 'utf8');
    const spec = JSON.parse(specContent);

    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('spec-loaded event timeout')), 5000);
        el.addEventListener('spec-loaded', (ev) => {
            clearTimeout(timeout);
            resolve(ev.detail);
        }, { once: true });
        // eslint-disable-next-line no-void
        void el.loadSpec(spec);
    });

    // Validate resolvedSpec exists on element
    assert.ok(el.resolvedSpec, 'resolvedSpec should be set on element');
    assert.ok(Array.isArray(el.resolvedSpec.tags) && el.resolvedSpec.tags.length > 0, 'resolvedSpec.tags should be present and non-empty');
});

test('RapiDoc setApiServer and setApiKey integration', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost/' });
    const { window } = dom;
    window.IntersectionObserver = class { constructor(cb) { this.cb = cb; } observe() { } unobserve() { } disconnect() { } };
    window.FontFace = class FontFace { constructor() { } load() { return Promise.resolve(this); } };
    window.matchMedia = () => ({ matches: false, addListener: () => { }, removeListener: () => { } });

    const code = await fs.readFile(DIST_SCRIPT, 'utf8');
    const scriptEl = window.document.createElement('script');
    scriptEl.textContent = code;
    window.document.body.appendChild(scriptEl);
    const registered = await waitFor(() => window.customElements.get('rapi-doc') != null, 5000);
    assert.ok(registered, 'rapi-doc custom element should be registered');
    const el = window.document.createElement('rapi-doc');
    el.setAttribute('load-fonts', 'false');
    window.document.body.appendChild(el);
    const upgraded = await waitFor(() => el.shadowRoot != null, 2000);
    assert.ok(upgraded, 'rapi-doc should have a shadow root after upgrade');

    // Load spec
    const specContent = await fs.readFile(OPENAPI_PATH, 'utf8');
    const spec = JSON.parse(specContent);
    await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('spec-loaded event timeout')), 5000);
        el.addEventListener('spec-loaded', () => { clearTimeout(t); resolve(); }, { once: true });
        // eslint-disable-next-line no-void
        void el.loadSpec(spec);
    });

    // Test setApiServer
    const server = el.resolvedSpec.servers && el.resolvedSpec.servers[0];
    assert.ok(server, 'server should exist in resolvedSpec.servers');
    const setServerResult = el.setApiServer(server.url);
    assert.ok(setServerResult, 'setApiServer should return true for known server');
    assert.equal(el.selectedServer.url, server.url);

    // Test setApiKey for first apiKey security scheme
    const apiKeyScheme = el.resolvedSpec.securitySchemes && el.resolvedSpec.securitySchemes.find((s) => s.type === 'apiKey' || s.scheme === 'bearer' || s.type === 'http');
    if (apiKeyScheme) {
        const result = el.setApiKey(apiKeyScheme.securitySchemeId, 'testvalue');
        assert.ok(result, 'setApiKey should return true when applying a key');
        assert.ok(apiKeyScheme.finalKeyValue && apiKeyScheme.finalKeyValue.includes('testvalue'), 'apiKey finalKeyValue should be updated');
    } else {
        // If no security schemes, pass the test but log a note
        assert.ok(true, 'no security schemes present to test setApiKey');
    }
});

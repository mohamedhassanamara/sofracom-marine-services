// Every UI string must exist in English, French and Arabic, and placeholders like
// {count} must match across languages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'i18n');

const load = lang => {
    const source = readFileSync(path.join(dir, `${lang}.js`), 'utf-8');
    const literal = source.slice(source.indexOf('{'), source.lastIndexOf('};') + 1);
    return new Function(`return (${literal});`)();
};

const dictionaries = Object.fromEntries(['en', 'fr', 'ar'].map(lang => [lang, load(lang)]));
const placeholders = text => [...String(text).matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();

for (const lang of ['fr', 'ar']) {
    test(`${lang} has exactly the English keys`, () => {
        const english = Object.keys(dictionaries.en).sort();
        const other = Object.keys(dictionaries[lang]).sort();
        assert.deepEqual(
            english.filter(key => !other.includes(key)),
            [],
            `missing in ${lang}`
        );
        assert.deepEqual(
            other.filter(key => !english.includes(key)),
            [],
            `extra in ${lang}`
        );
    });

    test(`${lang} keeps every placeholder`, () => {
        for (const [key, value] of Object.entries(dictionaries.en)) {
            assert.deepEqual(placeholders(dictionaries[lang][key]), placeholders(value), key);
        }
    });
}

test('no empty strings', () => {
    for (const [lang, dict] of Object.entries(dictionaries)) {
        for (const [key, value] of Object.entries(dict)) {
            assert.ok(String(value).trim(), `${lang}:${key} is empty`);
        }
    }
});

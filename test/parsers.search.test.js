"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const searchParser_1 = require("../src/parsers/searchParser");
describe('parseSearchResults', () => {
    it('parses items with asin, title, and detailUrl', () => {
        const html = fs_1.default.readFileSync(path_1.default.join(__dirname, 'fixtures', 'search.html'), 'utf-8');
        const items = (0, searchParser_1.parseSearchResults)(html, 'https://www.audible.fr');
        expect(items.length).toBeGreaterThan(0);
        expect(items[0].asin).toBe('B012345678');
        expect(items[0].title).toBe('Some Title');
        expect(items[0].detailUrl).toContain('https://www.audible.fr/pd/Some-Title/B012345678');
    });
});

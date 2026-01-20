"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const detailsParser_1 = require("../src/parsers/detailsParser");
describe('parseBookDetails', () => {
    it('parses title and authors from fixtures', () => {
        const html = fs_1.default.readFileSync(path_1.default.join(__dirname, 'fixtures', 'details.html'), 'utf-8');
        const details = (0, detailsParser_1.parseBookDetails)('B012345678', html);
        expect(details.title).toBe('Detail Title');
        expect(details.authors).toContain('Author One');
    });
});

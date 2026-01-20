"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const supertest_1 = __importDefault(require("supertest"));
const undici_1 = require("undici");
const searchHtml = fs_1.default.readFileSync(path_1.default.join(__dirname, 'fixtures', 'search.html'), 'utf-8');
const detailsHtml = fs_1.default.readFileSync(path_1.default.join(__dirname, 'fixtures', 'details.html'), 'utf-8');
const originalDispatcher = (0, undici_1.getGlobalDispatcher)();
async function loadApp() {
    jest.resetModules();
    const module = await Promise.resolve().then(() => __importStar(require('../src/app')));
    return module.app;
}
function setupMockAgent() {
    const mockAgent = new undici_1.MockAgent();
    mockAgent.disableNetConnect();
    (0, undici_1.setGlobalDispatcher)(mockAgent);
    return mockAgent;
}
describe('routes', () => {
    beforeEach(() => {
        process.env.NODE_ENV = 'test';
        process.env.AUDIBLE_BASE_URL = 'https://audible.test';
        process.env.AUDIBLE_SEARCH_PATH = '/search';
        process.env.AUDIBLE_DETAILS_URL_MODE = 'guess';
        process.env.API_RATE_LIMIT_ENABLED = 'false';
    });
    afterEach(() => {
        (0, undici_1.setGlobalDispatcher)(originalDispatcher);
    });
    it('GET /health responds ok', async () => {
        const app = await loadApp();
        await (0, supertest_1.default)(app).get('/health').expect(200, { status: 'ok' });
    });
    it('GET /search returns items', async () => {
        const mockAgent = setupMockAgent();
        const client = mockAgent.get('https://audible.test');
        client
            .intercept({
            path: '/search?keywords=harry%20potter&page=1',
            method: 'GET',
        })
            .reply(200, searchHtml, { headers: { 'content-type': 'text/html' } });
        const app = await loadApp();
        const response = await (0, supertest_1.default)(app).get('/search?keywords=harry%20potter').expect(200);
        expect(response.body.items.length).toBeGreaterThan(0);
        expect(response.body.items[0].asin).toBe('B012345678');
    });
    it('GET /details returns details', async () => {
        const mockAgent = setupMockAgent();
        const client = mockAgent.get('https://audible.test');
        client
            .intercept({
            path: '/pd/B012345678',
            method: 'GET',
        })
            .reply(200, detailsHtml, { headers: { 'content-type': 'text/html' } });
        const app = await loadApp();
        const response = await (0, supertest_1.default)(app).get('/details/B012345678').expect(200);
        expect(response.body.title).toBe('Detail Title');
        expect(response.body.asin).toBe('B012345678');
    });
});

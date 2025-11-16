"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCHInline = parseCHInline;
exports.resolveCH = resolveCH;
var RE_CH_CHANNEL = /\{CH:#:([A-Za-z0-9_\-:.]+):([A-Za-z0-9_\-:.]+)(?:;(Name|PFP|Link|Card))?\}/g;
var RE_CH_GENERAL = /\{CH:(S|H|M|DM):([A-Za-z0-9_\-:.]+)(?:;(Name|PFP|Link|Card))?\}/g;
function parseCHInline(text, base) {
    if (base === void 0) { base = 0; }
    var nodes = [];
    var cursor = 0;
    var pushText = function (to) {
        if (to > cursor)
            nodes.push({ type: 'text', text: text.slice(cursor, to) });
    };
    // Pass 1: channel tokens
    text.replace(RE_CH_CHANNEL, function (m, havenId, channelId, opt, idx) {
        var _a;
        var i = Number(idx);
        pushText(i);
        nodes.push({
            type: 'token',
            service: 'CH',
            fetch: '#',
            id: null,
            option: (_a = opt) !== null && _a !== void 0 ? _a : 'Name',
            channel: { havenId: havenId, channelId: channelId },
            range: { start: base + i, end: base + i + m.length }
        });
        cursor = i + m.length;
        return m;
    });
    // Pass 2: S/H/M/DM tokens on the remaining text
    var rest = text.slice(cursor);
    rest.replace(RE_CH_GENERAL, function (m, fetch, id, opt, idx) {
        var _a;
        var i = cursor + Number(idx);
        pushText(i);
        nodes.push({
            type: 'token',
            service: 'CH',
            fetch: fetch,
            id: id,
            option: (_a = opt) !== null && _a !== void 0 ? _a : 'Name',
            range: { start: base + i, end: base + i + m.length }
        });
        cursor = i + m.length;
        return m;
    });
    pushText(text.length);
    return nodes;
}
// Simple client-side resolver using existing HTTP APIs.
// This is intentionally minimal; callers can layer richer UI on top.
function resolveCH(token) {
    return __awaiter(this, void 0, void 0, function () {
        var opt, _a, havenId, channelId_1, res, data, ch, havenId, res, data, name_1, id, res, data, msg, id_1, res, data, dm, title, e_1;
        var _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    opt = (_b = token.option) !== null && _b !== void 0 ? _b : 'Name';
                    _g.label = 1;
                case 1:
                    _g.trys.push([1, 14, , 15]);
                    if (!(token.fetch === '#')) return [3 /*break*/, 4];
                    _a = token.channel, havenId = _a.havenId, channelId_1 = _a.channelId;
                    return [4 /*yield*/, fetch("/api/channels-api?haven=".concat(encodeURIComponent(havenId)))];
                case 2:
                    res = _g.sent();
                    return [4 /*yield*/, res.json().catch(function () { return null; })];
                case 3:
                    data = _g.sent();
                    ch = Array.isArray(data === null || data === void 0 ? void 0 : data.channels)
                        ? data.channels.find(function (c) { return c.id === channelId_1 || c.name === channelId_1; })
                        : null;
                    if (!ch)
                        return [2 /*return*/, { kind: 'text', source: token, text: '[Unknown channel]' }];
                    if (opt === 'PFP') {
                        return [2 /*return*/, { kind: 'url', source: token, url: ch.iconUrl || '', mediaType: 'image' }];
                    }
                    if (opt === 'Link') {
                        return [2 /*return*/, { kind: 'url', source: token, url: ch.url || '', mediaType: 'page' }];
                    }
                    if (opt === 'Card') {
                        return [2 /*return*/, {
                                kind: 'card',
                                source: token,
                                title: ch.name || '[Unknown channel]',
                                subtitle: havenId,
                                imageUrl: ch.iconUrl || undefined,
                                linkUrl: ch.url || undefined,
                                meta: { channelId: channelId_1, havenId: havenId }
                            }];
                    }
                    return [2 /*return*/, { kind: 'text', source: token, text: ch.name || '[Unknown channel]' }];
                case 4:
                    if (!(token.fetch === 'S' || token.fetch === 'H')) return [3 /*break*/, 7];
                    havenId = token.id || '';
                    return [4 /*yield*/, fetch("/api/server-settings?haven=".concat(encodeURIComponent(havenId)))];
                case 5:
                    res = _g.sent();
                    return [4 /*yield*/, res.json().catch(function () { return null; })];
                case 6:
                    data = _g.sent();
                    if (!data)
                        return [2 /*return*/, { kind: 'text', source: token, text: '[Unknown haven]' }];
                    name_1 = data.name || havenId || '[Unknown haven]';
                    if (opt === 'PFP') {
                        return [2 /*return*/, { kind: 'url', source: token, url: data.icon || '', mediaType: 'image' }];
                    }
                    if (opt === 'Link') {
                        return [2 /*return*/, { kind: 'url', source: token, url: data.url || '', mediaType: 'page' }];
                    }
                    if (opt === 'Card') {
                        return [2 /*return*/, {
                                kind: 'card',
                                source: token,
                                title: name_1,
                                subtitle: data.description || undefined,
                                imageUrl: data.icon || undefined,
                                linkUrl: data.url || undefined,
                                meta: { havenId: havenId }
                            }];
                    }
                    return [2 /*return*/, { kind: 'text', source: token, text: name_1 }];
                case 7:
                    if (!(token.fetch === 'M')) return [3 /*break*/, 10];
                    id = token.id || '';
                    return [4 /*yield*/, fetch("/api/history?messageId=".concat(encodeURIComponent(id)))];
                case 8:
                    res = _g.sent();
                    return [4 /*yield*/, res.json().catch(function () { return null; })];
                case 9:
                    data = _g.sent();
                    msg = data === null || data === void 0 ? void 0 : data.message;
                    if (!msg)
                        return [2 /*return*/, { kind: 'text', source: token, text: '[Unknown message]' }];
                    if (opt === 'Link') {
                        return [2 /*return*/, { kind: 'url', source: token, url: msg.url || '', mediaType: 'page' }];
                    }
                    if (opt === 'Card') {
                        return [2 /*return*/, {
                                kind: 'card',
                                source: token,
                                title: msg.authorName || msg.user || '[Unknown]',
                                subtitle: msg.preview || ((_c = msg.text) === null || _c === void 0 ? void 0 : _c.slice(0, 80)) || undefined,
                                linkUrl: msg.url || undefined,
                                meta: { messageId: id }
                            }];
                    }
                    return [2 /*return*/, { kind: 'text', source: token, text: msg.preview || ((_d = msg.text) === null || _d === void 0 ? void 0 : _d.slice(0, 80)) || '[Message]' }];
                case 10:
                    if (!(token.fetch === 'DM')) return [3 /*break*/, 13];
                    id_1 = token.id || '';
                    return [4 /*yield*/, fetch('/api/dms')];
                case 11:
                    res = _g.sent();
                    return [4 /*yield*/, res.json().catch(function () { return null; })];
                case 12:
                    data = _g.sent();
                    dm = Array.isArray(data === null || data === void 0 ? void 0 : data.dms) ? data.dms.find(function (d) { return d.id === id_1; }) : null;
                    if (!dm)
                        return [2 /*return*/, { kind: 'text', source: token, text: '[Unknown DM]' }];
                    title = dm.title || (dm.users ? dm.users.join(', ') : '[Direct Message]');
                    if (opt === 'PFP') {
                        return [2 /*return*/, { kind: 'url', source: token, url: dm.iconUrl || '', mediaType: 'image' }];
                    }
                    if (opt === 'Link') {
                        return [2 /*return*/, { kind: 'url', source: token, url: dm.url || '', mediaType: 'page' }];
                    }
                    if (opt === 'Card') {
                        return [2 /*return*/, {
                                kind: 'card',
                                source: token,
                                title: title,
                                subtitle: ((_e = dm.users) === null || _e === void 0 ? void 0 : _e.join(', ')) || undefined,
                                imageUrl: dm.iconUrl || undefined,
                                linkUrl: dm.url || undefined,
                                meta: { dmId: id_1 }
                            }];
                    }
                    return [2 /*return*/, { kind: 'text', source: token, text: title }];
                case 13: return [2 /*return*/, { kind: 'error', source: token, code: 'InvalidFetch', message: "Unsupported fetch: ".concat(token.fetch) }];
                case 14:
                    e_1 = _g.sent();
                    return [2 /*return*/, { kind: 'error', source: token, code: 'Network', message: String((_f = e_1 === null || e_1 === void 0 ? void 0 : e_1.message) !== null && _f !== void 0 ? _f : e_1) }];
                case 15: return [2 /*return*/];
            }
        });
    });
}

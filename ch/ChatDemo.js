"use client";
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ChatDemo;
var react_1 = require("react");
var socket_io_client_1 = require("socket.io-client");
var react_markdown_1 = require("react-markdown");
var react_fontawesome_1 = require("@fortawesome/react-fontawesome");
var free_solid_svg_icons_1 = require("@fortawesome/free-solid-svg-icons");
var ServerSettingsModal_1 = require("./ServerSettingsModal");
var UserSettingsModal_1 = require("./UserSettingsModal");
var ProfileModal_1 = require("./ProfileModal");
var emojiData_1 = require("./emojiData");
var chTokens_1 = require("./chTokens");
var SOUND_DIALING = "/sounds/Dialing.wav";
var SOUND_RINGTONE = "/sounds/ChitterSync ChitterHaven Ringtone 1.wav";
var SOUND_PING = "/sounds/Ping.wav";
var getExt = function (name) { var _a; return ((_a = (name || "").split(".").pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || ""; };
var isImage = function (t, n) { return (t || "").startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(getExt(n)); };
var isVideo = function (t, n) { return (t || "").startsWith("video/") || ["mp4", "mov", "webm", "ogg"].includes(getExt(n)); };
var isAudio = function (t, n) { return (t || "").startsWith("audio/") || ["mp3", "wav", "ogg", "m4a"].includes(getExt(n)); };
// Simple, deterministic invite code for a haven (local-only)
var havenCode = function (name) {
    var base = name.trim() || "haven";
    var hash = 0;
    for (var i = 0; i < base.length; i++) {
        hash = ((hash << 5) - hash + base.charCodeAt(i)) | 0;
    }
    var code = Math.abs(hash).toString(36).toUpperCase();
    return "CH-".concat(code.slice(0, 6));
};
function AttachmentViewer(_a) {
    var a = _a.a;
    if (isImage(a.type, a.name))
        return (<div style={{ border: '1px solid #1f2937', borderRadius: 8, padding: 6, background: '#0b1222' }}>
      <a href={a.url} target="_blank" rel="noreferrer">
        <img src={a.url} alt={a.name} style={{ maxWidth: 360, borderRadius: 6 }}/>
      </a>
    </div>);
    if (isVideo(a.type, a.name))
        return (<div style={{ border: '1px solid #1f2937', borderRadius: 8, padding: 6, background: '#0b1222' }}>
      <video src={a.url} controls style={{ maxWidth: 420, borderRadius: 6 }}/>
    </div>);
    if (isAudio(a.type, a.name))
        return (<div style={{ border: '1px solid #1f2937', borderRadius: 8, padding: 6, background: '#0b1222' }}>
      <audio src={a.url} controls/>
    </div>);
    return (<div style={{ border: '1px solid #1f2937', borderRadius: 8, padding: 6, background: '#0b1222' }}>
      <a href={a.url} target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>{a.name}</a>
    </div>);
}
function ChatDemo(_a) {
    var _b;
    var _this = this;
    var username = _a.username;
    var _c = (0, react_1.useState)(false), showServerSettings = _c[0], setShowServerSettings = _c[1];
    // Havens: { [havenName]: string[] (channels) }
    var _d = (0, react_1.useState)(function () {
        if (typeof window !== "undefined") {
            var saved = localStorage.getItem("havens");
            if (saved)
                return JSON.parse(saved);
        }
        return { "ChitterHaven": ["general", "random"] };
    }), havens = _d[0], setHavens = _d[1];
    var _e = (0, react_1.useState)("ChitterHaven"), selectedHaven = _e[0], setSelectedHaven = _e[1];
    var _f = (0, react_1.useState)("general"), selectedChannel = _f[0], setSelectedChannel = _f[1];
    var _g = (0, react_1.useState)([]), dms = _g[0], setDMs = _g[1];
    var _h = (0, react_1.useState)(null), selectedDM = _h[0], setSelectedDM = _h[1];
    var _j = (0, react_1.useState)([]), messages = _j[0], setMessages = _j[1];
    var _k = (0, react_1.useState)(""), input = _k[0], setInput = _k[1];
    var _l = (0, react_1.useState)(""), newChannel = _l[0], setNewChannel = _l[1];
    var _m = (0, react_1.useState)('text'), newChannelType = _m[0], setNewChannelType = _m[1];
    var _o = (0, react_1.useState)(""), newHaven = _o[0], setNewHaven = _o[1];
    var _p = (0, react_1.useState)('standard'), newHavenType = _p[0], setNewHavenType = _p[1];
    var _q = (0, react_1.useState)('join'), havenAction = _q[0], setHavenAction = _q[1];
    var _r = (0, react_1.useState)([]), typingUsers = _r[0], setTypingUsers = _r[1];
    var messagesEndRef = (0, react_1.useRef)(null);
    var socketRef = (0, react_1.useRef)(null);
    var messageRefs = (0, react_1.useRef)({});
    var inputRef = (0, react_1.useRef)(null);
    var fileInputRef = (0, react_1.useRef)(null);
    var chatScrollRef = (0, react_1.useRef)(null);
    var _s = (0, react_1.useState)([]), pendingFiles = _s[0], setPendingFiles = _s[1];
    var _t = (0, react_1.useState)(false), uploading = _t[0], setUploading = _t[1];
    var _u = (0, react_1.useState)([]), uploadItems = _u[0], setUploadItems = _u[1];
    var _v = (0, react_1.useState)({}), presenceMap = _v[0], setPresenceMap = _v[1];
    var _w = (0, react_1.useState)(null), profileUser = _w[0], setProfileUser = _w[1];
    var _x = (0, react_1.useState)(undefined), profileContext = _x[0], setProfileContext = _x[1];
    var statusColor = function (s) { return (s === "online" ? "#22c55e" : s === "idle" ? "#f59e0b" : s === "dnd" ? "#ef4444" : "#6b7280"); };
    var _y = (0, react_1.useState)(false), showPinned = _y[0], setShowPinned = _y[1];
    var _z = (0, react_1.useState)(false), isMobile = _z[0], setIsMobile = _z[1];
    var _0 = (0, react_1.useState)(false), showMobileNav = _0[0], setShowMobileNav = _0[1];
    var _1 = (0, react_1.useState)(false), quickOpen = _1[0], setQuickOpen = _1[1];
    var _2 = (0, react_1.useState)(""), quickQuery = _2[0], setQuickQuery = _2[1];
    var _3 = (0, react_1.useState)(0), quickIndex = _3[0], setQuickIndex = _3[1];
    var _4 = (0, react_1.useState)(false), showMembers = _4[0], setShowMembers = _4[1];
    var _5 = (0, react_1.useState)([]), havenMembers = _5[0], setHavenMembers = _5[1];
    var _6 = (0, react_1.useState)(""), membersQuery = _6[0], setMembersQuery = _6[1];
    var _7 = (0, react_1.useState)(false), showUserSettings = _7[0], setShowUserSettings = _7[1];
    var _8 = (0, react_1.useState)([]), toasts = _8[0], setToasts = _8[1];
    var _9 = (0, react_1.useState)(1), onlineCount = _9[0], setOnlineCount = _9[1];
    var dialingAudioRef = (0, react_1.useRef)(null);
    var ringAudioRef = (0, react_1.useRef)(null);
    var notify = function (t) {
        var _a, _b, _c;
        var id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : "".concat(Date.now(), "-").concat(Math.random().toString(36).slice(2));
        var toast = __assign({ id: id }, t);
        setToasts(function (prev) { return __spreadArray(__spreadArray([], prev, true), [toast], false); });
        setTimeout(function () { return setToasts(function (prev) { return prev.filter(function (x) { return x.id !== id; }); }); }, 4000);
        try {
            if ((_a = userSettings === null || userSettings === void 0 ? void 0 : userSettings.notifications) === null || _a === void 0 ? void 0 : _a.soundEnabled) {
                var audio = new Audio(SOUND_PING);
                audio.volume = Math.max(0, Math.min(1, (_c = (_b = userSettings === null || userSettings === void 0 ? void 0 : userSettings.notifications) === null || _b === void 0 ? void 0 : _b.volume) !== null && _c !== void 0 ? _c : 0.6));
                audio.play().catch(function () { });
            }
        }
        catch (_d) { }
    };
    // --- DM voice call helpers ---
    var setupPeer = function () {
        if (pcRef.current)
            return pcRef.current;
        var pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pc.onicecandidate = function (ev) {
            if (ev.candidate && socketRef.current && selectedDM) {
                socketRef.current.emit('ice-candidate', { room: selectedDM, candidate: ev.candidate, from: username });
            }
        };
        pc.ontrack = function (ev) {
            var stream = ev.streams[0];
            remoteStreamRef.current = stream;
            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = stream;
            }
        };
        pcRef.current = pc;
        return pc;
    };
    var toggleMute = function () {
        var next = !isMuted;
        setIsMuted(next);
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(function (t) {
                t.enabled = !next;
            });
        }
    };
    var ringAgain = function () {
        var _a;
        if (!pcRef.current || !selectedDM)
            return;
        var desc = pcRef.current.localDescription;
        if (!desc)
            return;
        var dm = dms.find(function (d) { return d.id === selectedDM; });
        var targets = dm ? dm.users.filter(function (u) { return u !== username; }) : [];
        (_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.emit('call-offer', { room: selectedDM, offer: desc, from: username, targets: targets });
    };
    var endCall = function () {
        var endedRoom = activeCallDM;
        var startedAt = callStartedAt;
        setCallState('idle');
        setCallError(null);
        setIncomingCall(null);
        setActiveCallDM(null);
        setCallStartedAt(null);
        setCallInitiator(null);
        setCallSummarySent(false);
        setCallElapsed(0);
        if (dialingAudioRef.current) {
            try {
                dialingAudioRef.current.pause();
                dialingAudioRef.current.currentTime = 0;
            }
            catch (_a) { }
            dialingAudioRef.current = null;
        }
        if (ringAudioRef.current) {
            try {
                ringAudioRef.current.pause();
                ringAudioRef.current.currentTime = 0;
            }
            catch (_b) { }
            ringAudioRef.current = null;
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(function (t) { return t.stop(); });
            localStreamRef.current = null;
        }
        if (remoteStreamRef.current) {
            remoteStreamRef.current.getTracks().forEach(function (t) { return t.stop(); });
            remoteStreamRef.current = null;
        }
        // Record call summary in DM history if we have a duration, only once, by the initiator
        if (endedRoom && startedAt && !callSummarySent && callInitiator && callInitiator === username) {
            var durationSec_1 = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
            (function () { return __awaiter(_this, void 0, void 0, function () {
                var mins, secs, human, room, msg, res, data_1, _a;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 3, , 4]);
                            mins = Math.floor(durationSec_1 / 60);
                            secs = durationSec_1 % 60;
                            human = mins ? "".concat(mins, "m ").concat(secs.toString().padStart(2, '0'), "s") : "".concat(secs, "s");
                            room = endedRoom;
                            msg = { user: username, text: "Voice call ended \u2022 ".concat(human), systemType: 'call-summary' };
                            return [4 /*yield*/, fetch("/api/history", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ room: room, msg: msg })
                                })];
                        case 1:
                            res = _c.sent();
                            return [4 /*yield*/, res.json()];
                        case 2:
                            data_1 = _c.sent();
                            if (data_1.message) {
                                (_b = socketRef.current) === null || _b === void 0 ? void 0 : _b.emit("message", { room: room, msg: data_1.message });
                                if (selectedHaven === "__dms__" && selectedDM === room) {
                                    setMessages(function (prev) { return __spreadArray(__spreadArray([], prev, true), [data_1.message], false); });
                                }
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            _a = _c.sent();
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); })();
            setCallSummarySent(true);
        }
    };
    var startCall = function () { return __awaiter(_this, void 0, void 0, function () {
        var dial, stream_1, pc_1, offer, dm, targets, e_1;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!selectedDM || selectedHaven !== '__dms__')
                        return [2 /*return*/];
                    if (callState !== 'idle')
                        return [2 /*return*/];
                    if (!callsEnabled)
                        return [2 /*return*/];
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 5, , 6]);
                    setCallError(null);
                    setCallState('calling');
                    setActiveCallDM(selectedDM);
                    setIncomingCall(null);
                    setCallInitiator(username);
                    setCallSummarySent(false);
                    setCallStartedAt(null);
                    setIncomingCall(null);
                    if (dialingAudioRef.current) {
                        try {
                            dialingAudioRef.current.pause();
                            dialingAudioRef.current.currentTime = 0;
                        }
                        catch (_e) { }
                        dialingAudioRef.current = null;
                    }
                    try {
                        dial = new Audio(SOUND_DIALING);
                        dial.loop = true;
                        dial.volume = Math.max(0, Math.min(1, (_b = (_a = userSettings === null || userSettings === void 0 ? void 0 : userSettings.notifications) === null || _a === void 0 ? void 0 : _a.volume) !== null && _b !== void 0 ? _b : 0.6));
                        dial.play().catch(function () { });
                        dialingAudioRef.current = dial;
                    }
                    catch (_f) { }
                    return [4 /*yield*/, navigator.mediaDevices.getUserMedia({ audio: true })];
                case 2:
                    stream_1 = _d.sent();
                    localStreamRef.current = stream_1;
                    if (localAudioRef.current) {
                        localAudioRef.current.srcObject = stream_1;
                    }
                    pc_1 = setupPeer();
                    stream_1.getTracks().forEach(function (t) { return pc_1.addTrack(t, stream_1); });
                    return [4 /*yield*/, pc_1.createOffer()];
                case 3:
                    offer = _d.sent();
                    return [4 /*yield*/, pc_1.setLocalDescription(offer)];
                case 4:
                    _d.sent();
                    dm = dms.find(function (d) { return d.id === selectedDM; });
                    targets = dm ? dm.users.filter(function (u) { return u !== username; }) : [];
                    pendingOfferRef.current = null;
                    (_c = socketRef.current) === null || _c === void 0 ? void 0 : _c.emit('call-offer', { room: selectedDM, offer: offer, from: username, targets: targets });
                    setIsMuted(false);
                    return [3 /*break*/, 6];
                case 5:
                    e_1 = _d.sent();
                    setCallState('idle');
                    if (dialingAudioRef.current) {
                        try {
                            dialingAudioRef.current.pause();
                            dialingAudioRef.current.currentTime = 0;
                        }
                        catch (_g) { }
                        dialingAudioRef.current = null;
                    }
                    setCallError((e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || 'Could not start call');
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    // Friends home state for DMs root
    var _10 = (0, react_1.useState)({ friends: [], incoming: [], outgoing: [] }), friendsState = _10[0], setFriendsState = _10[1];
    var _11 = (0, react_1.useState)('all'), friendsTab = _11[0], setFriendsTab = _11[1];
    var _12 = (0, react_1.useState)(false), showAddFriend = _12[0], setShowAddFriend = _12[1];
    var _13 = (0, react_1.useState)(""), addFriendName = _13[0], setAddFriendName = _13[1];
    var _14 = (0, react_1.useState)({}), userSettings = _14[0], setUserSettings = _14[1];
    var _15 = (0, react_1.useState)(false), settingsLoaded = _15[0], setSettingsLoaded = _15[1];
    var _16 = (0, react_1.useState)(false), dmsLoaded = _16[0], setDmsLoaded = _16[1];
    var _17 = (0, react_1.useState)(false), friendsLoaded = _17[0], setFriendsLoaded = _17[1];
    var accent = userSettings.accentHex || '#60a5fa';
    var boldColor = userSettings.boldColorHex || '#f472b6';
    var italicColor = userSettings.italicColorHex || '#a3e635';
    var pinColor = userSettings.pinColorHex || '#facc15';
    var mentionColor = userSettings.mentionColorHex || '#f97316';
    var currentStatus = userSettings.status || 'online';
    var labelHavens = userSettings.callHavensServers ? 'Servers' : 'Havens';
    var labelHaven = userSettings.callHavensServers ? 'Server' : 'Haven';
    var showTipsBanner = userSettings.showTips !== false;
    var callsEnabled = userSettings.callsEnabled !== false;
    var callRingSound = !!userSettings.callRingSound;
    var compact = !!userSettings.compact;
    var showTimestamps = userSettings.showTimestamps !== false;
    var reduceMotion = !!userSettings.reduceMotion;
    var fontMap = { small: 13, medium: 14, large: 16 };
    var msgFontSize = fontMap[userSettings.messageFontSize || 'medium'] || 14;
    var compactSidebar = !!userSettings.compactSidebar;
    var monospaceMessages = !!userSettings.monospaceMessages;
    var isBooting = !(settingsLoaded && dmsLoaded && friendsLoaded);
    var _18 = (0, react_1.useState)(""), havenFilter = _18[0], setHavenFilter = _18[1];
    var _19 = (0, react_1.useState)(""), dmFilter = _19[0], setDmFilter = _19[1];
    var _20 = (0, react_1.useState)(""), channelFilter = _20[0], setChannelFilter = _20[1];
    var _21 = (0, react_1.useState)(false), showInvitePanel = _21[0], setShowInvitePanel = _21[1];
    var _22 = (0, react_1.useState)(1), inviteDays = _22[0], setInviteDays = _22[1];
    var _23 = (0, react_1.useState)(1), inviteMaxUses = _23[0], setInviteMaxUses = _23[1];
    var _24 = (0, react_1.useState)(null), inviteCode = _24[0], setInviteCode = _24[1];
    var _25 = (0, react_1.useState)(false), creatingInvite = _25[0], setCreatingInvite = _25[1];
    var _26 = (0, react_1.useState)(null), activeCallDM = _26[0], setActiveCallDM = _26[1];
    var _27 = (0, react_1.useState)(null), incomingCall = _27[0], setIncomingCall = _27[1];
    var _28 = (0, react_1.useState)(null), callInitiator = _28[0], setCallInitiator = _28[1];
    var _29 = (0, react_1.useState)(false), callSummarySent = _29[0], setCallSummarySent = _29[1];
    var _30 = (0, react_1.useState)(null), callStartedAt = _30[0], setCallStartedAt = _30[1];
    var _31 = (0, react_1.useState)(0), callElapsed = _31[0], setCallElapsed = _31[1];
    var _32 = (0, react_1.useState)(null), ctxMenu = _32[0], setCtxMenu = _32[1];
    var _33 = (0, react_1.useState)(true), isAtBottom = _33[0], setIsAtBottom = _33[1];
    var _34 = (0, react_1.useState)(0), newSinceScroll = _34[0], setNewSinceScroll = _34[1];
    var roomKey = function () { return "".concat(selectedDM || "".concat(selectedHaven, "__").concat(selectedChannel)); };
    var _35 = (0, react_1.useState)(false), showNewChannelModal = _35[0], setShowNewChannelModal = _35[1];
    var _36 = (0, react_1.useState)(false), shakeVoice = _36[0], setShakeVoice = _36[1];
    var _37 = (0, react_1.useState)(false), showNewHavenModal = _37[0], setShowNewHavenModal = _37[1];
    var _38 = (0, react_1.useState)(false), shakeHavenType = _38[0], setShakeHavenType = _38[1];
    var _39 = (0, react_1.useState)({}), chResolved = _39[0], setChResolved = _39[1];
    var _40 = (0, react_1.useState)({ canPin: true, canManageMessages: true, canManageServer: true, canManageChannels: true, canSend: true, canReact: true, canUpload: true }), permState = _40[0], setPermState = _40[1];
    var _41 = (0, react_1.useState)('idle'), callState = _41[0], setCallState = _41[1];
    var _42 = (0, react_1.useState)(null), callError = _42[0], setCallError = _42[1];
    var pcRef = (0, react_1.useRef)(null);
    var localStreamRef = (0, react_1.useRef)(null);
    var remoteStreamRef = (0, react_1.useRef)(null);
    var localAudioRef = (0, react_1.useRef)(null);
    var remoteAudioRef = (0, react_1.useRef)(null);
    var _43 = (0, react_1.useState)(false), isMuted = _43[0], setIsMuted = _43[1];
    var pendingOfferRef = (0, react_1.useRef)(null);
    // Keep a simple elapsed timer while a call is active
    (0, react_1.useEffect)(function () {
        if (!callStartedAt || callState === 'idle') {
            setCallElapsed(0);
            return;
        }
        var update = function () {
            setCallElapsed(Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000)));
        };
        update();
        var id = setInterval(update, 1000);
        return function () { return clearInterval(id); };
    }, [callStartedAt, callState]);
    // Persist havens to localStorage
    (0, react_1.useEffect)(function () {
        if (typeof window !== "undefined") {
            localStorage.setItem("havens", JSON.stringify(havens));
        }
    }, [havens]);
    // Load DMs from server and persist locally for quick access
    (0, react_1.useEffect)(function () {
        var ignore = false;
        fetch('/api/dms')
            .then(function (r) { return r.json(); })
            .then(function (d) {
            if (ignore)
                return;
            if (Array.isArray(d.dms)) {
                setDMs(d.dms);
                try {
                    localStorage.setItem('dms', JSON.stringify(d.dms));
                }
                catch (_a) { }
            }
            setDmsLoaded(true);
        })
            .catch(function () {
            // fallback to localStorage if server unavailable
            try {
                var s = localStorage.getItem('dms');
                if (s)
                    setDMs(JSON.parse(s));
            }
            catch (_a) { }
            setDmsLoaded(true);
        });
        return function () { ignore = true; };
    }, []);
    // Load user settings
    var loadUserSettings = function () { return __awaiter(_this, void 0, void 0, function () {
        var r, d, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch('/api/settings')];
                case 1:
                    r = _b.sent();
                    return [4 /*yield*/, r.json()];
                case 2:
                    d = _b.sent();
                    setUserSettings(d || {});
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    return [3 /*break*/, 4];
                case 4:
                    setSettingsLoaded(true);
                    return [2 /*return*/];
            }
        });
    }); };
    (0, react_1.useEffect)(function () { loadUserSettings(); }, []);
    // Load friends lists for DMs home
    var reloadFriends = function () { return __awaiter(_this, void 0, void 0, function () {
        var res, data, fs, all, res2, d2_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 6, 7, 8]);
                    return [4 /*yield*/, fetch('/api/friends')];
                case 1:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _b.sent();
                    fs = {
                        friends: Array.isArray(data.friends) ? data.friends : [],
                        incoming: Array.isArray(data.incoming) ? data.incoming : [],
                        outgoing: Array.isArray(data.outgoing) ? data.outgoing : [],
                    };
                    setFriendsState(fs);
                    all = __spreadArray(__spreadArray(__spreadArray([], fs.friends, true), fs.incoming, true), fs.outgoing, true);
                    if (!(all.length > 0)) return [3 /*break*/, 5];
                    return [4 /*yield*/, fetch("/api/user-status?users=".concat(encodeURIComponent(all.join(','))))];
                case 3:
                    res2 = _b.sent();
                    return [4 /*yield*/, res2.json()];
                case 4:
                    d2_1 = _b.sent();
                    if (d2_1 && d2_1.statuses)
                        setPresenceMap(function (prev) { return (__assign(__assign({}, prev), d2_1.statuses)); });
                    _b.label = 5;
                case 5: return [3 /*break*/, 8];
                case 6:
                    _a = _b.sent();
                    return [3 /*break*/, 8];
                case 7:
                    setFriendsLoaded(true);
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    }); };
    (0, react_1.useEffect)(function () { reloadFriends(); }, []);
    var friendAction = function (action, target) { return __awaiter(_this, void 0, void 0, function () {
        var r, d, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, fetch('/api/friends', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: action, target: target }) })];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, reloadFriends()];
                case 2:
                    _b.sent();
                    if (!(action === 'accept')) return [3 /*break*/, 5];
                    return [4 /*yield*/, fetch('/api/dms')];
                case 3:
                    r = _b.sent();
                    return [4 /*yield*/, r.json()];
                case 4:
                    d = _b.sent();
                    if (Array.isArray(d.dms))
                        setDMs(d.dms);
                    _b.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    _a = _b.sent();
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    var ensureDM = function (target) { return __awaiter(_this, void 0, void 0, function () {
        var r, d_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch('/api/dms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ensure', target: target }) })];
                case 1:
                    r = _b.sent();
                    return [4 /*yield*/, r.json()];
                case 2:
                    d_1 = _b.sent();
                    if (d_1 && d_1.dm && d_1.dm.id) {
                        setDMs(function (prev) { return (prev.some(function (x) { return x.id === d_1.dm.id; }) ? prev : __spreadArray(__spreadArray([], prev, true), [d_1.dm], false)); });
                        setSelectedHaven('__dms__');
                        setSelectedDM(d_1.dm.id);
                    }
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    // Detect mobile viewport
    (0, react_1.useEffect)(function () {
        var onResize = function () {
            if (typeof window === 'undefined')
                return;
            setIsMobile(window.innerWidth < 768);
        };
        onResize();
        window.addEventListener('resize', onResize);
        return function () { return window.removeEventListener('resize', onResize); };
    }, []);
    // Load messages for selected channel or DM
    (0, react_1.useEffect)(function () {
        var ignore = false;
        if (!socketRef.current) {
            socketRef.current = (0, socket_io_client_1.default)({ path: "/api/socketio" });
        }
        var room = "".concat(selectedDM || "".concat(selectedHaven, "__").concat(selectedChannel));
        socketRef.current.emit("join-room", room);
        // Fetch all messages for the room
        fetch("/api/history?room=".concat(encodeURIComponent(room)))
            .then(function (res) { return res.json(); })
            .then(function (data) {
            if (ignore)
                return;
            var list = Array.isArray(data.messages) ? data.messages : [];
            var seen = new Set();
            var unique = list.filter(function (m) { return m && typeof m.id === 'string' && !seen.has(m.id) && seen.add(m.id); });
            setMessages(unique);
        });
        // Handler to add new messages only if they are not already present
        var handleSocketMessage = function (msg) {
            setMessages(function (prev) {
                // Prevent duplicates (by id)
                if (prev.some(function (m) { return m.id === msg.id; }))
                    return prev;
                return __spreadArray(__spreadArray([], prev, true), [msg], false);
            });
            if (msg.user !== username) {
                var isMention = (msg.text || '').includes("@".concat(username));
                notify({ title: isMention ? 'Mention' : 'New message', body: "".concat(msg.user, ": ").concat((msg.text || '').slice(0, 80)), type: isMention ? 'success' : 'info' });
            }
        };
        var handleReact = function (payload) { return setMessages(function (prev) { return prev.map(function (m) { return m.id === payload.message.id ? payload.message : m; }); }); };
        var handlePin = function (payload) {
            var _a, _b;
            setMessages(function (prev) { return prev.map(function (m) { return m.id === payload.message.id ? payload.message : m; }); });
            try {
                if (((_a = payload.message) === null || _a === void 0 ? void 0 : _a.pinned) && ((_b = userSettings === null || userSettings === void 0 ? void 0 : userSettings.notifications) === null || _b === void 0 ? void 0 : _b.pins)) {
                    var preview = (payload.message.text || '').slice(0, 64);
                    notify({ title: 'Message pinned', body: preview, type: 'info' });
                }
            }
            catch (_c) { }
        };
        var handleEditEvent = function (payload) { return setMessages(function (prev) { return prev.map(function (m) { return m.id === payload.message.id ? payload.message : m; }); }); };
        var handleDeleteEvent = function (payload) { return setMessages(function (prev) { return prev.filter(function (m) { return m.id !== payload.messageId; }); }); };
        socketRef.current.on("message", handleSocketMessage);
        socketRef.current.on("react", handleReact);
        socketRef.current.on("pin", handlePin);
        socketRef.current.on("edit", handleEditEvent);
        socketRef.current.on("delete", handleDeleteEvent);
        return function () {
            var _a, _b, _c, _d, _e;
            ignore = true;
            (_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.off("message", handleSocketMessage);
            (_b = socketRef.current) === null || _b === void 0 ? void 0 : _b.off("react", handleReact);
            (_c = socketRef.current) === null || _c === void 0 ? void 0 : _c.off("pin", handlePin);
            (_d = socketRef.current) === null || _d === void 0 ? void 0 : _d.off("edit", handleEditEvent);
            (_e = socketRef.current) === null || _e === void 0 ? void 0 : _e.off("delete", handleDeleteEvent);
        };
    }, [selectedHaven, selectedChannel, selectedDM]);
    (0, react_1.useEffect)(function () {
        var _a;
        if (isAtBottom) {
            (_a = messagesEndRef.current) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
        }
        else {
            setNewSinceScroll(function (n) { return n + 1; });
        }
    }, [messages, reduceMotion, isAtBottom]);
    // Resolve ChitterHaven tokens inside message text
    (0, react_1.useEffect)(function () {
        messages.forEach(function (msg) {
            if (!msg.id || !msg.text || !msg.text.includes("{CH:"))
                return;
            if (chResolved[msg.id])
                return;
            var nodes = (0, chTokens_1.parseCHInline)(msg.text);
            var parts = nodes.map(function (node) { return __awaiter(_this, void 0, void 0, function () {
                var token, res;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (node.type === "text")
                                return [2 /*return*/, node.text];
                            token = node;
                            return [4 /*yield*/, (0, chTokens_1.resolveCH)(token)];
                        case 1:
                            res = _a.sent();
                            if (res.kind === "text")
                                return [2 /*return*/, res.text];
                            if (res.kind === "url")
                                return [2 /*return*/, res.url];
                            if (res.kind === "card")
                                return [2 /*return*/, res.title];
                            return [2 /*return*/, "[Unknown]"];
                    }
                });
            }); });
            Promise.all(parts)
                .then(function (joined) {
                setChResolved(function (prev) {
                    var _a;
                    return prev[msg.id] ? prev : __assign(__assign({}, prev), (_a = {}, _a[msg.id] = joined.join(""), _a));
                });
            })
                .catch(function () { });
        });
    }, [messages, chResolved]);
    // Load haven members when sidebar is open in a haven
    (0, react_1.useEffect)(function () {
        var ignore = false;
        if (!showMembers || selectedHaven === '__dms__')
            return;
        fetch("/api/haven-members?haven=".concat(encodeURIComponent(selectedHaven)))
            .then(function (r) { return r.json(); })
            .then(function (d) {
            if (ignore)
                return;
            var list = Array.isArray(d.users) ? d.users : [];
            setHavenMembers(list);
            if (list.length > 0) {
                fetch("/api/user-status?users=".concat(encodeURIComponent(list.join(','))))
                    .then(function (r) { return r.json(); })
                    .then(function (s) { if (!ignore && (s === null || s === void 0 ? void 0 : s.statuses))
                    setPresenceMap(function (prev) { return (__assign(__assign({}, prev), s.statuses)); }); })
                    .catch(function () { });
            }
        })
            .catch(function () { });
        return function () { ignore = true; };
    }, [showMembers, selectedHaven]);
    // Load permissions for current haven and compute Discord-like abilities
    (0, react_1.useEffect)(function () {
        var haven = selectedHaven;
        if (!haven || haven === '__dms__') {
            setPermState({ canPin: true, canManageMessages: true, canManageServer: true, canManageChannels: true, canSend: true, canReact: true, canUpload: true });
            return;
        }
        var ignore = false;
        fetch("/api/permissions?haven=".concat(encodeURIComponent(haven)))
            .then(function (r) { return r.json(); })
            .then(function (data) {
            var _a, _b;
            if (ignore)
                return;
            var perms = (data === null || data === void 0 ? void 0 : data.permissions) || {};
            var rolesMap = perms.roles || {};
            var memberRoles = (((_a = perms.members) === null || _a === void 0 ? void 0 : _a[username]) || []);
            var everyone = (((_b = perms.defaults) === null || _b === void 0 ? void 0 : _b.everyone) || []);
            var set = new Set(everyone);
            memberRoles.forEach(function (role) {
                (rolesMap[role] || []).forEach(function (p) { return set.add(p); });
            });
            var all = set.has('*');
            var has = function (p) { return all || set.has(p); };
            setPermState({
                canPin: has('pin_messages') || has('manage_messages'),
                canManageMessages: has('manage_messages'),
                canManageServer: has('manage_server'),
                canManageChannels: has('manage_channels'),
                canSend: has('send_messages'),
                canReact: has('add_reactions'),
                canUpload: has('upload_files'),
            });
        })
            .catch(function () {
            if (ignore)
                return;
            setPermState({ canPin: true, canManageMessages: true, canManageServer: true, canManageChannels: true, canSend: true, canReact: true, canUpload: true });
        });
        return function () { ignore = true; };
    }, [selectedHaven, username]);
    // Global presence listener
    (0, react_1.useEffect)(function () {
        if (!socketRef.current) {
            socketRef.current = (0, socket_io_client_1.default)({ path: "/api/socketio" });
        }
        var handler = function (data) { return setPresenceMap(function (prev) {
            var _a;
            return (__assign(__assign({}, prev), (_a = {}, _a[data.user] = data.status, _a)));
        }); };
        var countHandler = function (data) { if (typeof (data === null || data === void 0 ? void 0 : data.count) === 'number')
            setOnlineCount(data.count); };
        socketRef.current.on('presence', handler);
        socketRef.current.on('online-count', countHandler);
        var offerHandler = function (data) { return __awaiter(_this, void 0, void 0, function () {
            var stream_2, pc_2, answer, e_2, ring;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!callsEnabled)
                            return [2 /*return*/];
                        pendingOfferRef.current = data.offer;
                        setActiveCallDM(data.room);
                        setCallInitiator(data.from || null);
                        setCallSummarySent(false);
                        if (!(selectedHaven === '__dms__' && selectedDM === data.room)) return [3 /*break*/, 8];
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 6, , 7]);
                        setCallError(null);
                        return [4 /*yield*/, navigator.mediaDevices.getUserMedia({ audio: true })];
                    case 2:
                        stream_2 = _d.sent();
                        localStreamRef.current = stream_2;
                        if (localAudioRef.current) {
                            localAudioRef.current.srcObject = stream_2;
                        }
                        pc_2 = setupPeer();
                        stream_2.getTracks().forEach(function (t) { return pc_2.addTrack(t, stream_2); });
                        return [4 /*yield*/, pc_2.setRemoteDescription(new RTCSessionDescription(data.offer))];
                    case 3:
                        _d.sent();
                        return [4 /*yield*/, pc_2.createAnswer()];
                    case 4:
                        answer = _d.sent();
                        return [4 /*yield*/, pc_2.setLocalDescription(answer)];
                    case 5:
                        _d.sent();
                        (_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.emit('call-answer', { room: data.room, answer: answer, from: username });
                        setCallState('in-call');
                        setCallStartedAt(Date.now());
                        return [3 /*break*/, 7];
                    case 6:
                        e_2 = _d.sent();
                        setCallError((e_2 === null || e_2 === void 0 ? void 0 : e_2.message) || 'Could not join call');
                        setCallState('idle');
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                    case 8:
                        // Otherwise, show an incoming call popup and start ringtone if enabled
                        setIncomingCall({ room: data.room, from: data.from });
                        try {
                            if (ringAudioRef.current) {
                                ringAudioRef.current.pause();
                                ringAudioRef.current.currentTime = 0;
                            }
                        }
                        catch (_e) { }
                        ringAudioRef.current = null;
                        if (callRingSound) {
                            try {
                                ring = new Audio(SOUND_RINGTONE);
                                ring.loop = true;
                                ring.volume = Math.max(0, Math.min(1, (_c = (_b = userSettings === null || userSettings === void 0 ? void 0 : userSettings.notifications) === null || _b === void 0 ? void 0 : _b.volume) !== null && _c !== void 0 ? _c : 0.6));
                                ring.play().catch(function () { });
                                ringAudioRef.current = ring;
                            }
                            catch (_f) { }
                        }
                        return [2 /*return*/];
                }
            });
        }); };
        var answerHandler = function (data) { return __awaiter(_this, void 0, void 0, function () {
            var e_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!selectedDM || data.room !== selectedDM)
                            return [2 /*return*/];
                        if (!pcRef.current)
                            return [2 /*return*/];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer))];
                    case 2:
                        _a.sent();
                        setCallState('in-call');
                        setCallStartedAt(Date.now());
                        if (!callInitiator)
                            setCallInitiator(username);
                        if (dialingAudioRef.current) {
                            try {
                                dialingAudioRef.current.pause();
                                dialingAudioRef.current.currentTime = 0;
                            }
                            catch (_b) { }
                            dialingAudioRef.current = null;
                        }
                        if (ringAudioRef.current) {
                            try {
                                ringAudioRef.current.pause();
                                ringAudioRef.current.currentTime = 0;
                            }
                            catch (_c) { }
                            ringAudioRef.current = null;
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        e_3 = _a.sent();
                        setCallError((e_3 === null || e_3 === void 0 ? void 0 : e_3.message) || 'Could not establish call');
                        setCallState('idle');
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        var iceHandler = function (data) { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!selectedDM || data.room !== selectedDM)
                            return [2 /*return*/];
                        if (!pcRef.current)
                            return [2 /*return*/];
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        socketRef.current.on('call-offer', offerHandler);
        socketRef.current.on('call-answer', answerHandler);
        socketRef.current.on('ice-candidate', iceHandler);
        return function () {
            var _a, _b, _c, _d, _e;
            (_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.off('presence', handler);
            (_b = socketRef.current) === null || _b === void 0 ? void 0 : _b.off('online-count', countHandler);
            (_c = socketRef.current) === null || _c === void 0 ? void 0 : _c.off('call-offer', offerHandler);
            (_d = socketRef.current) === null || _d === void 0 ? void 0 : _d.off('call-answer', answerHandler);
            (_e = socketRef.current) === null || _e === void 0 ? void 0 : _e.off('ice-candidate', iceHandler);
        };
    }, [selectedDM, username]);
    // Broadcast my current status when settings or socket change
    (0, react_1.useEffect)(function () {
        if (!socketRef.current)
            return;
        try {
            socketRef.current.emit('presence', { user: username, status: currentStatus });
            setPresenceMap(function (prev) {
                var _a;
                return (__assign(__assign({}, prev), (_a = {}, _a[username] = currentStatus, _a)));
            });
        }
        catch (_a) { }
    }, [currentStatus, username]);
    // Close context menu on click elsewhere / Escape
    (0, react_1.useEffect)(function () {
        var onClick = function () { return setCtxMenu(null); };
        var onKey = function (e) { if (e.key === 'Escape')
            setCtxMenu(null); };
        window.addEventListener('click', onClick);
        window.addEventListener('keydown', onKey);
        return function () { window.removeEventListener('click', onClick); window.removeEventListener('keydown', onKey); };
    }, []);
    var openCtx = function (e, target) {
        e.preventDefault();
        var debug = !!e.altKey;
        setCtxMenu({ open: true, x: e.clientX, y: e.clientY, target: __assign(__assign({}, target), { debug: debug }) });
    };
    var copyText = function (text) { return __awaiter(_this, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, navigator.clipboard.writeText(text)];
            case 1:
                _b.sent();
                return [3 /*break*/, 3];
            case 2:
                _a = _b.sent();
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    }); }); };
    var handleCtxAction = function (act) { return __awaiter(_this, void 0, void 0, function () {
        var t, msg, url, a, body, _a, ch_1, next_1, dm_1, debug_1;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!ctxMenu)
                        return [2 /*return*/];
                    t = ctxMenu.target;
                    if (t.type === 'message' && t.id) {
                        msg = messages.find(function (m) { return m.id === t.id; });
                        if (!msg)
                            return [2 /*return*/, setCtxMenu(null)];
                        if (act === 'reply')
                            handleReply(msg);
                        if (act === 'react') {
                            if (permState.canReact)
                                setPickerFor(msg.id);
                        }
                        if (act === 'edit') {
                            if (msg.user === username)
                                handleEdit(msg.id, msg.text);
                        }
                        if (act === 'delete') {
                            if (msg.user === username || permState.canManageMessages)
                                handleDelete(msg.id);
                        }
                        if (act === 'pin') {
                            if (permState.canPin)
                                togglePin(msg.id, !msg.pinned);
                        }
                        if (act === 'copy_text')
                            copyText(msg.text || '');
                        if (act === 'copy_id')
                            copyText(msg.id);
                        if (act === 'copy_raw')
                            copyText(JSON.stringify(msg, null, 2));
                        if (act === 'copy_room')
                            copyText(roomKey());
                        if (act === 'copy_link') {
                            try {
                                url = new URL(window.location.href);
                                url.searchParams.set('room', roomKey());
                                url.searchParams.set('mid', msg.id);
                                copyText(url.toString());
                            }
                            catch (_d) { }
                        }
                    }
                    if (!(t.type === 'attachment' && t.data)) return [3 /*break*/, 4];
                    a = t.data;
                    if (!(act === 'set_avatar' || act === 'set_banner')) return [3 /*break*/, 4];
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    body = {};
                    if (act === 'set_avatar')
                        body.avatarUrl = a.url;
                    if (act === 'set_banner')
                        body.bannerUrl = a.url;
                    return [4 /*yield*/, fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })];
                case 2:
                    _c.sent();
                    notify({ title: act === 'set_avatar' ? 'Avatar updated' : 'Banner updated', type: 'success' });
                    return [3 /*break*/, 4];
                case 3:
                    _a = _c.sent();
                    notify({ title: 'Update failed', body: 'Could not update profile image', type: 'error' });
                    return [3 /*break*/, 4];
                case 4:
                    if (t.type === 'channel' && t.data) {
                        ch_1 = String(t.data);
                        if (act === 'copy')
                            copyText(ch_1);
                        if (act === 'rename' && permState.canManageChannels) {
                            next_1 = prompt('Rename channel', ch_1);
                            if (next_1 && next_1 !== ch_1) {
                                setHavens(function (prev) {
                                    var _a;
                                    var arr = (prev[selectedHaven] || []).slice();
                                    var idx = arr.indexOf(ch_1);
                                    if (idx >= 0)
                                        arr[idx] = next_1;
                                    var out = __assign(__assign({}, prev), (_a = {}, _a[selectedHaven] = arr, _a));
                                    return out;
                                });
                                if (selectedChannel === ch_1)
                                    setSelectedChannel(next_1);
                            }
                        }
                        if (act === 'delete' && permState.canManageChannels) {
                            setHavens(function (prev) {
                                var _a;
                                var arr = (prev[selectedHaven] || []).filter(function (c) { return c !== ch_1; });
                                var out = __assign(__assign({}, prev), (_a = {}, _a[selectedHaven] = arr, _a));
                                return out;
                            });
                            if (selectedChannel === ch_1)
                                setSelectedChannel(((_b = havens[selectedHaven]) === null || _b === void 0 ? void 0 : _b[0]) || '');
                        }
                    }
                    if (t.type === 'dm' && t.data) {
                        dm_1 = t.data;
                        if (act === 'copy_users')
                            copyText(dm_1.users.join(', '));
                        if (act === 'close')
                            setDMs(function (prev) { return prev.filter(function (x) { return x.id !== dm_1.id; }); });
                    }
                    if (t.type === 'blank') {
                        if (act === 'copy_debug') {
                            debug_1 = {
                                me: username,
                                haven: selectedHaven,
                                channel: selectedChannel,
                                room: roomKey()
                            };
                            copyText(JSON.stringify(debug_1, null, 2));
                        }
                    }
                    setCtxMenu(null);
                    return [2 /*return*/];
            }
        });
    }); };
    var dismissTips = function () { return __awaiter(_this, void 0, void 0, function () {
        var next, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    setUserSettings(function (prev) { return (__assign(__assign({}, prev), { showTips: false })); });
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    next = __assign(__assign({}, (userSettings || {})), { showTips: false });
                    return [4 /*yield*/, fetch('/api/settings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(next),
                        })];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var getQuickItems = function () {
        var items = [];
        items.push({ id: 'd:home', label: 'Friends — Direct Messages', type: 'dmhome' });
        Object.keys(havens).forEach(function (h) {
            items.push({ id: "h:".concat(h), label: "Haven \u00B7 ".concat(h), type: 'haven', haven: h });
            (havens[h] || []).forEach(function (ch) { return items.push({ id: "c:".concat(h, ":").concat(ch), label: "#".concat(ch, " \u2014 ").concat(h), type: 'channel', haven: h, channel: ch }); });
        });
        dms.forEach(function (dm) { return items.push({ id: "d:".concat(dm.id), label: "DM \u00B7 ".concat(dm.users.filter(function (u) { return u !== username; }).join(', ')), type: 'dm', dmId: dm.id }); });
        return items;
    };
    var filterQuickItems = function (items, q) {
        var s = q.trim().toLowerCase();
        if (!s)
            return items.slice(0, 40);
        return items.filter(function (i) { return i.label.toLowerCase().includes(s); }).slice(0, 40);
    };
    var selectQuickItem = function (it) {
        var _a;
        setQuickOpen(false);
        if (it.type === 'dmhome') {
            setSelectedHaven('__dms__');
            setSelectedDM(null);
            setSelectedChannel('');
        }
        else if (it.type === 'haven' && it.haven) {
            setSelectedHaven(it.haven);
            setSelectedDM(null);
            setSelectedChannel(((_a = havens[it.haven]) === null || _a === void 0 ? void 0 : _a[0]) || '');
        }
        else if (it.type === 'channel' && it.haven && it.channel) {
            setSelectedHaven(it.haven);
            setSelectedDM(null);
            setSelectedChannel(it.channel);
        }
        else if (it.type === 'dm' && it.dmId) {
            setSelectedHaven('__dms__');
            setSelectedChannel('');
            setSelectedDM(it.dmId);
        }
    };
    (0, react_1.useEffect)(function () {
        var onKey = function (e) {
            var isK = e.key.toLowerCase() === 'k';
            if ((e.metaKey || e.ctrlKey) && isK) {
                e.preventDefault();
                setQuickOpen(true);
                setQuickQuery('');
                setQuickIndex(0);
            }
            if (!quickOpen)
                return;
            if (e.key === 'Escape')
                setQuickOpen(false);
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setQuickIndex(function (i) { return i + 1; });
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setQuickIndex(function (i) { return Math.max(0, i - 1); });
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                var items = filterQuickItems(getQuickItems(), quickQuery);
                var sel = items[Math.min(quickIndex, Math.max(0, items.length - 1))];
                if (sel)
                    selectQuickItem(sel);
            }
        };
        window.addEventListener('keydown', onKey);
        return function () { return window.removeEventListener('keydown', onKey); };
    }, [quickOpen, quickQuery, quickIndex, havens, dms, selectedHaven, selectedChannel]);
    // When entering a DM, fetch presence for participants (best-effort)
    (0, react_1.useEffect)(function () {
        if (!selectedDM)
            return;
        var dm = dms.find(function (d) { return d.id === selectedDM; });
        if (!dm)
            return;
        var others = dm.users.filter(function (u) { return u !== username; });
        if (others.length === 0)
            return;
        (function () { return __awaiter(_this, void 0, void 0, function () {
            var r, d_2, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, fetch("/api/user-status?users=".concat(encodeURIComponent(others.join(','))))];
                    case 1:
                        r = _b.sent();
                        return [4 /*yield*/, r.json()];
                    case 2:
                        d_2 = _b.sent();
                        if (d_2 && d_2.statuses)
                            setPresenceMap(function (prev) { return (__assign(__assign({}, prev), d_2.statuses)); });
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); })();
    }, [selectedDM, dms, username]);
    (0, react_1.useEffect)(function () {
        var _a;
        var room = "".concat(selectedDM || "".concat(selectedHaven, "__").concat(selectedChannel));
        var handleTyping = function (data) {
            if (data.room !== room || data.user === username)
                return;
            setTypingUsers(function (prev) {
                if (!prev.includes(data.user))
                    return __spreadArray(__spreadArray([], prev, true), [data.user], false);
                return prev;
            });
            setTimeout(function () {
                setTypingUsers(function (prev) { return prev.filter(function (u) { return u !== data.user; }); });
            }, 2500);
        };
        (_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.on("typing", handleTyping);
        return function () {
            var _a;
            (_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.off("typing", handleTyping);
        };
    }, [selectedHaven, selectedChannel, selectedDM, username]);
    var sendMessage = function () {
        if (input.trim()) {
            var room_1 = "".concat(selectedDM || "".concat(selectedHaven, "__").concat(selectedChannel));
            var msg = { user: username, text: input };
            if (replyTo === null || replyTo === void 0 ? void 0 : replyTo.id)
                msg.replyToId = replyTo.id;
            if (pendingFiles.length > 0)
                msg.attachments = pendingFiles;
            fetch("/api/history", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ room: room_1, msg: msg })
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                var _a;
                if (data.message) {
                    (_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.emit("message", { room: room_1, msg: data.message });
                    setMessages(function (prev) { return __spreadArray(__spreadArray([], prev, true), [data.message], false); });
                }
            });
            setInput("");
            setReplyTo(null);
            setPendingFiles([]);
        }
    };
    var handleDelete = function (id) {
        var room = "".concat(selectedDM || "".concat(selectedHaven, "__").concat(selectedChannel));
        fetch("/api/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room: room, action: "delete", messageId: id })
        }).then(function (res) {
            var _a;
            if (res.ok) {
                setMessages(function (prev) { return prev.filter(function (m) { return m.id !== id; }); });
                (_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.emit("delete", { room: room, messageId: id });
            }
        });
    };
    var _44 = (0, react_1.useState)(null), editId = _44[0], setEditId = _44[1];
    var _45 = (0, react_1.useState)(""), editText = _45[0], setEditText = _45[1];
    var handleEdit = function (id, text) {
        setEditId(id);
        setEditText(text);
    };
    var handleEditSubmit = function (id) {
        var room = "".concat(selectedDM || "".concat(selectedHaven, "__").concat(selectedChannel));
        fetch("/api/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room: room, action: "edit", messageId: id, newText: editText })
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {
            var _a;
            if (data.success && data.message) {
                setMessages(function (prev) { return prev.map(function (m) { return m.id === id ? data.message : m; }); });
                (_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.emit("edit", { room: room, message: data.message });
                setEditId(null);
                setEditText("");
            }
        });
    };
    var _46 = (0, react_1.useState)(null), replyTo = _46[0], setReplyTo = _46[1];
    var handleReply = function (msg) {
        setReplyTo(msg);
        setInput("@".concat(msg.user, " "));
    };
    // Reactions & Pinning
    var _47 = (0, react_1.useState)(null), pickerFor = _47[0], setPickerFor = _47[1];
    var commonEmojis = ["👍", "❤️", "😂", "😮", "🎉", "👀"];
    var _48 = (0, react_1.useState)(""), emojiQuery = _48[0], setEmojiQuery = _48[1];
    var _49 = (0, react_1.useState)('smileys'), emojiCategory = _49[0], setEmojiCategory = _49[1];
    var toggleReaction = function (messageId, emoji) {
        var room = "".concat(selectedDM || "".concat(selectedHaven, "__").concat(selectedChannel));
        fetch("/api/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room: room, action: "react", messageId: messageId, emoji: emoji, user: username })
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {
            var _a;
            if (data.message) {
                setMessages(function (prev) { return prev.map(function (m) { return m.id === messageId ? data.message : m; }); });
                (_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.emit("react", { room: room, message: data.message });
            }
        });
    };
    var togglePin = function (id, pin) {
        var room = "".concat(selectedDM || "".concat(selectedHaven, "__").concat(selectedChannel));
        fetch("/api/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room: room, action: "pin", messageId: id, pin: pin })
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {
            var _a;
            if (data.message) {
                setMessages(function (prev) { return prev.map(function (m) { return m.id === id ? data.message : m; }); });
                (_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.emit("pin", { room: room, message: data.message });
            }
        });
    };
    // Edit history viewer
    var _50 = (0, react_1.useState)(null), showEditHistory = _50[0], setShowEditHistory = _50[1];
    var openEditHistory = function (id) { return __awaiter(_this, void 0, void 0, function () {
        var room, r, d;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    room = "".concat(selectedDM || "".concat(selectedHaven, "__").concat(selectedChannel));
                    return [4 /*yield*/, fetch("/api/history", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room: room, action: 'history', messageId: id }) })];
                case 1:
                    r = _a.sent();
                    return [4 /*yield*/, r.json()];
                case 2:
                    d = _a.sent();
                    if (d.success)
                        setShowEditHistory({ id: id, items: d.history || [] });
                    return [2 /*return*/];
            }
        });
    }); };
    var handleHavenChange = function (haven) {
        setSelectedHaven(haven);
        // Default to first channel in haven
        setSelectedChannel(havens[haven][0] || "");
    };
    var handleChannelChange = function (channel) {
        setSelectedChannel(channel);
    };
    var createInvite = function () { return __awaiter(_this, void 0, void 0, function () {
        var res, data, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!selectedHaven || selectedHaven === '__dms__' || creatingInvite)
                        return [2 /*return*/];
                    setCreatingInvite(true);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 10, 11, 12]);
                    return [4 /*yield*/, fetch("/api/invite", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                haven: selectedHaven,
                                days: inviteDays,
                                maxUses: inviteMaxUses,
                            }),
                        })];
                case 2:
                    res = _c.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    data = _c.sent();
                    if (!(!res.ok || !data.code)) return [3 /*break*/, 4];
                    notify({ title: "Invite error", body: (data === null || data === void 0 ? void 0 : data.error) || "Could not create invite", type: "error" });
                    return [3 /*break*/, 9];
                case 4:
                    setInviteCode(data.code);
                    _c.label = 5;
                case 5:
                    _c.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, navigator.clipboard.writeText(data.code)];
                case 6:
                    _c.sent();
                    return [3 /*break*/, 8];
                case 7:
                    _a = _c.sent();
                    return [3 /*break*/, 8];
                case 8:
                    notify({ title: "Invite created", body: data.code, type: "success" });
                    _c.label = 9;
                case 9: return [3 /*break*/, 12];
                case 10:
                    _b = _c.sent();
                    notify({ title: "Invite error", body: "Could not create invite", type: "error" });
                    return [3 /*break*/, 12];
                case 11:
                    setCreatingInvite(false);
                    return [7 /*endfinally*/];
                case 12: return [2 /*return*/];
            }
        });
    }); };
    var handleCreateChannel = function (e) {
        if (e)
            e.preventDefault();
        var name = newChannel.trim().replace(/\s+/g, "-").toLowerCase();
        if (name && !havens[selectedHaven].includes(name)) {
            setHavens(function (prev) {
                var _a;
                return (__assign(__assign({}, prev), (_a = {}, _a[selectedHaven] = __spreadArray(__spreadArray([], prev[selectedHaven], true), [name], false), _a)));
            });
            setNewChannel("");
            setSelectedChannel(name);
            setShowNewChannelModal(false);
        }
    };
    var handleCreateHaven = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var raw, name, upper, res, data, hName_1, _a, found, _i, _b, h;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (e)
                        e.preventDefault();
                    raw = newHaven.trim();
                    name = raw.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 24);
                    if (!raw)
                        return [2 /*return*/];
                    if (!(havenAction === 'join')) return [3 /*break*/, 6];
                    upper = raw.toUpperCase();
                    if (!upper.startsWith('CHINV-')) return [3 /*break*/, 5];
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch("/api/invite", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "consume", code: raw }),
                        })];
                case 2:
                    res = _c.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    data = _c.sent();
                    if (res.ok && (data === null || data === void 0 ? void 0 : data.haven)) {
                        hName_1 = String(data.haven);
                        if (!havens[hName_1]) {
                            setHavens(function (prev) {
                                var _a;
                                return (__assign(__assign({}, prev), (_a = {}, _a[hName_1] = ["general"], _a)));
                            });
                        }
                        setSelectedHaven(hName_1);
                        setSelectedChannel((havens[hName_1] && havens[hName_1][0]) || "general");
                        setNewHaven("");
                        setShowNewHavenModal(false);
                        return [2 /*return*/];
                    }
                    notify({ title: 'Invite invalid', body: (data === null || data === void 0 ? void 0 : data.error) || 'Invite expired or exhausted', type: 'error' });
                    return [2 /*return*/];
                case 4:
                    _a = _c.sent();
                    notify({ title: 'Invite error', body: 'Could not reach invite server', type: 'error' });
                    return [2 /*return*/];
                case 5:
                    // Try direct haven name first
                    if (name && havens[name]) {
                        setSelectedHaven(name);
                        setSelectedChannel(havens[name][0] || 'general');
                        setNewHaven("");
                        setShowNewHavenModal(false);
                        return [2 /*return*/];
                    }
                    found = null;
                    for (_i = 0, _b = Object.keys(havens); _i < _b.length; _i++) {
                        h = _b[_i];
                        if (havenCode(h) === upper) {
                            found = h;
                            break;
                        }
                    }
                    if (found) {
                        setSelectedHaven(found);
                        setSelectedChannel(havens[found][0] || 'general');
                        setNewHaven("");
                        setShowNewHavenModal(false);
                        return [2 /*return*/];
                    }
                    notify({ title: 'Haven not found', body: "No haven, invite code, or link \"".concat(raw, "\" exists on this client."), type: 'warn' });
                    return [2 /*return*/];
                case 6:
                    if (!havens[name]) {
                        setHavens(function (prev) {
                            var _a;
                            return (__assign(__assign({}, prev), (_a = {}, _a[name] = ["general"], _a)));
                        });
                    }
                    setSelectedHaven(name);
                    setSelectedChannel("general");
                    setNewHaven("");
                    setShowNewHavenModal(false);
                    return [2 /*return*/];
            }
        });
    }); };
    // Typing + mentions
    var _51 = (0, react_1.useState)(false), mentionOpen = _51[0], setMentionOpen = _51[1];
    var _52 = (0, react_1.useState)(""), mentionQuery = _52[0], setMentionQuery = _52[1];
    var _53 = (0, react_1.useState)([]), mentionList = _53[0], setMentionList = _53[1];
    (0, react_1.useEffect)(function () {
        var ignore = false;
        if (!mentionOpen)
            return;
        var q = mentionQuery.trim();
        (function () { return __awaiter(_this, void 0, void 0, function () {
            var res, data, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, fetch("/api/user-search?q=".concat(encodeURIComponent(q)))];
                    case 1:
                        res = _b.sent();
                        return [4 /*yield*/, res.json()];
                    case 2:
                        data = _b.sent();
                        if (!ignore)
                            setMentionList(Array.isArray(data.results) ? data.results : []);
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _b.sent();
                        if (!ignore)
                            setMentionList([]);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); })();
        return function () { ignore = true; };
    }, [mentionOpen, mentionQuery]);
    var handleInputChange = function (e) {
        var _a;
        setInput(e.target.value);
        var room = roomKey();
        try {
            localStorage.setItem("draft:".concat(room), e.target.value);
        }
        catch (_b) { }
        (_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.emit("typing", { user: username, room: room });
    };
    // Load draft on room change
    (0, react_1.useEffect)(function () {
        var room = roomKey();
        try {
            var saved = localStorage.getItem("draft:".concat(room));
            if (saved != null)
                setInput(saved);
            else
                setInput("");
        }
        catch (_a) {
            setInput("");
        }
        setNewSinceScroll(0);
        setIsAtBottom(true);
    }, [selectedHaven, selectedChannel, selectedDM]);
    // Upload helpers
    var startUpload = function (file) { return __awaiter(_this, void 0, void 0, function () {
        var id, localUrl;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : "".concat(Date.now(), "-").concat(Math.random().toString(36).slice(2));
                    localUrl = URL.createObjectURL(file);
                    setUploadItems(function (prev) { return __spreadArray(__spreadArray([], prev, true), [{ id: id, name: file.name, type: file.type || 'application/octet-stream', size: file.size, progress: 0, status: 'uploading', localUrl: localUrl }], false); });
                    return [4 /*yield*/, doUpload(file.name, file.type, file, id)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    var doUpload = function (name, type, blob, id) { return __awaiter(_this, void 0, void 0, function () {
        var reader, dataUrl;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    reader = new FileReader();
                    return [4 /*yield*/, new Promise(function (resolve, reject) { reader.onload = function () { return resolve(String(reader.result)); }; reader.onerror = reject; reader.readAsDataURL(blob); })];
                case 1:
                    dataUrl = _a.sent();
                    return [4 /*yield*/, new Promise(function (resolveUp) {
                            var xhr = new XMLHttpRequest();
                            xhr.open('POST', '/api/upload');
                            xhr.setRequestHeader('Content-Type', 'application/json');
                            xhr.upload.onprogress = function (ev) { if (ev.lengthComputable) {
                                var pct_1 = Math.min(100, Math.round((ev.loaded / ev.total) * 100));
                                setUploadItems(function (prev) { return prev.map(function (u) { return u.id === id ? __assign(__assign({}, u), { progress: pct_1 }) : u; }); });
                            } };
                            xhr.onreadystatechange = function () { if (xhr.readyState === 4) {
                                try {
                                    var json_1 = JSON.parse(xhr.responseText || '{}');
                                    if (xhr.status >= 200 && xhr.status < 300) {
                                        setPendingFiles(function (prev) { return __spreadArray(__spreadArray([], prev, true), [{ url: json_1.url, name: json_1.name, type: json_1.type, size: json_1.size }], false); });
                                        setUploadItems(function (prev) { return prev.filter(function (u) { return u.id !== id; }); });
                                    }
                                    else {
                                        setUploadItems(function (prev) { return prev.map(function (u) { return u.id === id ? __assign(__assign({}, u), { status: 'error' }) : u; }); });
                                    }
                                }
                                catch (_a) {
                                    setUploadItems(function (prev) { return prev.map(function (u) { return u.id === id ? __assign(__assign({}, u), { status: 'error' }) : u; }); });
                                }
                                resolveUp();
                            } };
                            xhr.send(JSON.stringify({ name: name, data: dataUrl, type: type }));
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    // Hover state for message hover controls + shift key tracking used elsewhere in the component
    var _54 = (0, react_1.useState)(null), hoveredMsg = _54[0], setHoveredMsgState = _54[1];
    var _55 = (0, react_1.useState)(false), shiftDown = _55[0], setShiftDown = _55[1];
    (0, react_1.useEffect)(function () {
        var onKeyDown = function (e) { if (e.key === "Shift")
            setShiftDown(true); };
        var onKeyUp = function (e) { if (e.key === "Shift")
            setShiftDown(false); };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        return function () {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, []);
    // Provide a compatible setter used throughout the component.
    // Accepts either a string (id) or an updater function like React's setState.
    var setHoveredMsg = function (idOrUpdater) {
        if (typeof idOrUpdater === "function") {
            setHoveredMsgState(function (prev) { return idOrUpdater(prev); });
        }
        else {
            setHoveredMsgState(idOrUpdater);
        }
    };
    return (<div className="ch-shell" style={{
            display: "flex",
            height: isMobile ? "calc(100vh - 1rem)" : "70vh",
            width: "100%",
            maxWidth: isMobile ? "100%" : 1100,
            minWidth: 320,
            margin: isMobile ? "0.5rem auto" : "2rem auto",
            border: "1px solid #2a3344",
            borderRadius: isMobile ? 10 : 14,
            background: "linear-gradient(180deg, rgba(15,23,42,0.85), rgba(17,24,39,0.82))",
            boxShadow: isMobile ? "0 8px 24px rgba(0,0,0,0.4)" : "0 12px 40px rgba(0,0,0,0.35)",
            filter: isBooting ? 'blur(4px)' : 'none',
            pointerEvents: isBooting ? 'none' : 'auto'
        }}>
      {/* Havens sidebar */}
      <aside style={{ width: compactSidebar ? 120 : 160, background: '#0b1222', borderRight: '1px solid #1f2937', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #111827', color: '#e5e7eb', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faServer}/> {labelHavens}</span>
          {selectedHaven !== '__dms__' && permState.canManageServer && (<button title="Server Settings" style={{ background: 'none', border: '1px solid #1f2937', borderRadius: 8, color: accent, cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center' }} onClick={function () { return setShowServerSettings(true); }}>
              <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faGear}/>
            </button>)}
        </div>
        <div style={{ padding: 10, borderBottom: '1px solid #111827' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0f172a', border: '1px solid #1f2937', borderRadius: 8, padding: '6px 8px' }}>
            <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faMagnifyingGlass} style={{ color: '#9ca3af' }}/>
            <input value={havenFilter} onChange={function (e) { return setHavenFilter(e.target.value); }} placeholder="Search havens" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e5e7eb', fontSize: 13 }}/>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          <div key="__dms__" onClick={function () { setSelectedHaven('__dms__'); setSelectedChannel(''); setSelectedDM(null); }} title="Direct Messages" style={{ padding: '10px 10px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: selectedHaven === '__dms__' ? '#111a2e' : '#0b1222', color: selectedHaven === '__dms__' ? accent : '#e5e7eb', fontWeight: selectedHaven === '__dms__' ? 700 : 500, border: '1px solid #1f2937', borderLeft: selectedHaven === '__dms__' ? "3px solid ".concat(accent) : '3px solid transparent', borderRadius: 10 }}>
            <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faEnvelope}/> <span>Direct Messages</span>
          </div>
          {Object.keys(havens)
            .filter(function (h) { return h.toLowerCase().includes(havenFilter.trim().toLowerCase()); })
            .map(function (haven) { return (<div key={haven} onClick={function () { return handleHavenChange(haven); }} title={"".concat(labelHaven, " ").concat(haven, " \u00B7 Code: ").concat(havenCode(haven))} style={{ padding: '10px 10px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: selectedHaven === haven ? '#111a2e' : '#0b1222', color: selectedHaven === haven ? accent : '#e5e7eb', fontWeight: selectedHaven === haven ? 700 : 500, border: '1px solid #1f2937', borderLeft: selectedHaven === haven ? "3px solid ".concat(accent) : '3px solid transparent', borderRadius: 10 }}>
                <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faServer}/> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{haven}</span>
              </div>); })}
        </div>
        <div style={{ padding: 10, borderTop: '1px solid #111827' }}>
          <button type="button" className="btn-ghost" title="Join or create haven" onClick={function () { setNewHaven(""); setNewHavenType('standard'); setHavenAction('create'); setShowNewHavenModal(true); }} style={{ width: '100%', justifyContent: 'center', padding: '8px 10px', color: accent, borderRadius: 8, border: '1px solid #1f2937', background: '#020617' }}>
            <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faPlus} style={{ marginRight: 6 }}/> New Haven
          </button>
        </div>
      </aside>
      {/* Channels / DMs sidebar */}
      <aside style={{ width: compactSidebar ? 180 : 220, background: '#0f172a', borderRight: '1px solid #1f2937', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #111827', color: '#e5e7eb', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <react_fontawesome_1.FontAwesomeIcon icon={selectedHaven === "__dms__" ? free_solid_svg_icons_1.faEnvelope : free_solid_svg_icons_1.faHashtag}/>
            {selectedHaven === "__dms__" ? 'Direct Messages' : 'Channels'}
          </span>
          {selectedHaven !== "__dms__" && (<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button type="button" className="btn-ghost" onClick={function () { return setShowInvitePanel(function (v) { return !v; }); }} title="Create invite" style={{ padding: '4px 6px' }}>
                <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faEnvelope}/>
              </button>
              {inviteCode && (<button type="button" className="btn-ghost" onClick={function () { return __awaiter(_this, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, navigator.clipboard.writeText(inviteCode)];
                    case 1:
                        _b.sent();
                        notify({ title: 'Invite copied', body: inviteCode, type: 'info' });
                        return [3 /*break*/, 3];
                    case 2:
                        _a = _b.sent();
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            }); }); }} title="Copy last invite code" style={{ padding: '4px 6px', fontSize: 11 }}>
                  Copy
                </button>)}
            </div>)}
        </div>
        <div style={{ padding: 10, borderBottom: '1px solid #111827' }}>
          {showInvitePanel && selectedHaven !== '__dms__' && (<div style={{ marginBottom: 8, padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#020617', color: '#e5e7eb', fontSize: 12 }}>
              <div style={{ marginBottom: 6 }}>Invite to <span style={{ color: accent }}>{selectedHaven}</span></div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: '#9ca3af' }}>Expires in:</span>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {[1, 7, 30, 0].map(function (d) { return (<button key={d} type="button" className="btn-ghost" onClick={function () { return setInviteDays(d); }} style={{
                    padding: '2px 6px',
                    fontSize: 11,
                    borderRadius: 999,
                    border: inviteDays === d ? "1px solid ".concat(accent) : '1px solid #1f2937',
                    color: inviteDays === d ? accent : '#e5e7eb'
                }}>
                      {d === 0 ? 'Never' : "".concat(d, "d")}
                    </button>); })}
                </div>
              </div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: '#9ca3af' }}>Max uses:</span>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {[1, 5, 10, 0].map(function (n) { return (<button key={n} type="button" className="btn-ghost" onClick={function () { return setInviteMaxUses(n); }} style={{
                    padding: '2px 6px',
                    fontSize: 11,
                    borderRadius: 999,
                    border: inviteMaxUses === n ? "1px solid ".concat(accent) : '1px solid #1f2937',
                    color: inviteMaxUses === n ? accent : '#e5e7eb'
                }}>
                      {n === 0 ? 'Unlimited' : n}
                    </button>); })}
                </div>
              </div>
              <button type="button" className="btn-ghost" onClick={createInvite} disabled={creatingInvite} style={{ padding: '4px 8px', fontSize: 12, color: accent, opacity: creatingInvite ? 0.7 : 1 }}>
                {creatingInvite ? 'Creating…' : 'Generate Invite'}
              </button>
              {inviteCode && (<div style={{ marginTop: 6, color: '#9ca3af' }}>Last invite: <span style={{ color: '#e5e7eb' }}>{inviteCode}</span></div>)}
            </div>)}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0b1222', border: '1px solid #1f2937', borderRadius: 8, padding: '6px 8px' }}>
            <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faMagnifyingGlass} style={{ color: '#9ca3af' }}/>
            {selectedHaven === "__dms__" ? (<input value={dmFilter} onChange={function (e) { return setDmFilter(e.target.value); }} placeholder="Search DMs" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e5e7eb', fontSize: 13 }}/>) : (<input value={channelFilter} onChange={function (e) { return setChannelFilter(e.target.value); }} placeholder="Search channels" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e5e7eb', fontSize: 13 }}/>)}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {selectedHaven === "__dms__" ? (<>
              <div key="friends-home" onClick={function () { return setSelectedDM(null); }} style={{ padding: '10px 12px', cursor: 'pointer', background: selectedDM === null ? '#111a2e' : 'transparent', color: selectedDM === null ? accent : '#e5e7eb', fontWeight: selectedDM === null ? 700 : 500, borderRadius: 10, border: selectedDM === null ? '1px solid #1f2937' : '1px solid transparent', marginBottom: 6 }}>
                <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faEnvelope}/> Friends
              </div>
              {dms.length === 0 ? (<div style={{ color: '#9ca3af', padding: 12 }}>No DMs yet.</div>) : (dms
                .filter(function (dm) { return dm.users.filter(function (u) { return u !== username; }).join(', ').toLowerCase().includes(dmFilter.trim().toLowerCase()); })
                .map(function (dm) {
                var others = dm.users.filter(function (u) { return u !== username; });
                var status = statusColor(presenceMap[others[0]]);
                return (<div key={dm.id} onClick={function () { setSelectedDM(dm.id); }} onContextMenu={function (e) { return openCtx(e, { type: 'dm', data: dm }); }} style={{ padding: '10px 12px', cursor: 'pointer', background: selectedDM === dm.id ? '#111a2e' : 'transparent', color: selectedDM === dm.id ? accent : '#e5e7eb', fontWeight: selectedDM === dm.id ? 700 : 500, borderRadius: 10, border: selectedDM === dm.id ? '1px solid #1f2937' : '1px solid transparent', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: status }}/>
                        <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faUsers}/> {others.join(', ')}
                      </div>);
            }))}
            </>) : ((havens[selectedHaven] || [])
            .filter(function (ch) { return ch.toLowerCase().includes(channelFilter.trim().toLowerCase()); })
            .map(function (ch) { return (<div key={ch} onClick={function () { setSelectedDM(null); handleChannelChange(ch); }} onContextMenu={function (e) { return openCtx(e, { type: 'channel', data: ch }); }} style={{ padding: '10px 12px', cursor: 'pointer', background: selectedChannel === ch ? '#111a2e' : 'transparent', color: selectedChannel === ch ? accent : '#e5e7eb', fontWeight: selectedChannel === ch ? 700 : 500, borderRadius: 10, border: selectedChannel === ch ? '1px solid #1f2937' : '1px solid transparent', marginBottom: 6 }}>
                  <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faHashtag}/> #{ch}
                </div>); }))}
        </div>
        {selectedHaven !== "__dms__" && permState.canManageChannels && (<div style={{ padding: 12, borderTop: '1px solid #111827', background: '#0f172a' }}>
            <button type="button" className="btn-ghost" title="Create channel" onClick={function () { setNewChannel(""); setNewChannelType('text'); setShowNewChannelModal(true); }} style={{ width: '100%', justifyContent: 'center', padding: '8px 10px', color: accent, borderRadius: 8, border: '1px solid #1f2937', background: '#020617' }}>
              <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faPlus} style={{ marginRight: 6 }}/> New Channel
            </button>
          </div>)}
      </aside>
      {/* Main chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: 'relative' }}>
        <div style={{ padding: 16, borderBottom: "1px solid #333", color: "#fff", fontWeight: 600, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          {isMobile && (<button className="btn-ghost" onClick={function () { return setShowMobileNav(true); }} title="Open navigation" style={{ padding: '6px 8px' }}>
              <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faBars}/>
            </button>)}
          {selectedHaven === "__dms__" && !selectedDM ? (<>
              <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faEnvelope}/> Friends
              <div style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
                <button className="btn-ghost" onClick={function () { return setFriendsTab('all'); }} style={{ padding: '6px 10px', color: friendsTab === 'all' ? '#93c5fd' : undefined }}>All</button>
                <button className="btn-ghost" onClick={function () { return setFriendsTab('online'); }} style={{ padding: '6px 10px', color: friendsTab === 'online' ? '#93c5fd' : undefined }}>Online</button>
                <button className="btn-ghost" onClick={function () { return setFriendsTab('pending'); }} style={{ padding: '6px 10px', color: friendsTab === 'pending' ? '#93c5fd' : undefined }}>Pending</button>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                {showAddFriend && (<form onSubmit={function (e) { e.preventDefault(); var t = addFriendName.trim(); if (t) {
                friendAction('request', t);
                setAddFriendName('');
                setShowAddFriend(false);
            } }} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input value={addFriendName} onChange={function (e) { return setAddFriendName(e.target.value); }} placeholder="Add friend by username" className="input-dark" style={{ padding: '6px 8px', width: 220 }}/>
                    <button className="btn-ghost" type="submit" style={{ padding: '6px 10px' }}><react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faPlus}/> Add</button>
                  </form>)}
                {!showAddFriend && (<button className="btn-ghost" onClick={function () { return setShowAddFriend(true); }} title="Add Friend" style={{ padding: '6px 10px' }}>
                    <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faPlus}/> Add Friend
                  </button>)}
                {userSettings.showOnlineCount !== false && (function () {
                var onlineUsers = Object.entries(presenceMap)
                    .filter(function (_a) {
                    var _ = _a[0], s = _a[1];
                    return s && s !== 'offline';
                })
                    .map(function (_a) {
                    var u = _a[0];
                    return u;
                })
                    .sort();
                var title = onlineUsers.length
                    ? "Online (".concat(onlineUsers.length, "): ").concat(onlineUsers.join(', '))
                    : 'Online: 0';
                return (<span className="btn-ghost" style={{ padding: '6px 8px', color: '#9ca3af' }} title={title}>
                      <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faUsers}/> {onlineCount}
                    </span>);
            })()}
                <button className="btn-ghost" onClick={function () { return setShowUserSettings(true); }} title="User settings" style={{ padding: '6px 8px' }}>
                  <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faGear}/>
                </button>
              </div>
            </>) : selectedHaven === "__dms__" && selectedDM ? ((function () {
            var dm = dms.find(function (d) { return d.id === selectedDM; });
            var others = dm ? dm.users.filter(function (u) { return u !== username; }) : [];
            var title = others.join(', ') || 'Direct Message';
            var dotColor = statusColor(presenceMap[others[0]]);
            return (<>
                  <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faEnvelope}/>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: dotColor, display: 'inline-block', marginLeft: 8, marginRight: 6 }}/>
                  <span style={{ color: accent }}>{title}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                    {callsEnabled && (<button className="btn-ghost" onClick={startCall} title={callState === 'in-call' ? 'Already in call' : 'Start voice call'} style={{ padding: '6px 8px', color: callState === 'in-call' ? '#22c55e' : undefined }}>
                        <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faPhone}/>
                      </button>)}
                    {userSettings.showOnlineCount !== false && (function () {
                    var onlineUsers = Object.entries(presenceMap)
                        .filter(function (_a) {
                        var _ = _a[0], s = _a[1];
                        return s && s !== 'offline';
                    })
                        .map(function (_a) {
                        var u = _a[0];
                        return u;
                    })
                        .sort();
                    var title = onlineUsers.length
                        ? "Online (".concat(onlineUsers.length, "): ").concat(onlineUsers.join(', '))
                        : 'Online: 0';
                    return (<span className="btn-ghost" style={{ padding: '6px 8px', color: '#9ca3af' }} title={title}>
                          <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faUsers}/> {onlineCount}
                        </span>);
                })()}
                    <button className="btn-ghost" onClick={function () { return setShowPinned(true); }} title="Pinned messages" style={{ padding: '6px 8px' }}>
                      <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faThumbtack}/>
                    </button>
                    <button className="btn-ghost" onClick={function () { return setShowUserSettings(true); }} title="User settings" style={{ padding: '6px 8px' }}>
                      <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faGear}/>
                    </button>
                  </div>
                </>);
        })()) : (<>
              <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faServer}/> {selectedHaven} {selectedChannel && (<span style={{ color: accent }}>/ #{selectedChannel}</span>)}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                {userSettings.showOnlineCount !== false && (function () {
                var onlineUsers = Object.entries(presenceMap)
                    .filter(function (_a) {
                    var _ = _a[0], s = _a[1];
                    return s && s !== 'offline';
                })
                    .map(function (_a) {
                    var u = _a[0];
                    return u;
                })
                    .sort();
                var title = onlineUsers.length
                    ? "Online (".concat(onlineUsers.length, "): ").concat(onlineUsers.join(', '))
                    : 'Online: 0';
                return (<button type="button" className="btn-ghost" onClick={function () { return setShowMembers(function (v) { return !v; }); }} title={title} style={{ padding: '6px 8px', color: '#9ca3af' }}>
                      <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faUsers}/> {onlineCount}
                    </button>);
            })()}
                <button className="btn-ghost" onClick={function () { return setShowPinned(true); }} title="Pinned messages" style={{ padding: '6px 8px' }}>
                  <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faThumbtack}/>
                </button>
                <button className="btn-ghost" onClick={function () { return setShowUserSettings(true); }} title="User settings" style={{ padding: '6px 8px' }}>
                  <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faGear}/>
                </button>
              </div>
            </>)}
        </div>
        <div style={{
            flex: 1,
            overflowY: "auto",
            background: userSettings.chatStyle === 'classic' ? "#0f172a" : "linear-gradient(180deg, rgba(15,23,42,0.45), rgba(17,24,39,0.35))",
            padding: compact ? 12 : 16,
            color: "#fff",
            borderRadius: 0,
            minHeight: 0,
            position: 'relative'
        }} ref={chatScrollRef} onScroll={function (e) {
            var el = e.currentTarget;
            var atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
            setIsAtBottom(atBottom);
            if (atBottom)
                setNewSinceScroll(0);
        }} onDragOver={function (e) { e.preventDefault(); }} onDrop={function (e) { return __awaiter(_this, void 0, void 0, function () { var files, _i, files_1, f; var _a; return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                e.preventDefault();
                files = Array.from(((_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.files) || []);
                _i = 0, files_1 = files;
                _b.label = 1;
            case 1:
                if (!(_i < files_1.length)) return [3 /*break*/, 4];
                f = files_1[_i];
                if (f.size > 25 * 1024 * 1024) {
                    alert("File ".concat(f.name, " exceeds 25MB limit"));
                    return [3 /*break*/, 3];
                }
                return [4 /*yield*/, startUpload(f)];
            case 2:
                _b.sent();
                _b.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4: return [2 /*return*/];
        }
    }); }); }}>
          {selectedHaven === "__dms__" && selectedDM && activeCallDM === selectedDM && callState !== 'idle' && (<div style={{ marginBottom: 8, padding: 8, borderRadius: 8, background: '#111827', border: '1px solid #1f2937', fontSize: 12, color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: '#22c55e', display: 'inline-block' }}/>
              <span>Voice call in progress</span>
              <span style={{ marginLeft: 'auto', color: '#a5b4fc' }}>
                {"".concat(Math.floor(callElapsed / 60)
                .toString()
                .padStart(1, '0'), ":").concat((callElapsed % 60).toString().padStart(2, '0'))}
              </span>
            </div>)}
          {showTipsBanner && !(selectedHaven === "__dms__" && !selectedDM) && (<div style={{ marginBottom: 12, padding: 10, borderRadius: 10, border: '1px solid #1f2937', background: 'rgba(15,23,42,0.9)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ fontSize: 18, marginTop: 2 }}>
                <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faServer}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Welcome to ChitterHaven</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                  Right-click messages for more actions, Shift+hover to see moderation tools, and use Ctrl/Cmd+K for the quick switcher.
                </div>
              </div>
              <button type="button" className="btn-ghost" onClick={dismissTips} style={{ padding: '4px 8px', fontSize: 12 }}>
                Got it
              </button>
            </div>)}
          {selectedHaven === "__dms__" && !selectedDM ? (<div>
              {friendsTab !== 'pending' && (<div>
                  {(function () {
                    var list = friendsTab === 'online'
                        ? friendsState.friends.filter(function (u) { return (presenceMap[u] || 'offline') !== 'offline'; })
                        : friendsState.friends;
                    if (list.length === 0)
                        return <div style={{ color: '#94a3b8' }}>No friends {friendsTab === 'online' ? 'online' : 'yet'}.</div>;
                    return list.map(function (u) { return (<div key={u} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #1f2937', background: '#0b1222', borderRadius: 10, marginBottom: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 999, background: statusColor(presenceMap[u]), display: 'inline-block' }}/>
                        <span style={{ fontWeight: 600 }}>{u}</span>
                        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                          <button className="btn-ghost" onClick={function () { return ensureDM(u); }} style={{ padding: '6px 10px' }}>Message</button>
                          <button className="btn-ghost" onClick={function () { return friendAction('remove', u); }} style={{ padding: '6px 10px', color: '#f87171' }}>Remove</button>
                        </span>
                      </div>); });
                })()}
                </div>)}
              {friendsTab === 'pending' && (<div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <div style={{ color: '#93c5fd', fontSize: 12, marginBottom: 6 }}>Incoming</div>
                    {friendsState.incoming.length === 0 ? (<div style={{ color: '#94a3b8' }}>No incoming requests.</div>) : (friendsState.incoming.map(function (u) { return (<div key={u} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #1f2937', background: '#0b1222', borderRadius: 10, marginBottom: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 999, background: statusColor(presenceMap[u]), display: 'inline-block' }}/>
                          <span style={{ fontWeight: 600 }}>{u}</span>
                          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                            <button className="btn-ghost" onClick={function () { return friendAction('accept', u); }} style={{ padding: '6px 10px', color: '#22c55e' }}>Accept</button>
                            <button className="btn-ghost" onClick={function () { return friendAction('decline', u); }} style={{ padding: '6px 10px', color: '#f87171' }}>Decline</button>
                          </span>
                        </div>); }))}
                  </div>
                  <div>
                    <div style={{ color: '#93c5fd', fontSize: 12, marginBottom: 6 }}>Outgoing</div>
                    {friendsState.outgoing.length === 0 ? (<div style={{ color: '#94a3b8' }}>No outgoing requests.</div>) : (friendsState.outgoing.map(function (u) { return (<div key={u} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #1f2937', background: '#0b1222', borderRadius: 10, marginBottom: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 999, background: statusColor(presenceMap[u]), display: 'inline-block' }}/>
                          <span style={{ fontWeight: 600 }}>{u}</span>
                          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                            <button className="btn-ghost" onClick={function () { return friendAction('cancel', u); }} style={{ padding: '6px 10px', color: '#f59e0b' }}>Cancel</button>
                          </span>
                        </div>); }))}
                  </div>
                </div>)}
            </div>) : (<>
          {messages.map(function (msg, idx) { return (<div key={msg.id || "".concat(msg.user, "-").concat(msg.timestamp, "-").concat(idx)} ref={function (el) { if (msg.id)
                messageRefs.current[msg.id] = el; }} onContextMenu={function (e) { return openCtx(e, { type: 'message', id: msg.id }); }} style={{ marginBottom: compact ? 10 : 16, position: "relative", padding: compact ? 6 : 8, borderRadius: 6, background: "#23232a", transition: "background 0.2s", borderLeft: msg.pinned ? "3px solid ".concat(pinColor) : "3px solid transparent" }} onMouseEnter={function () { return setHoveredMsg(msg.id); }} onMouseLeave={function () { return setHoveredMsg(function (prev) { return prev === msg.id ? null : prev; }); }}>
              {/* In-box actions: show on hover. By default: Reply, React, More; with Shift: show all */}
              {hoveredMsg === msg.id && (<div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 6 }}>
                  <button onClick={function () { return handleReply(msg); }} className="btn-ghost" title="Reply" style={{ padding: '2px 6px' }}>
                    <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faReply}/>
                  </button>
                  {permState.canReact && (<button onClick={function () { return setPickerFor(function (p) { return p === msg.id ? null : msg.id; }); }} className="btn-ghost" title="Add Reaction" style={{ padding: '2px 6px' }}>
                      <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faFaceSmile}/>
                    </button>)}
                  {!shiftDown ? (<button onClick={function (e) { e.preventDefault(); setCtxMenu({ open: true, x: e.clientX, y: e.clientY, target: { type: 'message', id: msg.id } }); }} className="btn-ghost" title="More" style={{ padding: '2px 6px' }}>
                      <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faBars}/>
                    </button>) : (<>
                      {permState.canPin && (<button onClick={function () { return togglePin(msg.id, !msg.pinned); }} className="btn-ghost" title={msg.pinned ? 'Unpin' : 'Pin'} style={{ padding: '2px 6px' }}>
                          <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faThumbtack}/>
                        </button>)}
                      <button onClick={function () { return openEditHistory(msg.id); }} className="btn-ghost" title="Edit history" style={{ padding: '2px 6px' }}>
                        <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faClockRotateLeft}/>
                      </button>
                      {((msg.user === username && msg.systemType !== 'call-summary') || permState.canManageMessages) && (<>
                          {msg.user === username && msg.systemType !== 'call-summary' && (<button onClick={function () { return handleEdit(msg.id, msg.text); }} className="btn-ghost" title="Edit" style={{ padding: '2px 6px' }}>
                              <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faEdit}/>
                            </button>)}
                          <button onClick={function () { return handleDelete(msg.id); }} className="btn-ghost" title="Delete" style={{ padding: '2px 6px', color: boldColor }}>
                            <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faTrash}/>
                          </button>
                        </>)}
                    </>)}
                </div>)}
              <div style={{ fontSize: msgFontSize - 1, color: "#a1a1aa", marginBottom: compact ? 4 : 6, wordBreak: "break-word", whiteSpace: "pre-line", display: 'flex', alignItems: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: statusColor(presenceMap[msg.user]), marginRight: 6 }}/>
                <button onClick={function () { setProfileUser(msg.user); setProfileContext(selectedHaven !== '__dms__' ? 'Viewing Haven Profile' : undefined); }} style={{ color: accent, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>{msg.user}</button>
                {showTimestamps && (<span style={{ marginLeft: 8, fontSize: 11, color: "#666" }}>{new Date(msg.timestamp).toLocaleTimeString()}</span>)}
                {msg.edited && <span style={{ marginLeft: 6, fontSize: 10, color: "#facc15" }}>(edited)</span>}
              </div>
              {msg.replyToId && (function () {
                    var parent = messages.find(function (m) { return m.id === msg.replyToId; });
                    if (!parent)
                        return null;
                    return (<div onClick={function () { var el = messageRefs.current[msg.replyToId]; el === null || el === void 0 ? void 0 : el.scrollIntoView({ behavior: "smooth", block: "center" }); }} style={{ fontSize: 12, color: "#94a3b8", background: "#0b1222", border: "1px solid #1f2937", borderRadius: 6, padding: 6, marginBottom: 6, cursor: "pointer" }}>
                    <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faReply} style={{ marginRight: 6 }}/> Replying to <strong>@{parent.user}</strong>: <span style={{ opacity: 0.8 }}>{parent.text.slice(0, 64)}{parent.text.length > 64 ? "..." : ""}</span>
                  </div>);
                })()}
              {editId === msg.id ? (<div style={{ display: "flex", gap: 8 }}>
                  <input value={editText} onChange={function (e) { return setEditText(e.target.value); }} style={{ flex: 1, background: "#18181b", color: "#fff", border: "1px solid #333", borderRadius: 4, padding: 4, fontSize: 14 }}/>
                  <button onClick={function () { return handleEditSubmit(msg.id); }} style={{ background: "#60a5fa", color: "#fff", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>Save</button>
                  <button onClick={function () { return setEditId(null); }} style={{ background: "#23232a", color: "#fff", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>Cancel</button>
                </div>) : (<div style={{ wordBreak: "break-word", whiteSpace: "pre-line", fontSize: msgFontSize, fontFamily: monospaceMessages ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' : undefined }}>
                  {(function () {
                        var _a, _b;
                        var base = (_b = (_a = chResolved[msg.id]) !== null && _a !== void 0 ? _a : msg.text) !== null && _b !== void 0 ? _b : "";
                        var withMentions = base.replace(new RegExp("@".concat(username, "\\b"), 'g'), "**[@".concat(username, "](mention://self)**"));
                        return (<react_markdown_1.default components={{
                                a: function (props) {
                                    var href = props.href || '';
                                    if (href === 'mention://self') {
                                        return <span style={{ color: mentionColor, fontWeight: 600 }}>{props.children}</span>;
                                    }
                                    return <a {...props} style={{ color: accent }}/>;
                                },
                                code: function (props) { return <code {...props} style={{ background: "#23232a", color: pinColor, padding: "2px 4px", borderRadius: 4 }}/>; },
                                strong: function (props) { return <strong {...props} style={{ color: boldColor }}/>; },
                                em: function (props) { return <em {...props} style={{ color: italicColor }}/>; },
                                blockquote: function (props) { return <blockquote {...props} style={{ borderLeft: "3px solid ".concat(accent), margin: 0, paddingLeft: 12, color: "#a1a1aa" }}/>; },
                                img: function (props) { return (
                                // Right-click images in markdown to set avatar/banner
                                <img {...props} onContextMenu={function (e) {
                                        e.preventDefault();
                                        var src = props.src || '';
                                        var alt = props.alt || '';
                                        openCtx(e, { type: 'attachment', data: { url: src, name: alt, type: 'image/*' } });
                                    }} style={{ maxWidth: '360px', borderRadius: 6, border: '1px solid #1f2937', background: '#0b1222' }}/>); },
                                li: function (props) { return <li {...props} style={{ marginLeft: 16 }}/>; },
                            }}>
                    {withMentions}
                  </react_markdown_1.default>);
                    })()}
                </div>)}
              {msg.attachments && msg.attachments.length > 0 && (<div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                  {msg.attachments.map(function (a, i) { return (<div key={"".concat(msg.id, "-att-").concat(i)} onContextMenu={function (e) { return openCtx(e, { type: 'attachment', data: a }); }} title={isImage(a.type, a.name) ? 'Right click: set as avatar/banner' : undefined}>
                      <AttachmentViewer a={a}/>
                    </div>); })}
                </div>)}
              {(msg.reactions && Object.keys(msg.reactions).length > 0) && (<div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {Object.entries(msg.reactions).map(function (_a) {
                        var emoji = _a[0], users = _a[1];
                        var reacted = users.includes(username);
                        var count = users.length;
                        return (<button key={emoji} onClick={function () { return toggleReaction(msg.id, emoji); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px", borderRadius: 999, border: "1px solid #1f2937", background: reacted ? "#111a2e" : "#0b1222", color: reacted ? "#93c5fd" : "#cbd5e1", cursor: "pointer" }}>
                        <span style={{ fontSize: 14 }}>{emoji}</span>
                        <span style={{ fontSize: 12 }}>{count}</span>
                      </button>);
                    })}
                </div>)}
              {pickerFor === msg.id && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80, zIndex: 70 }}>
                  <div className="glass" style={{ width: 'min(720px, 92vw)', maxHeight: '70vh', overflow: 'hidden', borderRadius: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderBottom: '1px solid #2a3344' }}>
                      <div style={{ color: '#e5e7eb', fontWeight: 600 }}>Add Reaction</div>
                      <button onClick={function () { return setPickerFor(null); }} className="btn-ghost" style={{ padding: '4px 8px' }}><react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faXmark}/></button>
                    </div>
                    <div style={{ padding: 10, borderBottom: '1px solid #111827', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ color: '#9ca3af', fontSize: 12 }}>Quick:</div>
                      {commonEmojis.map(function (e) { return (<button key={e} onClick={function () { toggleReaction(pickerFor, e); setPickerFor(null); }} style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid #1f2937', background: '#0b1222', cursor: 'pointer', fontSize: 18 }}>{e}</button>); })}
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                        {emojiData_1.CATEGORIES.map(function (cat) { return (<button key={cat.key} className="btn-ghost" onClick={function () { return setEmojiCategory(cat.key); }} style={{ padding: '4px 8px', borderColor: emojiCategory === cat.key ? '#93c5fd' : undefined, color: emojiCategory === cat.key ? '#93c5fd' : undefined }}>{cat.label}</button>); })}
                      </div>
                    </div>
                    <div style={{ padding: 10 }}>
                      <input value={emojiQuery} onChange={function (e) { return setEmojiQuery(e.target.value); }} placeholder="Search emojis" className="input-dark" style={{ width: '100%', padding: 10 }}/>
                    </div>
                    <div style={{ maxHeight: '50vh', overflowY: 'auto', padding: 10, display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0,1fr))', gap: 6 }}>
                      {(0, emojiData_1.filterEmojis)(emojiQuery, emojiCategory).map(function (em) { return (<button key={em.char + em.name} title={em.name} onClick={function () { toggleReaction(pickerFor, em.char); setPickerFor(null); }} style={{ background: '#0f172a', border: '1px solid #1f2937', padding: 6, borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>{em.char}</button>); })}
                    </div>
                  </div>
                </div>)}
            </div>); })}
      {typingUsers.length > 0 && (<div style={{ color: "#60a5fa", fontSize: 13, margin: "8px 0 0 16px" }}>
          {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
        </div>)}
      <div ref={messagesEndRef}/>
      </>)}
          {(!isAtBottom || newSinceScroll > 0) && (<div style={{ position: 'absolute', right: 16, bottom: 16 }}>
              <button className="btn-ghost" onClick={function () { var _a; (_a = messagesEndRef.current) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); setIsAtBottom(true); setNewSinceScroll(0); }} style={{ padding: '8px 12px', border: '1px solid #1f2937', borderRadius: 999, background: '#0b1222', color: '#e5e7eb' }}>
                Jump to latest {newSinceScroll > 0 ? "(".concat(newSinceScroll, ")") : ''}
              </button>
            </div>)}
        </div>
        {/* Members sidebar with smooth slide + search */}
        {selectedHaven !== '__dms__' && (<aside style={{ position: 'absolute', top: 0, right: showMembers ? 0 : -260, bottom: 0, width: 260, borderLeft: '1px solid #2a3344', background: '#0b1222', padding: 12, transition: 'right 160ms ease', pointerEvents: showMembers ? 'auto' : 'none', opacity: showMembers ? 1 : 0.0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #111827', paddingBottom: 8 }}>
              <div style={{ color: '#e5e7eb', fontWeight: 600 }}>
                Members
              </div>
              <button className="btn-ghost" onClick={function () { return setShowMembers(false); }} title="Close" style={{ padding: '4px 8px' }}>
                <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faXmark}/>
              </button>
            </div>
            <div style={{ paddingTop: 8 }}>
              <input value={membersQuery} onChange={function (e) { return setMembersQuery(e.target.value); }} placeholder="Search members" className="input-dark" style={{ width: '100%', padding: 8, borderRadius: 8 }}/>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 'calc(100% - 88px)', paddingTop: 8 }}>
              {havenMembers.length === 0 ? (<div style={{ color: '#94a3b8' }}>No members found.</div>) : (function () {
                var query = membersQuery.trim().toLowerCase();
                var filtered = havenMembers.filter(function (name) { return name.toLowerCase().includes(query); });
                var online = filtered.filter(function (name) { return (presenceMap[name] || 'offline') !== 'offline'; });
                var offline = filtered.filter(function (name) { return (presenceMap[name] || 'offline') === 'offline'; });
                var ordered = __spreadArray(__spreadArray([], online, true), offline, true);
                return ordered.map(function (name) { return (<div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', borderBottom: '1px solid #111827' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: statusColor(presenceMap[name]) }}/>
                    <button onClick={function () { setProfileUser(name); setProfileContext('Viewing Haven Profile'); }} className="btn-ghost" style={{ padding: 0, color: '#e5e7eb' }}>@{name}</button>
                  </div>); });
            })()}
            </div>
          </aside>)}
        {!(selectedHaven === "__dms__" && !selectedDM) && (<form onSubmit={function (e) { e.preventDefault(); sendMessage(); }} style={{
                display: "flex",
                alignItems: "center",
                borderTop: "1px solid #2a3344",
                padding: 12,
                background: "rgba(17,24,39,0.6)",
                position: 'relative'
            }}>
          {/* Reply bar */}
          {replyTo && (<div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 12, right: 12, background: '#0b1222', border: '1px solid #1f2937', borderRadius: 10, zIndex: 11, padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faReply}/>
              <div style={{ color: '#e5e7eb', fontSize: 13 }}>
                Replying to <strong>@{replyTo.user}</strong>: <span style={{ color: '#94a3b8' }}>{replyTo.text.slice(0, 80)}{replyTo.text.length > 80 ? '…' : ''}</span>
              </div>
              <button type="button" className="btn-ghost" onClick={function () { return setReplyTo(null); }} style={{ marginLeft: 'auto', padding: '4px 8px' }}>
                <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faXmark}/>
              </button>
            </div>)}
          {/* Mention popup */}
          {mentionOpen && (<div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 12, background: '#0b1222', border: '1px solid #1f2937', borderRadius: 10, zIndex: 10, width: 360, maxHeight: '40vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderBottom: '1px solid #111827' }}>
                <div style={{ color: '#e5e7eb', fontWeight: 600 }}>@ Mention</div>
                <button type="button" className="btn-ghost" onClick={function () { return setMentionOpen(false); }} style={{ padding: '2px 6px' }}><react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faXmark}/></button>
              </div>
              <div style={{ padding: 8 }}>
                <input value={mentionQuery} onChange={function (e) { return setMentionQuery(e.target.value); }} placeholder="Search users" className="input-dark" style={{ width: '100%', padding: 8 }}/>
              </div>
              <div>
                {mentionList.map(function (u) { return (<div key={u.username} onClick={function () { var at = "@".concat(u.username, " "); var el = inputRef.current; if (el) {
                    var pos = el.selectionStart || el.value.length;
                    var v = el.value;
                    var b = v.slice(0, pos);
                    var a = v.slice(pos);
                    el.value = b + at + a;
                    setInput(el.value);
                    setMentionOpen(false);
                    setMentionQuery("");
                    el.focus();
                    el.setSelectionRange((b + at).length, (b + at).length);
                } }} style={{ padding: '8px 12px', borderBottom: '1px solid #111827', cursor: 'pointer', color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: statusColor(presenceMap[u.username]) }}/>
                    <span>@{u.username}</span>
                    <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 12 }}>{u.displayName}</span>
                  </div>); })}
                {mentionList.length === 0 && (<div style={{ padding: 12, color: '#94a3b8' }}>No users found</div>)}
              </div>
            </div>)}
          {/* Upload previews + progress */}
          {(uploadItems.length > 0 || pendingFiles.length > 0) && (<div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 12, right: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {uploadItems.map(function (u) {
                    var _a;
                    return (<div key={u.id} style={{ border: '1px solid #1f2937', background: '#0b1222', borderRadius: 8, padding: 8, width: 260 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {((_a = u.type) === null || _a === void 0 ? void 0 : _a.startsWith('image/')) && u.localUrl ? (<img src={u.localUrl} alt={u.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}/>) : (<span style={{ color: '#cbd5e1' }}>{u.name}</span>)}
                    <div style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>{(u.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <div style={{ marginTop: 6, height: 6, background: '#111827', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ width: "".concat(u.progress, "%"), height: '100%', background: '#60a5fa', transition: 'width .15s linear' }}/>
                  </div>
                </div>);
                })}
              {pendingFiles.map(function (f, i) {
                    var _a;
                    return (<div key={"pf-".concat(i)} style={{ border: '1px solid #1f2937', background: '#0b1222', borderRadius: 8, padding: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                  {((_a = f.type) === null || _a === void 0 ? void 0 : _a.startsWith('image/')) ? (<img src={f.url} alt={f.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}/>) : (<span style={{ color: '#cbd5e1' }}>{f.name}</span>)}
                  {typeof f.size === 'number' && <span style={{ fontSize: 11, color: '#9ca3af' }}>{(f.size / 1024).toFixed(1)} KB</span>}
                  <button className="btn-ghost" onClick={function () { return setPendingFiles(function (prev) { return prev.filter(function (_, idx) { return idx !== i; }); }); }} style={{ marginLeft: 'auto', padding: '4px 8px' }}><react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faXmark}/></button>
                </div>);
                })}
            </div>)}
          <input ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={function (e) {
                if (!permState.canSend)
                    return;
                if (e.key === "@") {
                    setMentionOpen(true);
                    setMentionQuery("");
                }
                if (e.key === "Enter" && (e.ctrlKey || !e.shiftKey)) {
                    e.preventDefault();
                    sendMessage();
                }
                if (e.key === 'ArrowUp' && !input) {
                    var mine = __spreadArray([], messages, true).filter(function (m) { return m.user === username; }).pop();
                    if (mine) {
                        e.preventDefault();
                        handleEdit(mine.id, mine.text);
                    }
                }
            }} placeholder={permState.canSend
                ? (selectedDM ? "Message ".concat((function () { var dm = dms.find(function (d) { return d.id === selectedDM; }); return dm ? dm.users.filter(function (u) { return u !== username; }).join(', ') : 'DM'; })()) : "Message #".concat(selectedChannel))
                : "You don\u2019t have permission to send messages in this channel"} disabled={!permState.canSend} style={{
                flex: 1,
                marginRight: 8,
                background: "#18181b",
                color: permState.canSend ? "#fff" : "#6b7280",
                border: "1px solid #333",
                borderRadius: 4,
                padding: 8,
                fontSize: 16,
                opacity: permState.canSend ? 1 : 0.7
            }}/>
          <label title={uploading ? "Uploading..." : "Attach file (max 25MB)"} style={{ display: 'inline-flex', alignItems: 'center', marginRight: 8 }}>
            <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={function (e) { return __awaiter(_this, void 0, void 0, function () {
                var inputEl, files, _i, files_2, f;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            inputEl = e.currentTarget;
                            files = Array.from(inputEl.files || []);
                            if (files.length === 0)
                                return [2 /*return*/];
                            setUploading(true);
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, , 6, 7]);
                            _i = 0, files_2 = files;
                            _a.label = 2;
                        case 2:
                            if (!(_i < files_2.length)) return [3 /*break*/, 5];
                            f = files_2[_i];
                            if (f.size > 25 * 1024 * 1024) {
                                alert("File ".concat(f.name, " exceeds 25MB limit"));
                                return [3 /*break*/, 4];
                            }
                            return [4 /*yield*/, startUpload(f)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4:
                            _i++;
                            return [3 /*break*/, 2];
                        case 5: return [3 /*break*/, 7];
                        case 6:
                            setUploading(false);
                            if (fileInputRef.current)
                                fileInputRef.current.value = '';
                            return [7 /*endfinally*/];
                        case 7: return [2 /*return*/];
                    }
                });
            }); }}/>
            <button type="button" className="btn-ghost" style={{ padding: '8px 10px' }} onClick={function () { var _a; return (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }}>
              <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faPaperclip}/>
            </button>
          </label>
          {permState.canSend && (<button type="button" className="btn-ghost" onClick={function () { return setMentionOpen(true); }} title="Mention someone (@)" style={{ marginRight: 8, padding: "8px 10px" }}>
              <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faAt}/>
            </button>)}
          <button type="submit" className="btn-ghost" title="Send" disabled={!permState.canSend} style={{ padding: '8px 10px', opacity: permState.canSend ? 1 : 0.4 }}>
            <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faPaperPlane}/>
          </button>
        </form>)}
      </div>
      {/* Incoming call popup when not in DM */}
      {incomingCall && callState === 'idle' && (<div style={{
                position: 'fixed',
                top: isMobile ? 12 : 16,
                right: isMobile ? 8 : 16,
                zIndex: 85,
                padding: 10,
                borderRadius: 10,
                border: '1px solid #1f2937',
                background: 'rgba(15,23,42,0.96)',
                color: '#e5e7eb',
                maxWidth: isMobile ? 'calc(100vw - 16px)' : 320,
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
            }}>
          {(function () {
                var dm = dms.find(function (d) { return d.id === incomingCall.room; });
                var others = dm ? dm.users.filter(function (u) { return u !== username; }) : [];
                var label = others.length ? others.join(', ') : 'Direct Message';
                return (<>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Incoming call</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
                  {incomingCall.from} is calling you in <span style={{ color: '#e5e7eb' }}>{label}</span>.
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  <button type="button" className="btn-ghost" onClick={function () {
                        try {
                            if (ringAudioRef.current) {
                                ringAudioRef.current.pause();
                                ringAudioRef.current.currentTime = 0;
                            }
                        }
                        catch (_a) { }
                        ringAudioRef.current = null;
                        setIncomingCall(null);
                        pendingOfferRef.current = null;
                    }} style={{ padding: '4px 8px', fontSize: 12 }}>
                    Decline
                  </button>
                  <button type="button" className="btn-ghost" onClick={function () { return __awaiter(_this, void 0, void 0, function () {
                        var room, offer, stream_3, pc_3, answer, e_4;
                        var _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    room = incomingCall.room;
                                    offer = pendingOfferRef.current;
                                    if (!offer)
                                        return [2 /*return*/];
                                    setIncomingCall(null);
                                    _b.label = 1;
                                case 1:
                                    _b.trys.push([1, 6, , 7]);
                                    setCallError(null);
                                    setActiveCallDM(room);
                                    setCallState('calling');
                                    setSelectedHaven('__dms__');
                                    setSelectedDM(room);
                                    try {
                                        if (ringAudioRef.current) {
                                            ringAudioRef.current.pause();
                                            ringAudioRef.current.currentTime = 0;
                                        }
                                    }
                                    catch (_c) { }
                                    ringAudioRef.current = null;
                                    return [4 /*yield*/, navigator.mediaDevices.getUserMedia({ audio: true })];
                                case 2:
                                    stream_3 = _b.sent();
                                    localStreamRef.current = stream_3;
                                    if (localAudioRef.current) {
                                        localAudioRef.current.srcObject = stream_3;
                                    }
                                    pc_3 = setupPeer();
                                    stream_3.getTracks().forEach(function (t) { return pc_3.addTrack(t, stream_3); });
                                    return [4 /*yield*/, pc_3.setRemoteDescription(new RTCSessionDescription(offer))];
                                case 3:
                                    _b.sent();
                                    return [4 /*yield*/, pc_3.createAnswer()];
                                case 4:
                                    answer = _b.sent();
                                    return [4 /*yield*/, pc_3.setLocalDescription(answer)];
                                case 5:
                                    _b.sent();
                                    (_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.emit('call-answer', { room: room, answer: answer, from: username });
                                    setCallState('in-call');
                                    setCallStartedAt(Date.now());
                                    return [3 /*break*/, 7];
                                case 6:
                                    e_4 = _b.sent();
                                    setCallError((e_4 === null || e_4 === void 0 ? void 0 : e_4.message) || 'Could not join call');
                                    setCallState('idle');
                                    return [3 /*break*/, 7];
                                case 7: return [2 /*return*/];
                            }
                        });
                    }); }} style={{ padding: '4px 8px', fontSize: 12, borderRadius: 999, border: '1px solid #16a34a', color: '#bbf7d0' }}>
                    Accept
                  </button>
                </div>
              </>);
            })()}
        </div>)}
      {/* Simple voice call overlay for DMs */}
      {callState !== 'idle' && (<div style={{ position: 'fixed', bottom: isMobile ? 76 : 16, left: isMobile ? 8 : 16, zIndex: 80, padding: 10, borderRadius: 10, border: '1px solid #1f2937', background: 'rgba(15,23,42,0.92)', color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: 10, maxWidth: isMobile ? 'calc(100vw - 16px)' : 320 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              {callState === 'calling' ? 'Calling…' : 'In call'}
            </div>
            {callError && <div style={{ fontSize: 11, color: '#f97373' }}>{callError}</div>}
            {!callError && <div style={{ fontSize: 11, color: '#9ca3af' }}>Your microphone will be used for this DM call.</div>}
          </div>
          <audio ref={localAudioRef} autoPlay muted style={{ display: 'none' }}/>
          <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }}/>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <button type="button" className="btn-ghost" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'} style={{ padding: '4px 8px' }}>
              <react_fontawesome_1.FontAwesomeIcon icon={isMuted ? free_solid_svg_icons_1.faMicrophoneSlash : free_solid_svg_icons_1.faMicrophone}/>
            </button>
            <button type="button" className="btn-ghost" onClick={ringAgain} title="Ring again" style={{ padding: '4px 8px' }}>
              <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faPhone}/>
            </button>
            <button type="button" className="btn-ghost" onClick={endCall} title="Leave call" style={{ padding: '4px 8px', color: '#f97373' }}>
              End
            </button>
          </div>
        </div>)}
      {showServerSettings && (<ServerSettingsModal_1.default isOpen={showServerSettings} onClose={function () { return setShowServerSettings(false); }} havenName={selectedHaven}/>)}
      {showUserSettings && (<UserSettingsModal_1.default isOpen={showUserSettings} onClose={function () { return setShowUserSettings(false); }} username={username} onStatusChange={function (status) {
                var _a;
                try {
                    (_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.emit('presence', { user: username, status: status });
                }
                catch (_b) { }
                setPresenceMap(function (prev) {
                    var _a;
                    return (__assign(__assign({}, prev), (_a = {}, _a[username] = status, _a)));
                });
            }} onSaved={function (s) { return setUserSettings(s); }}/>)}
      {showPinned && (function () {
            var pinned = messages.filter(function (m) { return m.pinned; });
            return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
            <div className="glass" style={{ width: 'min(640px, 90vw)', maxHeight: '70vh', overflowY: 'auto', padding: 16, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e5e7eb', fontWeight: 600 }}>
                  <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faThumbtack}/> Pinned Messages
                </div>
                <button className="btn-ghost" onClick={function () { return setShowPinned(false); }} style={{ padding: '4px 8px' }}><react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faXmark}/></button>
              </div>
              {pinned.length === 0 ? (<div style={{ color: '#94a3b8', fontSize: 14 }}>No pinned messages.</div>) : (pinned.map(function (pm) { return (<div key={pm.id} onClick={function () { setShowPinned(false); var el = messageRefs.current[pm.id]; el === null || el === void 0 ? void 0 : el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} style={{ padding: 10, border: '1px solid #2a3344', borderRadius: 8, marginBottom: 8, cursor: 'pointer', background: '#0f172a' }}>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                      <strong style={{ color: '#93c5fd' }}>@{pm.user}</strong> - {new Date(pm.timestamp).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 14, color: '#e5e7eb' }}>{pm.text}</div>
                  </div>); }))}
            </div>
          </div>);
        })()}
      {showEditHistory && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 67 }}>
          <div className="glass" style={{ width: 'min(640px,90vw)', maxHeight: '70vh', overflow: 'auto', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid #2a3344' }}>
              <div style={{ color: '#e5e7eb', fontWeight: 600 }}>Edit History</div>
              <button className="btn-ghost" onClick={function () { return setShowEditHistory(null); }} style={{ padding: '4px 8px' }}><react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faXmark}/></button>
            </div>
            <div style={{ padding: 12 }}>
              {showEditHistory.items.length === 0 ? (<div style={{ color: '#94a3b8' }}>No prior edits.</div>) : (showEditHistory.items.slice().reverse().map(function (h, i) { return (<div key={i} style={{ borderBottom: '1px solid #111827', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(h.timestamp).toLocaleString(undefined, { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                    <div style={{ whiteSpace: 'pre-wrap', color: '#e5e7eb' }}>{h.text}</div>
                  </div>); }))}
            </div>
          </div>
        </div>)}
      {showNewHavenModal && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 73 }}>
          <div className="glass" style={{ width: 'min(420px, 92vw)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid #1f2937', color: '#e5e7eb' }}>
              <div style={{ fontWeight: 600 }}>Create Haven</div>
              <button className="btn-ghost" onClick={function () { return setShowNewHavenModal(false); }} style={{ padding: '4px 8px' }}>
                <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faXmark}/>
              </button>
            </div>
            <form onSubmit={handleCreateHaven} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, color: '#e5e7eb' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <button type="button" onClick={function () { return setHavenAction('create'); }} style={{
                flex: 1,
                padding: 8,
                borderRadius: 999,
                border: '1px solid ' + (havenAction === 'create' ? accent : '#1f2937'),
                background: havenAction === 'create' ? '#020617' : '#020617',
                color: '#e5e7eb',
                fontSize: 13,
                cursor: 'pointer'
            }}>
                  Create Haven
                </button>
                <button type="button" onClick={function () { return setHavenAction('join'); }} style={{
                flex: 1,
                padding: 8,
                borderRadius: 999,
                border: '1px solid ' + (havenAction === 'join' ? accent : '#1f2937'),
                background: havenAction === 'join' ? '#020617' : '#020617',
                color: '#e5e7eb',
                fontSize: 13,
                cursor: 'pointer'
            }}>
                  Join Haven
                </button>
              </div>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{havenAction === 'create' ? 'Haven name' : 'Haven name to join'}</span>
                <input autoFocus value={newHaven} onChange={function (e) { return setNewHaven(e.target.value); }} placeholder={havenAction === 'create' ? 'e.g. ChitterHaven' : 'Exact haven name'} className="input-dark" style={{ padding: 8, borderRadius: 8 }}/>
              </label>
              {havenAction === 'create' && (<>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Haven type</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={function () { return setNewHavenType('standard'); }} style={{
                    flex: 1,
                    minWidth: 140,
                    padding: 10,
                    borderRadius: 10,
                    border: '1px solid ' + (newHavenType === 'standard' ? accent : '#1f2937'),
                    background: '#020617',
                    color: '#e5e7eb',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer'
                }}>
                  <span style={{ width: 20, height: 20, borderRadius: 6, background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faServer}/>
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Standard Haven</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>Chat with friends and communities.</div>
                  </div>
                </button>
                <button type="button" title="Community havens coming soon" onClick={function () {
                    setShakeHavenType(true);
                    setTimeout(function () { return setShakeHavenType(false); }, 160);
                }} style={{
                    flex: 1,
                    minWidth: 140,
                    padding: 10,
                    borderRadius: 10,
                    border: '1px dashed #4b5563',
                    background: '#020617',
                    color: '#6b7280',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'not-allowed',
                    opacity: 0.5,
                    position: 'relative',
                    transform: shakeHavenType ? 'translateX(-3px)' : 'translateX(0)',
                    transition: 'transform 80ms ease'
                }}>
                  <span style={{ width: 20, height: 20, borderRadius: 6, background: '#020617', border: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faLock}/>
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Community Haven</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Coming soon</div>
                  </div>
                </button>
              </div>
                </>)}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn-ghost" onClick={function () { return setShowNewHavenModal(false); }} style={{ padding: '6px 10px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-ghost" disabled={!newHaven.trim()} style={{
                padding: '6px 10px',
                color: newHaven.trim() ? accent : '#6b7280',
                cursor: newHaven.trim() ? 'pointer' : 'not-allowed'
            }}>
                  {havenAction === 'create' ? 'Create' : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </div>)}
      {showNewChannelModal && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 72 }}>
          <div className="glass" style={{ width: 'min(420px, 92vw)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid #1f2937', color: '#e5e7eb' }}>
              <div style={{ fontWeight: 600 }}>Create Channel</div>
              <button className="btn-ghost" onClick={function () { return setShowNewChannelModal(false); }} style={{ padding: '4px 8px' }}>
                <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faXmark}/>
              </button>
            </div>
            <form onSubmit={handleCreateChannel} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, color: '#e5e7eb' }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Channel name</span>
                <input autoFocus value={newChannel} onChange={function (e) { return setNewChannel(e.target.value); }} placeholder="e.g. general" className="input-dark" style={{ padding: 8, borderRadius: 8 }}/>
              </label>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Channel type</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={function () { return setNewChannelType('text'); }} style={{
                flex: 1,
                minWidth: 140,
                padding: 10,
                borderRadius: 10,
                border: '1px solid ' + (newChannelType === 'text' ? accent : '#1f2937'),
                background: newChannelType === 'text' ? '#020617' : '#020617',
                color: '#e5e7eb',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer'
            }}>
                  <span style={{ width: 20, height: 20, borderRadius: 6, background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faHashtag}/>
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Text Channel</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>Chat with messages and media.</div>
                  </div>
                </button>
                <button type="button" title="Voice channels coming soon" onClick={function () {
                setShakeVoice(true);
                setTimeout(function () { return setShakeVoice(false); }, 160);
            }} style={{
                flex: 1,
                minWidth: 140,
                padding: 10,
                borderRadius: 10,
                border: '1px dashed #4b5563',
                background: '#020617',
                color: '#6b7280',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'not-allowed',
                opacity: 0.5,
                position: 'relative',
                transform: shakeVoice ? 'translateX(-3px)' : 'translateX(0)',
                transition: 'transform 80ms ease'
            }}>
                  <span style={{ width: 20, height: 20, borderRadius: 6, background: '#020617', border: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faLock}/>
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Voice Channel</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Coming soon</div>
                  </div>
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn-ghost" onClick={function () { return setShowNewChannelModal(false); }} style={{ padding: '6px 10px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-ghost" disabled={!newChannel.trim()} style={{
                padding: '6px 10px',
                color: newChannel.trim() ? accent : '#6b7280',
                cursor: newChannel.trim() ? 'pointer' : 'not-allowed'
            }}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>)}
      {profileUser && (<ProfileModal_1.default isOpen={!!profileUser} onClose={function () { return setProfileUser(null); }} username={profileUser} me={username} contextLabel={profileContext}/>)}
      {showUserSettings && (<UserSettingsModal_1.default isOpen={showUserSettings} onClose={function () { return setShowUserSettings(false); }} username={username} onStatusChange={function (status) {
                var _a;
                try {
                    (_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.emit('presence', { user: username, status: status });
                }
                catch (_b) { }
                setPresenceMap(function (prev) {
                    var _a;
                    return (__assign(__assign({}, prev), (_a = {}, _a[username] = status, _a)));
                });
            }}/>)}
      {toasts.length > 0 && (<div style={{ position: 'fixed', right: 16, bottom: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 95 }}>
          {toasts.map(function (t) { return (<div key={t.id} style={{ minWidth: 260, maxWidth: 360, background: '#0b1222', border: '1px solid #1f2937', borderLeft: "3px solid ".concat(t.type === 'success' ? '#22c55e' : t.type === 'warn' ? '#f59e0b' : t.type === 'error' ? '#ef4444' : '#60a5fa'), borderRadius: 8, padding: 10, color: '#e5e7eb', boxShadow: '0 10px 24px rgba(0,0,0,0.35)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.title}</div>
              {t.body && <div style={{ color: '#cbd5e1', fontSize: 13 }}>{t.body}</div>}
            </div>); })}
        </div>)}
      {(ctxMenu === null || ctxMenu === void 0 ? void 0 : ctxMenu.open) && (<div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={function () { return setCtxMenu(null); }}>
          <div style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, background: '#0b1222', border: '1px solid #1f2937', borderRadius: 8, minWidth: 200, color: '#e5e7eb', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }} onClick={function (e) { return e.stopPropagation(); }}>
            {ctxMenu.target.type === 'message' && (<>
                <button className="btn-ghost" onClick={function () { return handleCtxAction('reply'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>
                  <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faReply}/> Reply
                </button>
                <button className="btn-ghost" onClick={function () { return handleCtxAction('react'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>
                  <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faFaceSmile}/> Add Reaction
                </button>
                <button className="btn-ghost" onClick={function () { return handleCtxAction('pin'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>
                  <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faThumbtack}/> Pin/Unpin
                </button>
                <button className="btn-ghost" onClick={function () { return handleCtxAction('copy_text'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>
                  Copy Text
                </button>
                <button className="btn-ghost" onClick={function () { return handleCtxAction('copy_id'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>
                  Copy Message ID
                </button>
                <button className="btn-ghost" onClick={function () { return handleCtxAction('copy_link'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>
                  Copy Link
                </button>
                {ctxMenu.target.debug && (<>
                    <button className="btn-ghost" onClick={function () { return handleCtxAction('copy_raw'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12 }}>
                      Copy Raw JSON
                    </button>
                    <button className="btn-ghost" onClick={function () { return handleCtxAction('copy_room'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12 }}>
                      Copy Room Key
                    </button>
                  </>)}
                <div style={{ borderTop: '1px solid #1f2937', margin: '4px 0' }}/>
                <button className="btn-ghost" onClick={function () { return handleCtxAction('edit'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>
                  <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faEdit}/> Edit
                </button>
                <button className="btn-ghost" onClick={function () { return handleCtxAction('delete'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', color: '#f87171' }}>
                  <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faTrash}/> Delete
                </button>
              </>)}
            {ctxMenu.target.type === 'attachment' && (function () {
                var a = ctxMenu.target.data;
                var isImg = isImage(a === null || a === void 0 ? void 0 : a.type, a === null || a === void 0 ? void 0 : a.name);
                return (<>
                  {isImg ? (<>
                      <button className="btn-ghost" onClick={function () { return handleCtxAction('set_avatar'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>Set as Avatar</button>
                      <button className="btn-ghost" onClick={function () { return handleCtxAction('set_banner'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>Set as Banner</button>
                    </>) : (<div style={{ padding: '8px 12px', color: '#9ca3af' }}>Not an image</div>)}
                </>);
            })()}
            {ctxMenu.target.type === 'channel' && (<>
                <button className="btn-ghost" onClick={function () { return handleCtxAction('copy'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>Copy Name</button>
                <button className="btn-ghost" onClick={function () { return handleCtxAction('rename'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>Rename</button>
                <button className="btn-ghost" onClick={function () { return handleCtxAction('delete'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', color: '#f87171' }}>Delete</button>
              </>)}
            {ctxMenu.target.type === 'dm' && (<>
                <button className="btn-ghost" onClick={function () { return handleCtxAction('copy_users'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>Copy Users</button>
                <button className="btn-ghost" onClick={function () { return handleCtxAction('close'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', color: '#f87171' }}>Close DM</button>
              </>)}
            {ctxMenu.target.type === 'blank' && (<>
                <button className="btn-ghost" onClick={function () { return setShowServerSettings(true); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px' }}>Server Settings</button>
                {ctxMenu.target.debug && (<button className="btn-ghost" onClick={function () { return handleCtxAction('copy_debug'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12 }}>
                    Copy Debug Info
                  </button>)}
              </>)}
          </div>
        </div>)}
      {isMobile && showMobileNav && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', zIndex: 70 }}>
          <div style={{ width: '82vw', maxWidth: 360, background: '#0b1222', borderRight: '1px solid #2a3344', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid #2a3344', color: '#e5e7eb' }}>
              <div style={{ fontWeight: 600 }}>Navigate</div>
              <button className="btn-ghost" onClick={function () { return setShowMobileNav(false); }} style={{ padding: '4px 8px' }}>
                <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faXmark}/>
              </button>
            </div>
            <div style={{ padding: 12, borderBottom: '1px solid #111827', color: '#e5e7eb' }}>
              <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 6 }}>Havens</div>
              {Object.keys(havens).map(function (h) { return (<div key={h} onClick={function () { setSelectedHaven(h); setSelectedChannel(havens[h][0] || ''); setSelectedDM(null); setShowMobileNav(false); }} style={{ padding: '8px 6px', borderRadius: 8, cursor: 'pointer', background: selectedHaven === h ? '#111a2e' : 'transparent', color: selectedHaven === h ? '#93c5fd' : '#e5e7eb' }}>
                  <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faUsers} style={{ marginRight: 8 }}/> {h}
                </div>); })}
            </div>
            <div style={{ padding: 12, borderBottom: '1px solid #111827', color: '#e5e7eb' }}>
              <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 6 }}>Channels in {selectedHaven}</div>
              {(havens[selectedHaven] || []).map(function (ch) { return (<div key={ch} onClick={function () { setSelectedChannel(ch); setSelectedDM(null); setShowMobileNav(false); }} style={{ padding: '8px 6px', borderRadius: 8, cursor: 'pointer', background: selectedChannel === ch ? '#111a2e' : 'transparent', color: selectedChannel === ch ? '#93c5fd' : '#e5e7eb' }}>
                  <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faHashtag} style={{ marginRight: 8 }}/> #{ch}
                </div>); })}
            </div>
            <div style={{ padding: 12, color: '#e5e7eb', flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 6 }}>Direct Messages</div>
              {dms.length === 0 && (<div style={{ color: '#94a3b8', fontSize: 13 }}>No direct messages.</div>)}
              {dms.map(function (dm) { return (<div key={dm.id} onClick={function () { setSelectedHaven('__dms__'); setSelectedDM(dm.id); setShowMobileNav(false); }} style={{ padding: '8px 6px', borderRadius: 8, cursor: 'pointer', background: selectedDM === dm.id ? '#111a2e' : 'transparent', color: selectedDM === dm.id ? '#93c5fd' : '#e5e7eb', display: 'flex', alignItems: 'center' }}>
                  <react_fontawesome_1.FontAwesomeIcon icon={free_solid_svg_icons_1.faEnvelope} style={{ marginRight: 8 }}/> {dm.users.filter(function (u) { return u !== username; }).join(', ')}
                </div>); })}
            </div>
          </div>
          <div style={{ flex: 1 }} onClick={function () { return setShowMobileNav(false); }}/>
        </div>)}
      {quickOpen && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80, zIndex: 75 }}>
          <div className="glass" style={{ width: 'min(720px, 92vw)', maxHeight: '70vh', overflow: 'hidden', borderRadius: 14 }}>
            <div style={{ padding: 12, borderBottom: '1px solid #2a3344' }}>
              <input autoFocus value={quickQuery} onChange={function (e) { setQuickQuery(e.target.value); setQuickIndex(0); }} placeholder="Quick switch (Ctrl/Cmd + K)" style={{ width: '100%', padding: 10, borderRadius: 10 }} className="input-dark"/>
            </div>
            <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              {(function () {
                var items = filterQuickItems(getQuickItems(), quickQuery);
                return items.length === 0 ? (<div style={{ padding: 16, color: '#94a3b8' }}>No matches</div>) : (items.map(function (it, idx) { return (<div key={it.id} onClick={function () { return selectQuickItem(it); }} style={{ padding: '10px 14px', borderBottom: '1px solid #111827', cursor: 'pointer', background: idx === Math.min(quickIndex, items.length - 1) ? '#0b1222' : 'transparent', color: '#e5e7eb' }}>
                      {it.label}
                    </div>); }));
            })()}
            </div>
          </div>
        </div>)}
      {isBooting && (<div className="ch-loading-border" style={_b = {},
                _b['--chAccent'] = accent,
                _b}/>)}
      <style jsx global>{"\n        .ch-shell {\n          position: relative;\n        }\n        .ch-loading-border {\n          position: absolute;\n          inset: 0;\n          margin: auto;\n          border-radius: 16px;\n          pointer-events: none;\n          --p: 0%;\n          border: 2px solid transparent;\n          background:\n            conic-gradient(var(--chAccent) 0 var(--p), transparent var(--p) 100%) border-box;\n          animation: ch-border-fill 1.8s linear infinite;\n        }\n        @keyframes ch-border-fill {\n          0% { --p: 0%; opacity: 1; }\n          70% { --p: 100%; opacity: 1; }\n          85% { opacity: 0; }\n          100% { opacity: 1; --p: 0%; }\n        }\n      "}</style>
    </div>);
}

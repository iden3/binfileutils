import { BigBuffer as e, Scalar as t } from "ffjavascript";
//#region \0rolldown/runtime.js
var n = Object.create, r = Object.defineProperty, i = Object.getOwnPropertyDescriptor, a = Object.getOwnPropertyNames, o = Object.getPrototypeOf, s = Object.prototype.hasOwnProperty, c = (e, t) => () => (t || (e((t = { exports: {} }).exports, t), e = null), t.exports), l = (e, t, n, o) => {
	if (t && typeof t == "object" || typeof t == "function") for (var c = a(t), l = 0, u = c.length, d; l < u; l++) d = c[l], !s.call(e, d) && d !== n && r(e, d, {
		get: ((e) => t[e]).bind(null, d),
		enumerable: !(o = i(t, d)) || o.enumerable
	});
	return e;
}, u = /* @__PURE__ */ ((e, t, i) => (i = e == null ? {} : n(o(e)), l(t || !e || !e.__esModule ? r(i, "default", {
	value: e,
	enumerable: !0
}) : i, e)))((/* @__PURE__ */ c(((e, t) => {
	t.exports = {};
})))(), 1);
async function d(e, t, n, r) {
	if (n ||= 4096 * 64, typeof t != "number" && [
		"w+",
		"wx+",
		"r",
		"ax+",
		"a+"
	].indexOf(t) < 0) throw Error("Invalid open option");
	let i = await u.default.promises.open(e, t);
	return new f(i, await i.stat(), n, r, e);
}
var f = class {
	constructor(e, t, n, r, i) {
		for (this.fileName = i, this.fd = e, this.pos = 0, this.pageSize = r || 256; this.pageSize < t.blksize;) this.pageSize *= 2;
		this.totalSize = t.size, this.totalPages = Math.floor((t.size - 1) / this.pageSize) + 1, this.maxPagesLoaded = Math.floor(n / this.pageSize) + 1, this.directReadThreshold = 1 << 20, this.directWriteThreshold = 1 << 20, this.pages = {}, this.pendingLoads = [], this.writing = !1, this.reading = !1, this.avBuffs = [], this.history = {};
	}
	_loadPage(e) {
		let t = this, n = new Promise((n, r) => {
			t.pendingLoads.push({
				page: e,
				resolve: n,
				reject: r
			});
		});
		return t.__statusPage("After Load request: ", e), n;
	}
	__statusPage(e, t) {
		let n = [], r = this;
		if (!r.logHistory) return;
		n.push("==" + e + " " + t);
		let i = "";
		for (let e = 0; e < r.pendingLoads.length; e++) r.pendingLoads[e].page == t && (i = i + " " + e);
		if (i && n.push("Pending loads:" + i), r.pages[t] !== void 0) {
			let e = r.pages[t];
			n.push("Loaded"), n.push("pendingOps: " + e.pendingOps), e.loading && n.push("loading: " + e.loading), e.writing && n.push("writing"), e.dirty && n.push("dirty");
		}
		n.push("=="), r.history[t] || (r.history[t] = []), r.history[t].push(n);
	}
	__printHistory(e) {
		let t = this;
		t.history[e] || console.log("Empty History ", e), console.log("History " + e);
		for (let n = 0; n < t.history[e].length; n++) for (let r = 0; r < t.history[e][n].length; r++) console.log("-> " + t.history[e][n][r]);
	}
	_triggerLoad() {
		let e = this;
		if (e.reading || e.pendingLoads.length == 0) return;
		let t = Object.keys(e.pages), n = [];
		for (let r = 0; r < t.length; r++) {
			let i = e.pages[parseInt(t[r])];
			i.dirty == 0 && i.pendingOps == 0 && !i.writing && !i.loading && n.push(parseInt(t[r]));
		}
		let r = e.maxPagesLoaded - t.length, i = [];
		for (; e.pendingLoads.length > 0 && (e.pages[e.pendingLoads[0].page] !== void 0 || r > 0 || n.length > 0);) {
			let t = e.pendingLoads.shift();
			if (e.pages[t.page] !== void 0) {
				e.pages[t.page].pendingOps++;
				let r = n.indexOf(t.page);
				r >= 0 && n.splice(r, 1), e.pages[t.page].loading ? e.pages[t.page].loading.push(t) : t.resolve(), e.__statusPage("After Load (cached): ", t.page);
			} else {
				if (r) r--;
				else {
					let t = n.shift();
					e.__statusPage("Before Unload: ", t), e.avBuffs.unshift(e.pages[t]), delete e.pages[t], e.__statusPage("After Unload: ", t);
				}
				t.page >= e.totalPages ? (e.pages[t.page] = a(), t.resolve(), e.__statusPage("After Load (new): ", t.page)) : (e.reading = !0, e.pages[t.page] = a(), e.pages[t.page].loading = [t], i.push(e.fd.read(e.pages[t.page].buff, 0, e.pageSize, t.page * e.pageSize).then((n) => {
					e.pages[t.page].size = n.bytesRead;
					let r = e.pages[t.page].loading;
					delete e.pages[t.page].loading;
					for (let e = 0; e < r.length; e++) r[e].resolve();
					return e.__statusPage("After Load (loaded): ", t.page), n;
				}, (e) => {
					t.reject(e);
				})), e.__statusPage("After Load (loading): ", t.page));
			}
		}
		Promise.all(i).then(() => {
			e.reading = !1, e.pendingLoads.length > 0 && setImmediate(e._triggerLoad.bind(e)), e._tryClose();
		});
		function a() {
			if (e.avBuffs.length > 0) {
				let t = e.avBuffs.shift();
				return t.dirty = !1, t.pendingOps = 1, t.size = 0, t;
			} else return {
				dirty: !1,
				buff: new Uint8Array(e.pageSize),
				pendingOps: 1,
				size: 0
			};
		}
	}
	_triggerWrite() {
		let e = this;
		if (e.writing) return;
		let t = Object.keys(e.pages), n = [];
		for (let r = 0; r < t.length; r++) {
			let i = e.pages[parseInt(t[r])];
			i.dirty && (i.dirty = !1, i.writing = !0, e.writing = !0, n.push(e.fd.write(i.buff, 0, i.size, parseInt(t[r]) * e.pageSize).then(() => {
				i.writing = !1;
			}, (t) => {
				console.log("ERROR Writing: " + t), e.error = t, e._tryClose();
			})));
		}
		e.writing && Promise.all(n).then(() => {
			e.writing = !1, setImmediate(e._triggerWrite.bind(e)), e._tryClose(), e.pendingLoads.length > 0 && setImmediate(e._triggerLoad.bind(e));
		});
	}
	_getDirtyPage() {
		for (let e in this.pages) if (this.pages[e].dirty) return e;
		return -1;
	}
	_rangeHasCachedPages(e, t) {
		let n = Math.floor(e / this.pageSize), r = Math.floor((e + t - 1) / this.pageSize);
		for (let e of Object.keys(this.pages)) {
			let t = +e;
			if (t >= n && t <= r) return !0;
		}
		return !1;
	}
	async write(e, t) {
		if (e.byteLength == 0) return;
		let n = this;
		if (t === void 0 && (t = n.pos), n.pos = t + e.byteLength, n.totalSize < t + e.byteLength && (n.totalSize = t + e.byteLength), n.pendingClose) throw Error("Writing a closing file");
		if (e.byteLength >= n.directWriteThreshold && ArrayBuffer.isView(e) && !n._rangeHasCachedPages(t, e.byteLength)) {
			let r = 0;
			for (; r < e.byteLength;) {
				let { bytesWritten: i } = await n.fd.write(e, r, e.byteLength - r, t + r);
				if (i === 0) break;
				r += i;
			}
			let i = Math.floor((t + e.byteLength - 1) / n.pageSize);
			i + 1 > n.totalPages && (n.totalPages = i + 1);
			return;
		}
		let r = Math.floor(t / n.pageSize), i = Math.floor((t + e.byteLength - 1) / n.pageSize), a = [];
		for (let e = r; e <= i; e++) a.push(n._loadPage(e));
		n._triggerLoad();
		let o = r, s = t % n.pageSize, c = e.byteLength;
		for (; c > 0;) {
			await a[o - r];
			let t = s + c > n.pageSize ? n.pageSize - s : c, i = e.slice(e.byteLength - c, e.byteLength - c + t);
			new Uint8Array(n.pages[o].buff.buffer, s, t).set(i), n.pages[o].dirty = !0, n.pages[o].pendingOps--, n.pages[o].size = Math.max(s + t, n.pages[o].size), o >= n.totalPages && (n.totalPages = o + 1), c -= t, o++, s = 0, n.writing || setImmediate(n._triggerWrite.bind(n));
		}
	}
	async read(e, t) {
		let n = this, r = new Uint8Array(e);
		return await n.readToBuffer(r, 0, e, t), r;
	}
	_rangeHasDirtyPages(e, t) {
		let n = Math.floor(e / this.pageSize), r = Math.floor((e + t - 1) / this.pageSize);
		for (let e of Object.keys(this.pages)) {
			let t = +e;
			if (t >= n && t <= r) {
				let e = this.pages[t];
				if (e.dirty || e.writing) return !0;
			}
		}
		return !1;
	}
	async readToBuffer(e, t, n, r) {
		if (n == 0) return;
		let i = this;
		if (r === void 0 && (r = i.pos), i.pos = r + n, i.pendingClose) throw Error("Reading a closing file");
		if (n >= i.directReadThreshold && ArrayBuffer.isView(e) && !i._rangeHasDirtyPages(r, n)) {
			let a = r + n > i.totalSize ? i.totalSize - r : n;
			a < 0 && (a = 0);
			let o = 0;
			for (; o < a;) {
				let { bytesRead: n } = await i.fd.read(e, t + o, a - o, r + o);
				if (n === 0) break;
				o += n;
			}
			return;
		}
		if (n > i.pageSize * i.maxPagesLoaded * .8) {
			let e = Math.floor(n * 1.1);
			this.maxPagesLoaded = Math.floor(e / i.pageSize) + 1;
		}
		let a = Math.floor(r / i.pageSize), o = Math.floor((r + n - 1) / i.pageSize), s = [];
		for (let e = a; e <= o; e++) s.push(i._loadPage(e));
		i._triggerLoad();
		let c = a, l = r % i.pageSize, u = r + n > i.totalSize ? n - (r + n - i.totalSize) : n;
		for (; u > 0;) {
			await s[c - a], i.__statusPage("After Await (read): ", c);
			let r = l + u > i.pageSize ? i.pageSize - l : u, o = new Uint8Array(i.pages[c].buff.buffer, i.pages[c].buff.byteOffset + l, r);
			e.set(o, t + n - u), i.pages[c].pendingOps--, i.__statusPage("After Op done: ", c), u -= r, c++, l = 0, i.pendingLoads.length > 0 && setImmediate(i._triggerLoad.bind(i));
		}
		this.pos = r + n;
	}
	_tryClose() {
		let e = this;
		e.pendingClose && (e.error && e.pendingCloseReject(e.error), !(e._getDirtyPage() >= 0 || e.writing || e.reading || e.pendingLoads.length > 0) && e.pendingClose());
	}
	close() {
		let e = this;
		if (e.pendingClose) throw Error("Closing the file twice");
		return new Promise((t, n) => {
			e.pendingClose = t, e.pendingCloseReject = n, e._tryClose();
		}).then(() => {
			e.fd.close();
		}, (t) => {
			throw e.fd.close(), t;
		});
	}
	async discard() {
		await this.close(), await u.default.promises.unlink(this.fileName);
	}
	async writeULE32(e, t) {
		let n = this, r = /* @__PURE__ */ new Uint8Array(4);
		new DataView(r.buffer).setUint32(0, e, !0), await n.write(r, t);
	}
	async writeUBE32(e, t) {
		let n = this, r = /* @__PURE__ */ new Uint8Array(4);
		new DataView(r.buffer).setUint32(0, e, !1), await n.write(r, t);
	}
	async writeULE64(e, t) {
		let n = this, r = /* @__PURE__ */ new Uint8Array(8), i = new DataView(r.buffer);
		i.setUint32(0, e & 4294967295, !0), i.setUint32(4, Math.floor(e / 4294967296), !0), await n.write(r, t);
	}
	async readULE32(e) {
		let t = await this.read(4, e);
		return new Uint32Array(t.buffer)[0];
	}
	async readUBE32(e) {
		let t = await this.read(4, e);
		return new DataView(t.buffer).getUint32(0, !1);
	}
	async readULE64(e) {
		let t = await this.read(8, e), n = new Uint32Array(t.buffer);
		return n[1] * 4294967296 + n[0];
	}
	async readString(e) {
		let t = this;
		if (t.pendingClose) throw Error("Reading a closing file");
		let n = e === void 0 ? t.pos : e, r = Math.floor(n / t.pageSize), i = !1, a = "";
		for (; !i;) {
			let e = t._loadPage(r);
			t._triggerLoad(), await e, t.__statusPage("After Await (read): ", r);
			let o = n % t.pageSize, s = new Uint8Array(t.pages[r].buff.buffer, t.pages[r].buff.byteOffset + o, t.pageSize - o), c = s.findIndex((e) => e === 0);
			i = c !== -1, i ? (a += new TextDecoder().decode(s.slice(0, c)), t.pos = r * this.pageSize + o + c + 1) : (a += new TextDecoder().decode(s), t.pos = r * this.pageSize + o + s.length), t.pages[r].pendingOps--, t.__statusPage("After Op done: ", r), n = t.pos, r++, t.pendingLoads.length > 0 && setImmediate(t._triggerLoad.bind(t));
		}
		return a;
	}
};
//#endregion
//#region ../fastfile/src/memfile.js
function p(e) {
	let t = e.initialSize || 1 << 20, n = new y();
	return n.o = e, n.o.data = new Uint8Array(t), n.allocSize = t, n.totalSize = 0, n.readOnly = !1, n.pos = 0, n;
}
function m(e) {
	let t = new y();
	return t.o = e, t.allocSize = e.data.byteLength, t.totalSize = e.data.byteLength, t.readOnly = !0, t.pos = 0, t;
}
var h = /* @__PURE__ */ new Uint8Array(4), g = new DataView(h.buffer), _ = /* @__PURE__ */ new Uint8Array(8), v = new DataView(_.buffer), y = class {
	constructor() {
		this.pageSize = 16384;
	}
	_resizeIfNeeded(e) {
		if (e > this.allocSize) {
			let t = Math.max(this.allocSize + (1 << 20), Math.floor(this.allocSize * 1.1), e), n = new Uint8Array(t);
			n.set(this.o.data), this.o.data = n, this.allocSize = t;
		}
	}
	async write(e, t) {
		let n = this;
		if (t === void 0 && (t = n.pos), this.readOnly) throw Error("Writing a read only file");
		this._resizeIfNeeded(t + e.byteLength), this.o.data.set(e.slice(), t), t + e.byteLength > this.totalSize && (this.totalSize = t + e.byteLength), this.pos = t + e.byteLength;
	}
	async readToBuffer(e, t, n, r) {
		let i = this;
		if (r === void 0 && (r = i.pos), this.readOnly && r + n > this.totalSize) throw Error("Reading out of bounds");
		this._resizeIfNeeded(r + n);
		let a = new Uint8Array(this.o.data.buffer, this.o.data.byteOffset + r, n);
		e.set(a, t), this.pos = r + n;
	}
	async read(e, t) {
		let n = this, r = new Uint8Array(e);
		return await n.readToBuffer(r, 0, e, t), r;
	}
	close() {
		this.o.data.byteLength != this.totalSize && (this.o.data = this.o.data.slice(0, this.totalSize));
	}
	async discard() {}
	async writeULE32(e, t) {
		let n = this;
		g.setUint32(0, e, !0), await n.write(h, t);
	}
	async writeUBE32(e, t) {
		let n = this;
		g.setUint32(0, e, !1), await n.write(h, t);
	}
	async writeULE64(e, t) {
		let n = this;
		v.setUint32(0, e & 4294967295, !0), v.setUint32(4, Math.floor(e / 4294967296), !0), await n.write(_, t);
	}
	async readULE32(e) {
		let t = await this.read(4, e);
		return new Uint32Array(t.buffer)[0];
	}
	async readUBE32(e) {
		let t = await this.read(4, e);
		return new DataView(t.buffer).getUint32(0, !1);
	}
	async readULE64(e) {
		let t = await this.read(8, e), n = new Uint32Array(t.buffer);
		return n[1] * 4294967296 + n[0];
	}
	async readString(e) {
		let t = this, n = e === void 0 ? t.pos : e;
		if (n > this.totalSize) {
			if (this.readOnly) throw Error("Reading out of bounds");
			this._resizeIfNeeded(e);
		}
		let r = new Uint8Array(t.o.data.buffer, n, this.totalSize - n), i = r.findIndex((e) => e === 0), a = i !== -1, o = "";
		return a ? (o = new TextDecoder().decode(r.slice(0, i)), t.pos = n + i + 1) : t.pos = n, o;
	}
}, b = 1 << 22;
function x(e) {
	let t = e.initialSize || 0, n = new D();
	n.o = e;
	let r = t ? Math.floor((t - 1) / b) + 1 : 0;
	n.o.data = [];
	for (let e = 0; e < r - 1; e++) n.o.data.push(new Uint8Array(b));
	return r && n.o.data.push(new Uint8Array(t - b * (r - 1))), n.totalSize = 0, n.readOnly = !1, n.pos = 0, n;
}
function S(e) {
	let t = new D();
	return t.o = e, t.totalSize = (e.data.length - 1) * b + e.data[e.data.length - 1].byteLength, t.readOnly = !0, t.pos = 0, t;
}
var C = /* @__PURE__ */ new Uint8Array(4), w = new DataView(C.buffer), T = /* @__PURE__ */ new Uint8Array(8), E = new DataView(T.buffer), D = class {
	constructor() {
		this.pageSize = 16384;
	}
	_resizeIfNeeded(e) {
		if (e <= this.totalSize) return;
		if (this.readOnly) throw Error("Reading out of file bounds");
		let t = Math.floor((e - 1) / b) + 1;
		for (let n = Math.max(this.o.data.length - 1, 0); n < t; n++) {
			let r = n < t - 1 ? b : e - (t - 1) * b, i = new Uint8Array(r);
			n == this.o.data.length - 1 && i.set(this.o.data[n]), this.o.data[n] = i;
		}
		this.totalSize = e;
	}
	async write(e, t) {
		let n = this;
		if (t === void 0 && (t = n.pos), this.readOnly) throw Error("Writing a read only file");
		this._resizeIfNeeded(t + e.byteLength);
		let r = Math.floor(t / b), i = t % b, a = e.byteLength;
		for (; a > 0;) {
			let t = i + a > b ? b - i : a, o = e.slice(e.byteLength - a, e.byteLength - a + t);
			new Uint8Array(n.o.data[r].buffer, i, t).set(o), a -= t, r++, i = 0;
		}
		this.pos = t + e.byteLength;
	}
	async readToBuffer(e, t, n, r) {
		let i = this;
		if (r === void 0 && (r = i.pos), this.readOnly && r + n > this.totalSize) throw Error("Reading out of bounds");
		this._resizeIfNeeded(r + n);
		let a = Math.floor(r / b), o = r % b, s = n;
		for (; s > 0;) {
			let r = o + s > b ? b - o : s, c = new Uint8Array(i.o.data[a].buffer, o, r);
			e.set(c, t + n - s), s -= r, a++, o = 0;
		}
		this.pos = r + n;
	}
	async read(e, t) {
		let n = this, r = new Uint8Array(e);
		return await n.readToBuffer(r, 0, e, t), r;
	}
	close() {}
	async discard() {}
	async writeULE32(e, t) {
		let n = this;
		w.setUint32(0, e, !0), await n.write(C, t);
	}
	async writeUBE32(e, t) {
		let n = this;
		w.setUint32(0, e, !1), await n.write(C, t);
	}
	async writeULE64(e, t) {
		let n = this;
		E.setUint32(0, e & 4294967295, !0), E.setUint32(4, Math.floor(e / 4294967296), !0), await n.write(T, t);
	}
	async readULE32(e) {
		let t = await this.read(4, e);
		return new Uint32Array(t.buffer)[0];
	}
	async readUBE32(e) {
		let t = await this.read(4, e);
		return new DataView(t.buffer).getUint32(0, !1);
	}
	async readULE64(e) {
		let t = await this.read(8, e), n = new Uint32Array(t.buffer);
		return n[1] * 4294967296 + n[0];
	}
	async readString(e) {
		let t = this, n = e === void 0 ? t.pos : e;
		if (n > this.totalSize) {
			if (this.readOnly) throw Error("Reading out of bounds");
			this._resizeIfNeeded(e);
		}
		let r = !1, i = "";
		for (; !r;) {
			let e = Math.floor(n / b), a = n % b;
			if (t.o.data[e] === void 0) throw Error("ERROR");
			let o = Math.min(2048, t.o.data[e].length - a), s = new Uint8Array(t.o.data[e].buffer, a, o), c = s.findIndex((e) => e === 0);
			r = c !== -1, r ? (i += new TextDecoder().decode(s.slice(0, c)), t.pos = e * b + a + c + 1) : (i += new TextDecoder().decode(s), t.pos = e * b + a + s.length), n = t.pos;
		}
		return i;
	}
}, O = 65536, k = 8192, A = typeof process < "u" && process.versions != null && process.versions.node != null;
async function j(e, t, n) {
	if (typeof e == "string" && (e = {
		type: "file",
		fileName: e,
		cacheSize: t || O,
		pageSize: n || k
	}), e.type == "file") return await d(e.fileName, 0, e.cacheSize, e.pageSize);
	if (e.type == "mem") return p(e);
	if (e.type == "bigMem") return x(e);
	throw Error("Invalid FastFile type: " + e.type);
}
async function M(e, t, n) {
	if (e instanceof Uint8Array && (e = {
		type: "mem",
		data: e
	}), A ? typeof e == "string" && (e = {
		type: "file",
		fileName: e,
		cacheSize: t || O,
		pageSize: n || k
	}) : typeof e == "string" && (e = {
		type: "mem",
		data: await fetch(e).then(function(e) {
			return e.arrayBuffer();
		}).then(function(e) {
			return new Uint8Array(e);
		})
	}), e.type == "file") return await d(e.fileName, 0, e.cacheSize, e.pageSize);
	if (e.type == "mem") return await m(e);
	if (e.type == "bigMem") return await S(e);
	throw Error("Invalid FastFile type: " + e.type);
}
//#endregion
//#region src/binfileutils.js
var N = 1 << 30;
async function P(e, t, n, r, i) {
	let a = await M(e, r, i), o = await a.read(4), s = "";
	for (let e = 0; e < 4; e++) s += String.fromCharCode(o[e]);
	if (s != t) throw Error(e + ": Invalid File format");
	if (await a.readULE32() > n) throw Error("Version not supported");
	let c = await a.readULE32(), l = [];
	for (let e = 0; e < c; e++) {
		let e = await a.readULE32(), t = await a.readULE64();
		l[e] === void 0 && (l[e] = []), l[e].push({
			p: a.pos,
			size: t
		}), a.pos += t;
	}
	return {
		fd: a,
		sections: l
	};
}
async function F(e, t, n, r, i, a) {
	let o = await j(e, i, a), s = /* @__PURE__ */ new Uint8Array(4);
	for (let e = 0; e < 4; e++) s[e] = t.charCodeAt(e);
	return await o.write(s, 0), await o.writeULE32(n), await o.writeULE32(r), o;
}
async function I(e, t) {
	if (e.writingSection !== void 0) throw Error("Already writing a section");
	await e.writeULE32(t), e.writingSection = { pSectionSize: e.pos }, await e.writeULE64(0);
}
async function L(e) {
	if (e.writingSection === void 0) throw Error("Not writing a section");
	let t = e.pos - e.writingSection.pSectionSize - 8, n = e.pos;
	e.pos = e.writingSection.pSectionSize, await e.writeULE64(t), e.pos = n, delete e.writingSection;
}
async function R(e, t, n) {
	if (e.readingSection !== void 0) throw Error("Already reading a section");
	if (!t[n]) throw Error(e.fileName + ": Missing section " + n);
	if (t[n].length > 1) throw Error(e.fileName + ": Section Duplicated " + n);
	e.pos = t[n][0].p, e.readingSection = t[n][0];
}
async function z(e, t) {
	if (e.readingSection === void 0) throw Error("Not reading a section");
	if (!t && e.pos - e.readingSection.p != e.readingSection.size) throw Error("Invalid section size reading");
	delete e.readingSection;
}
async function B(e, n, r, i) {
	let a = new Uint8Array(r);
	t.toRprLE(a, 0, n, r), await e.write(a, i);
}
async function V(e, n, r) {
	let i = await e.read(n, r);
	return t.fromRprLE(i, 0, n);
}
async function H(e, t, n, r, i) {
	i === void 0 && (i = t[r][0].size);
	let a = e.pageSize;
	await R(e, t, r), await I(n, r);
	for (let t = 0; t < i; t += a) {
		let r = Math.min(i - t, a), o = await e.read(r);
		await n.write(o);
	}
	await L(n), await z(e, i != t[r][0].size);
}
async function U(t, n, r, i, a) {
	if (i = i === void 0 ? 0 : i, a = a === void 0 ? n[r][0].size - i : a, i + a > n[r][0].size) throw Error("Reading out of the range of the section");
	let o;
	return o = a < N ? new Uint8Array(a) : new e(a), await t.readToBuffer(o, 0, a, n[r][0].p + i), o;
}
async function W(e, t, n, r, i) {
	let a = e.pageSize * 16;
	if (await R(e, t, i), await R(n, r, i), t[i][0].size != r[i][0].size) return !1;
	let o = t[i][0].size;
	for (let t = 0; t < o; t += a) {
		let r = Math.min(o - t, a), i = await e.read(r), s = await n.read(r);
		for (let e = 0; e < r; e++) if (i[e] != s[e]) return !1;
	}
	return await z(e), await z(n), !0;
}
//#endregion
export { H as copySection, F as createBinFile, z as endReadSection, L as endWriteSection, V as readBigInt, P as readBinFile, U as readSection, W as sectionIsEqual, R as startReadUniqueSection, I as startWriteSection, B as writeBigInt };

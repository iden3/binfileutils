import { BigBuffer as e, Scalar as t } from "ffjavascript";
//#region node_modules/fastfile/build/browser/browser.esm.js
function n(e) {
	let t = e.initialSize || 1 << 20, n = new c();
	return n.o = e, n.o.data = new Uint8Array(t), n.allocSize = t, n.totalSize = 0, n.readOnly = !1, n.pos = 0, n;
}
function r(e) {
	let t = new c();
	return t.o = e, t.allocSize = e.data.byteLength, t.totalSize = e.data.byteLength, t.readOnly = !0, t.pos = 0, t;
}
var i = /* @__PURE__ */ new Uint8Array(4), a = new DataView(i.buffer), o = /* @__PURE__ */ new Uint8Array(8), s = new DataView(o.buffer), c = class {
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
		a.setUint32(0, e, !0), await n.write(i, t);
	}
	async writeUBE32(e, t) {
		let n = this;
		a.setUint32(0, e, !1), await n.write(i, t);
	}
	async writeULE64(e, t) {
		let n = this;
		s.setUint32(0, e & 4294967295, !0), s.setUint32(4, Math.floor(e / 4294967296), !0), await n.write(o, t);
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
		if (n >= this.totalSize) {
			if (this.readOnly) throw Error("Reading out of bounds");
			return "";
		}
		let r = new Uint8Array(t.o.data.buffer, n, this.totalSize - n), i = r.findIndex((e) => e === 0), a = i !== -1, o = "";
		return a ? (o = new TextDecoder().decode(r.slice(0, i)), t.pos = n + i + 1) : t.pos = n, o;
	}
}, l = 1 << 22;
function u(e) {
	let t = e.initialSize || 0, n = new g();
	n.o = e;
	let r = t ? Math.floor((t - 1) / l) + 1 : 0;
	n.o.data = [];
	for (let e = 0; e < r - 1; e++) n.o.data.push(new Uint8Array(l));
	return r && n.o.data.push(new Uint8Array(t - l * (r - 1))), n.totalSize = 0, n.readOnly = !1, n.pos = 0, n;
}
function d(e) {
	let t = new g();
	return t.o = e, t.totalSize = (e.data.length - 1) * l + e.data[e.data.length - 1].byteLength, t.readOnly = !0, t.pos = 0, t;
}
var f = /* @__PURE__ */ new Uint8Array(4), p = new DataView(f.buffer), m = /* @__PURE__ */ new Uint8Array(8), h = new DataView(m.buffer), g = class {
	constructor() {
		this.pageSize = 16384;
	}
	_resizeIfNeeded(e) {
		if (e <= this.totalSize) return;
		if (this.readOnly) throw Error("Reading out of file bounds");
		let t = Math.floor((e - 1) / l) + 1;
		for (let n = Math.max(this.o.data.length - 1, 0); n < t; n++) {
			let r = n < t - 1 ? l : e - (t - 1) * l, i = new Uint8Array(r);
			n == this.o.data.length - 1 && i.set(this.o.data[n]), this.o.data[n] = i;
		}
		this.totalSize = e;
	}
	async write(e, t) {
		let n = this;
		if (t === void 0 && (t = n.pos), this.readOnly) throw Error("Writing a read only file");
		this._resizeIfNeeded(t + e.byteLength);
		let r = Math.floor(t / l), i = t % l, a = e.byteLength;
		for (; a > 0;) {
			let t = i + a > l ? l - i : a, o = e.slice(e.byteLength - a, e.byteLength - a + t);
			new Uint8Array(n.o.data[r].buffer, i, t).set(o), a -= t, r++, i = 0;
		}
		this.pos = t + e.byteLength;
	}
	async readToBuffer(e, t, n, r) {
		let i = this;
		if (r === void 0 && (r = i.pos), this.readOnly && r + n > this.totalSize) throw Error("Reading out of bounds");
		this._resizeIfNeeded(r + n);
		let a = Math.floor(r / l), o = r % l, s = n;
		for (; s > 0;) {
			let r = o + s > l ? l - o : s, c = new Uint8Array(i.o.data[a].buffer, o, r);
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
		p.setUint32(0, e, !0), await n.write(f, t);
	}
	async writeUBE32(e, t) {
		let n = this;
		p.setUint32(0, e, !1), await n.write(f, t);
	}
	async writeULE64(e, t) {
		let n = this;
		h.setUint32(0, e & 4294967295, !0), h.setUint32(4, Math.floor(e / 4294967296), !0), await n.write(m, t);
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
			let e = Math.floor(n / l), a = n % l;
			if (t.o.data[e] === void 0) throw Error("ERROR");
			let o = Math.min(2048, t.o.data[e].length - a);
			if (o <= 0) return t.pos = n, i;
			let s = new Uint8Array(t.o.data[e].buffer, a, o), c = s.findIndex((e) => e === 0);
			r = c !== -1, r ? (i += new TextDecoder().decode(s.slice(0, c)), t.pos = e * l + a + c + 1) : (i += new TextDecoder().decode(s), t.pos = e * l + a + s.length), n = t.pos;
		}
		return i;
	}
}, _ = 1 << 20, v = 8192, y = class {
	constructor(e, t, n, r) {
		this.readRangeInto = e, this.totalSize = t, this.pos = 0, this.pageSize = r || v, this.maxPagesLoaded = Math.floor((n || _) / this.pageSize) + 1, this.pages = /* @__PURE__ */ new Map(), this.readOnly = !0;
	}
	_pageLen(e) {
		let t = e * this.pageSize;
		return Math.min(t + this.pageSize, this.totalSize) - t;
	}
	_loadPage(e) {
		let t = this, n = t.pages.get(e);
		if (n) return t.pages.delete(e), t.pages.set(e, n), n.promise;
		let r = new Uint8Array(t._pageLen(e));
		return n = {
			buff: null,
			promise: null
		}, n.promise = t.readRangeInto(r, 0, e * t.pageSize, r.byteLength).then(function() {
			return n.buff = r, r;
		}, function(n) {
			throw t.pages.delete(e), n;
		}), t.pages.set(e, n), t._trimCache(), n.promise;
	}
	_trimCache() {
		let e = this;
		if (!(e.pages.size <= e.maxPagesLoaded)) for (let t of e.pages) {
			if (e.pages.size <= e.maxPagesLoaded) return;
			t[1].buff && e.pages.delete(t[0]);
		}
	}
	async readToBuffer(e, t, n, r) {
		let i = this;
		if (n === 0) return;
		if (i.pendingClose) throw Error("Reading a closing file");
		if (r === void 0 && (r = i.pos), r + n > i.totalSize) throw Error("Reading out of bounds");
		if (i.pos = r + n, n >= i.pageSize) {
			await i.readRangeInto(e, t, r, n);
			return;
		}
		let a = Math.floor(r / i.pageSize), o = Math.floor((r + n - 1) / i.pageSize), s = r % i.pageSize, c = 0;
		for (let r = a; r <= o; r++) {
			let a = await i._loadPage(r), o = Math.min(n - c, i.pageSize - s);
			e.set(a.subarray(s, s + o), t + c), c += o, s = 0;
		}
	}
	async read(e, t) {
		let n = new Uint8Array(e);
		return await this.readToBuffer(n, 0, e, t), n;
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
		let n = e === void 0 ? t.pos : e, r = [];
		for (; n < t.totalSize;) {
			let e = Math.min(t.pageSize, t.totalSize - n), i = await t.read(e, n), a = i.indexOf(0);
			if (a >= 0) return r.push(i.subarray(0, a)), t.pos = n + a + 1, b(r);
			r.push(i), n += e;
		}
		return t.pos = n, b(r);
	}
	async write() {
		throw Error("Writing a read only file");
	}
	async writeULE32() {
		throw Error("Writing a read only file");
	}
	async writeUBE32() {
		throw Error("Writing a read only file");
	}
	async writeULE64() {
		throw Error("Writing a read only file");
	}
	async close() {
		this.pendingClose || (this.pendingClose = !0, this.pages.clear());
	}
	async discard() {
		await this.close();
	}
};
function b(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) t += e[n].byteLength;
	let n = new Uint8Array(t), r = 0;
	for (let t = 0; t < e.length; t++) n.set(e[t], r), r += e[t].byteLength;
	return new TextDecoder().decode(n);
}
var ee = 1 << 21, te = 1 << 29, ne = "fastfile-http-cache", x = /* @__PURE__ */ new Map();
function S(e) {
	if (x.has(e)) return x.get(e);
	let t = new Promise((t, n) => {
		let r = indexedDB.open(e, 1);
		r.onupgradeneeded = () => {
			let e = r.result;
			e.createObjectStore("files"), e.createObjectStore("blocks");
		}, r.onsuccess = () => t(r.result), r.onerror = () => n(r.error), r.onblocked = () => n(/* @__PURE__ */ Error("IndexedDB open blocked"));
	});
	return x.set(e, t), t.catch(() => x.delete(e)), t;
}
function C(e) {
	return new Promise((t, n) => {
		e.onsuccess = () => t(e.result), e.onerror = () => n(e.error);
	});
}
function w(e) {
	return new Promise((t, n) => {
		e.oncomplete = () => t(), e.onerror = () => n(e.error), e.onabort = () => n(e.error || /* @__PURE__ */ Error("IndexedDB transaction aborted"));
	});
}
function T(e, t, n) {
	return IDBKeyRange.bound([e, t], [e, n]);
}
async function E(e, t) {
	let n = e.transaction(["files", "blocks"], "readwrite");
	n.objectStore("files").delete(t), n.objectStore("blocks").delete(T(t, 0, Infinity)), await w(n);
}
async function D(e, t, n, r, i, a) {
	let o = e.transaction(["files", "blocks"], "readwrite"), s = o.objectStore("files"), c = await C(s.get(t)), l = 0;
	c && c.validator === n && c.totalSize === r && c.blockSize === i ? l = c.bytes : c && o.objectStore("blocks").delete(T(t, 0, Infinity)), s.put({
		validator: n,
		totalSize: r,
		blockSize: i,
		bytes: l,
		lastUsed: Date.now()
	}, t), await w(o);
	let u = e.transaction("files", "readonly"), d = u.objectStore("files"), [f, p] = await Promise.all([C(d.getAllKeys()), C(d.getAll())]);
	await w(u);
	let m = p.reduce((e, t) => e + t.bytes, 0);
	if (m <= a) return;
	let h = f.map((e, t) => ({
		key: e,
		meta: p[t]
	})).filter((e) => e.key !== t).sort((e, t) => e.meta.lastUsed - t.meta.lastUsed);
	for (let t of h) {
		if (m <= a) break;
		await E(e, t.key), m -= t.meta.bytes;
	}
}
async function O(e, t) {
	let { fileKey: n, validator: r, totalSize: i } = t, a = typeof t.options == "object" && t.options || {}, o = a.blockSize || ee, s = a.maxBytes || te, c = a.dbName || ne;
	if (typeof indexedDB > "u" || !r) return e;
	let l;
	try {
		l = await S(c), await D(l, n, r, i, o, s);
	} catch {
		return e;
	}
	let u = !1;
	async function d(e, t) {
		let r = l.transaction("blocks", "readonly"), i = r.objectStore("blocks"), a = T(n, e, t), [o, s] = await Promise.all([C(i.getAllKeys(a)), C(i.getAll(a))]);
		await w(r);
		let c = /* @__PURE__ */ new Map();
		for (let e = 0; e < o.length; e++) c.set(o[e][1], s[e]);
		return c;
	}
	async function f(e) {
		if (!(u || e.length === 0)) try {
			let t = l.transaction(["files", "blocks"], "readwrite"), r = t.objectStore("blocks"), i = t.objectStore("files");
			for (let t of e) r.put(t.data, [n, t.index]);
			let a = await C(i.get(n));
			a && (a.bytes += e.reduce((e, t) => e + t.data.byteLength, 0), a.lastUsed = Date.now(), i.put(a, n)), await w(t);
		} catch {
			u = !0;
		}
	}
	let p = (e) => Math.min(o, i - e * o), m = /* @__PURE__ */ new Map();
	function h(e) {
		let t, n, r = new Promise((e, r) => {
			t = e, n = r;
		});
		return r.catch(() => {}), m.set(e, r), {
			resolve: t,
			reject: n,
			promise: r
		};
	}
	return async function(t, n, r, i) {
		if (i === 0) return;
		let a = Math.floor(r / o), s = Math.floor((r + i - 1) / o), c = await d(a, s), l = [], u = (e, a) => {
			let s = a * o, c = Math.max(r, s), l = Math.min(r + i, s + p(a));
			t.set(e.subarray(c - s, l - s), n + (c - r));
		}, g = a;
		for (; g <= s;) {
			let a = g * o, d = a + p(g), f = c.get(g);
			if (f) {
				u(f, g), g++;
				continue;
			}
			let _ = m.get(g);
			if (_) {
				u(await _, g), g++;
				continue;
			}
			if (a >= r && d <= r + i) {
				let u = g;
				for (; u + 1 <= s && !c.get(u + 1) && !m.get(u + 1) && (u + 1) * o + p(u + 1) <= r + i;) u++;
				let d = a, f = u * o + p(u), _ = [];
				for (let e = g; e <= u; e++) _.push(h(e));
				try {
					await e(t, n + (d - r), d, f - d);
				} catch (e) {
					for (let t = g; t <= u; t++) _[t - g].reject(e), m.delete(t);
					throw e;
				}
				for (let e = g; e <= u; e++) {
					let i = e * o, a = t.slice(n + (i - r), n + (i - r) + p(e));
					_[e - g].resolve(a), l.push({
						index: e,
						data: a
					});
				}
				g = u + 1;
			} else {
				let t = h(g), n = new Uint8Array(p(g));
				try {
					await e(n, 0, a, n.length);
				} catch (e) {
					throw t.reject(e), m.delete(g), e;
				}
				t.resolve(n), u(n, g), l.push({
					index: g,
					data: n
				}), g++;
			}
		}
		await f(l);
		for (let e of l) m.delete(e.index);
	};
}
var k = 65536;
async function A(e) {
	let t = e.url, n = await fetch(t, { headers: { Range: "bytes=0-0" } });
	if (n.status === 206) {
		let r = n.headers.get("content-range"), i = r ? /\/(\d+)\s*$/.exec(r) : null;
		if (i) {
			let r = parseInt(i[1]);
			await n.arrayBuffer();
			let a = M(n), o = null, s = async function(e, n, r, i) {
				if (!o) try {
					return await L(t, a, e, n, r, i);
				} catch (e) {
					if (!e || !e.degradeToFull) throw e;
					o = e.fullBodyPromise;
				}
				let s = await o;
				if (r + i > s.byteLength) throw Error(t + ": read past the end of the buffered body");
				e.set(s.subarray(r, r + i), n);
			}, c = Math.min(e.pageSize || k, k);
			return e.persistentCache && (s = await O(s, {
				fileKey: t,
				validator: a,
				totalSize: r,
				options: e.persistentCache
			})), new y(s, r, e.cacheSize, c);
		}
		return await n.arrayBuffer(), await j(t);
	}
	if (!n.ok && n.status !== 416) throw Error("HTTP " + n.status + " fetching " + t);
	if (n.status === 416) {
		let e = n.headers.get("content-range");
		return e && /\/0\s*$/.test(e) ? r({
			type: "mem",
			data: /* @__PURE__ */ new Uint8Array()
		}) : await j(t);
	}
	return r({
		type: "mem",
		data: new Uint8Array(await n.arrayBuffer())
	});
}
async function j(e) {
	let t = await fetch(e);
	if (!t.ok) throw Error("HTTP " + t.status + " fetching " + e);
	return r({
		type: "mem",
		data: new Uint8Array(await t.arrayBuffer())
	});
}
function M(e) {
	let t = e.headers.get("etag");
	return t && t.indexOf("W/") !== 0 ? t : e.headers.get("last-modified") || null;
}
var N = 4, P = 0, F = [];
async function I(e) {
	for (; P >= N;) await new Promise((e) => F.push(e));
	P++;
	try {
		return await e();
	} finally {
		P--;
		let e = F.shift();
		e && e();
	}
}
async function L(e, t, n, r, i, a) {
	return I(() => R(e, t, n, r, i, a));
}
async function R(e, t, n, r, i, a) {
	let o = { Range: "bytes=" + i + "-" + (i + a - 1) };
	t && (o["If-Range"] = t);
	let s = await fetch(e, { headers: o });
	if (s.status === 200) {
		let n = M(s);
		if (!t || n && n === t) {
			let t = /* @__PURE__ */ Error(e + ": origin ignored Range; degrading to full buffering");
			throw t.degradeToFull = !0, t.fullBodyPromise = s.arrayBuffer().then((e) => new Uint8Array(e)), t;
		}
		throw await z(s), Error(e + ": file changed (or server stopped honoring Range) while reading");
	}
	if (s.status !== 206) throw await z(s), Error("HTTP " + s.status + " reading range " + i + "+" + a + " of " + e);
	let c = s.headers.get("content-range"), l = c ? /bytes\s+(\d+)-(\d+)\//.exec(c) : null;
	if (l && parseInt(l[1]) !== i) throw await z(s), Error(e + ": server returned range starting at " + l[1] + ", requested " + i);
	let u = 0;
	if (s.body && typeof s.body.getReader == "function") {
		let t = s.body.getReader();
		for (;;) {
			let i = await t.read();
			if (i.done) break;
			if (u + i.value.byteLength > a) throw t.cancel().catch(function() {}), Error(e + ": range response longer than requested");
			n.set(i.value, r + u), u += i.value.byteLength;
		}
	} else {
		/* c8 ignore start */
		let t = new Uint8Array(await s.arrayBuffer());
		if (t.byteLength > a) throw Error(e + ": range response longer than requested");
		n.set(t, r), u = t.byteLength;
	}
	if (u !== a) throw Error(e + ": short range response (" + u + "/" + a + " bytes at " + i + ")");
}
async function z(e) {
	try {
		e.body && typeof e.body.cancel == "function" ? await e.body.cancel() : await e.arrayBuffer();
	} catch {}
}
var B = 1 << 20;
function V(e) {
	let t = e.blob, n = async function(e, n, r, i) {
		let a = await t.slice(r, r + i).arrayBuffer();
		if (a.byteLength !== i) throw Error("short blob read (" + a.byteLength + "/" + i + " bytes at " + r + ")");
		e.set(new Uint8Array(a), n);
	}, r = Math.min(e.pageSize || B, B);
	return new y(n, t.size, e.cacheSize, r);
}
function H() {
	throw Error("File I/O is not supported in the browser");
}
function U(e) {
	return e instanceof Uint8Array ? {
		type: "mem",
		data: e
	} : (typeof e == "string" && H(), e);
}
function W(e, t, n) {
	if (e.type === "file" && H(), e.type === "mem") return t(e);
	if (e.type === "bigMem") return n(e);
	throw Error("Invalid FastFile type: " + e.type);
}
function G(e) {
	return W(U(e), n, u);
}
async function K(e, t, n) {
	return e instanceof Uint8Array && (e = {
		type: "mem",
		data: e
	}), typeof Blob < "u" && e instanceof Blob && (e = {
		type: "blob",
		blob: e,
		cacheSize: t,
		pageSize: n
	}), typeof e == "string" && (e = {
		type: "http",
		url: e,
		cacheSize: t,
		pageSize: n
	}), e.type === "http" ? await A(e) : e.type === "blob" ? V(e) : W(e, r, d);
}
//#endregion
//#region src/binfileutils.js
var q = 1 << 30;
async function J(e, t, n, r, i) {
	let a = await K(e, r, i), o = await a.read(4), s = "";
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
async function Y(e, t, n, r, i, a) {
	let o = await G(e, i, a), s = /* @__PURE__ */ new Uint8Array(4);
	for (let e = 0; e < 4; e++) s[e] = t.charCodeAt(e);
	return await o.write(s, 0), await o.writeULE32(n), await o.writeULE32(r), o;
}
async function X(e, t) {
	if (e.writingSection !== void 0) throw Error("Already writing a section");
	await e.writeULE32(t), e.writingSection = { pSectionSize: e.pos }, await e.writeULE64(0);
}
async function Z(e) {
	if (e.writingSection === void 0) throw Error("Not writing a section");
	let t = e.pos - e.writingSection.pSectionSize - 8, n = e.pos;
	e.pos = e.writingSection.pSectionSize, await e.writeULE64(t), e.pos = n, delete e.writingSection;
}
async function Q(e, t, n) {
	if (e.readingSection !== void 0) throw Error("Already reading a section");
	if (!t[n]) throw Error(e.fileName + ": Missing section " + n);
	if (t[n].length > 1) throw Error(e.fileName + ": Section Duplicated " + n);
	e.pos = t[n][0].p, e.readingSection = t[n][0];
}
async function $(e, t) {
	if (e.readingSection === void 0) throw Error("Not reading a section");
	if (!t && e.pos - e.readingSection.p != e.readingSection.size) throw Error("Invalid section size reading");
	delete e.readingSection;
}
async function re(e, n, r, i) {
	let a = new Uint8Array(r);
	t.toRprLE(a, 0, n, r), await e.write(a, i);
}
async function ie(e, n, r) {
	let i = await e.read(n, r);
	return t.fromRprLE(i, 0, n);
}
async function ae(e, t, n, r, i) {
	i === void 0 && (i = t[r][0].size);
	let a = e.pageSize;
	await Q(e, t, r), await X(n, r);
	for (let t = 0; t < i; t += a) {
		let r = Math.min(i - t, a), o = await e.read(r);
		await n.write(o);
	}
	await Z(n), await $(e, i != t[r][0].size);
}
async function oe(t, n, r, i, a) {
	if (i = i === void 0 ? 0 : i, a = a === void 0 ? n[r][0].size - i : a, i + a > n[r][0].size) throw Error("Reading out of the range of the section");
	let o;
	return o = a < q ? new Uint8Array(a) : new e(a), await t.readToBuffer(o, 0, a, n[r][0].p + i), o;
}
async function se(e, t, n, r, i) {
	let a = e.pageSize * 16;
	if (await Q(e, t, i), await Q(n, r, i), t[i][0].size != r[i][0].size) return !1;
	let o = t[i][0].size;
	for (let t = 0; t < o; t += a) {
		let r = Math.min(o - t, a), i = await e.read(r), s = await n.read(r);
		for (let e = 0; e < r; e++) if (i[e] != s[e]) return !1;
	}
	return await $(e), await $(n), !0;
}
//#endregion
export { ae as copySection, Y as createBinFile, $ as endReadSection, Z as endWriteSection, ie as readBigInt, J as readBinFile, oe as readSection, se as sectionIsEqual, Q as startReadUniqueSection, X as startWriteSection, re as writeBigInt };

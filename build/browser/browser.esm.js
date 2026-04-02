import { BigBuffer as e, Scalar as t } from "ffjavascript";
//#region ../fastfile/build/browser/browser.esm.js
function n(e) {
	let t = e.initialSize || 1 << 20, n = new c();
	return n.o = e, n.o.data = new Uint8Array(t), n.allocSize = t, n.totalSize = 0, n.readOnly = !1, n.pos = 0, n;
}
function r(e) {
	let t = new c();
	return t.o = e, t.allocSize = e.data.byteLength, t.totalSize = e.data.byteLength, t.readOnly = !0, t.pos = 0, t;
}
var i = new Uint8Array(4), a = new DataView(i.buffer), o = new Uint8Array(8), s = new DataView(o.buffer), c = class {
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
		if (t === void 0 && (t = this.pos), this.readOnly) throw Error("Writing a read only file");
		this._resizeIfNeeded(t + e.byteLength), this.o.data.set(e.slice(), t), t + e.byteLength > this.totalSize && (this.totalSize = t + e.byteLength), this.pos = t + e.byteLength;
	}
	async readToBuffer(e, t, n, r) {
		if (r === void 0 && (r = this.pos), this.readOnly && r + n > this.totalSize) throw Error("Reading out of bounds");
		this._resizeIfNeeded(r + n);
		let i = new Uint8Array(this.o.data.buffer, this.o.data.byteOffset + r, n);
		e.set(i, t), this.pos = r + n;
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
		if (n > this.totalSize) {
			if (this.readOnly) throw Error("Reading out of bounds");
			this._resizeIfNeeded(e);
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
var f = new Uint8Array(4), p = new DataView(f.buffer), m = new Uint8Array(8), h = new DataView(m.buffer), g = class {
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
			let o = Math.min(2048, t.o.data[e].length - a), s = new Uint8Array(t.o.data[e].buffer, a, o), c = s.findIndex((e) => e === 0);
			r = c !== -1, r ? (i += new TextDecoder().decode(s.slice(0, c)), t.pos = e * l + a + c + 1) : (i += new TextDecoder().decode(s), t.pos = e * l + a + s.length), n = t.pos;
		}
		return i;
	}
}, _ = 65536;
function v() {
	throw Error("File I/O is not supported in the browser");
}
function y(e, t) {
	return e instanceof Uint8Array ? {
		type: "mem",
		data: e
	} : typeof e == "string" ? {
		type: "mem",
		initialSize: t || _
	} : e;
}
async function b(e) {
	let t = await fetch(e).then((e) => e.arrayBuffer());
	return {
		type: "mem",
		data: new Uint8Array(t)
	};
}
function x(e, t, n) {
	if (e.type === "file" && v(), e.type === "mem") return t(e);
	if (e.type === "bigMem") return n(e);
	throw Error("Invalid FastFile type: " + e.type);
}
function S(e, t) {
	return x(y(e, t), n, u);
}
async function C(e) {
	return e = typeof e == "string" ? await b(e) : y(e), x(e, r, d);
}
//#endregion
//#region src/binfileutils.js
var w = typeof Buffer < "u" && Buffer.constants && Buffer.constants.MAX_LENGTH ? Buffer.constants.MAX_LENGTH : 1 << 30;
async function T(e, t, n, r, i) {
	let a = await C(e, r, i), o = await a.read(4), s = "";
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
async function E(e, t, n, r, i, a) {
	let o = await S(e, i, a), s = new Uint8Array(4);
	for (let e = 0; e < 4; e++) s[e] = t.charCodeAt(e);
	return await o.write(s, 0), await o.writeULE32(n), await o.writeULE32(r), o;
}
async function D(e, t) {
	if (e.writingSection !== void 0) throw Error("Already writing a section");
	await e.writeULE32(t), e.writingSection = { pSectionSize: e.pos }, await e.writeULE64(0);
}
async function O(e) {
	if (e.writingSection === void 0) throw Error("Not writing a section");
	let t = e.pos - e.writingSection.pSectionSize - 8, n = e.pos;
	e.pos = e.writingSection.pSectionSize, await e.writeULE64(t), e.pos = n, delete e.writingSection;
}
async function k(e, t, n) {
	if (e.readingSection !== void 0) throw Error("Already reading a section");
	if (!t[n]) throw Error(e.fileName + ": Missing section " + n);
	if (t[n].length > 1) throw Error(e.fileName + ": Section Duplicated " + n);
	e.pos = t[n][0].p, e.readingSection = t[n][0];
}
async function A(e, t) {
	if (e.readingSection === void 0) throw Error("Not reading a section");
	if (!t && e.pos - e.readingSection.p != e.readingSection.size) throw Error("Invalid section size reading");
	delete e.readingSection;
}
async function j(e, n, r, i) {
	let a = new Uint8Array(r);
	t.toRprLE(a, 0, n, r), await e.write(a, i);
}
async function M(e, n, r) {
	let i = await e.read(n, r);
	return t.fromRprLE(i, 0, n);
}
async function N(e, t, n, r, i) {
	i === void 0 && (i = t[r][0].size);
	let a = e.pageSize;
	await k(e, t, r), await D(n, r);
	for (let t = 0; t < i; t += a) {
		let r = Math.min(i - t, a), o = await e.read(r);
		await n.write(o);
	}
	await O(n), await A(e, i != t[r][0].size);
}
async function P(t, n, r, i, a) {
	if (i = i === void 0 ? 0 : i, a = a === void 0 ? n[r][0].size - i : a, console.time("readSection idSection=" + r + " offset=" + i + " length=" + a), i + a > n[r][0].size) throw Error("Reading out of the range of the section");
	let o;
	return o = a < w ? new Uint8Array(a) : new e(a), await t.readToBuffer(o, 0, a, n[r][0].p + i), console.timeEnd("readSection idSection=" + r + " offset=" + i + " length=" + a), o;
}
async function F(e, t, n, r, i) {
	let a = e.pageSize * 16;
	if (await k(e, t, i), await k(n, r, i), t[i][0].size != r[i][0].size) return !1;
	let o = t[i][0].size;
	for (let t = 0; t < o; t += a) {
		let r = Math.min(o - t, a), i = await e.read(r), s = await n.read(r);
		for (let e = 0; e < r; e++) if (i[e] != s[e]) return !1;
	}
	return await A(e), await A(n), !0;
}
//#endregion
export { N as copySection, E as createBinFile, A as endReadSection, O as endWriteSection, M as readBigInt, T as readBinFile, P as readSection, F as sectionIsEqual, k as startReadUniqueSection, D as startWriteSection, j as writeBigInt };

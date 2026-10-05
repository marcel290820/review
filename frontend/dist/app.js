//#region node_modules/svelte/src/internal/shared/utils.js
var e = Array.isArray, t = Array.prototype.indexOf, n = Array.prototype.includes, r = Array.from, i = Object.defineProperty, a = Object.getOwnPropertyDescriptor, o = Object.getOwnPropertyDescriptors, s = Object.prototype, c = Array.prototype, l = Object.getPrototypeOf, u = Object.isExtensible, d = () => {};
function f(e) {
	for (var t = 0; t < e.length; t++) e[t]();
}
function p() {
	var e, t;
	return {
		promise: new Promise((n, r) => {
			e = n, t = r;
		}),
		resolve: e,
		reject: t
	};
}
var m = 1024, h = 2048, g = 4096, _ = 8192, v = 16384, y = 32768, b = 1 << 25, x = 65536, S = 1 << 19, ee = 1 << 20, te = 1 << 25, ne = 1 << 21, re = 1 << 22, C = 1 << 23, ie = Symbol("$state"), ae = Symbol("component"), oe = Symbol(""), se = Symbol("attributes"), ce = Symbol("class"), le = Symbol("style"), ue = Symbol("text"), de = Symbol("form reset"), fe = new class extends Error {
	name = "StaleReactionError";
	message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
}(), pe = !!globalThis.document?.contentType && /* @__PURE__ */ globalThis.document.contentType.includes("xml"), me = {}, w = Symbol("uninitialized"), he = "http://www.w3.org/1999/xhtml", ge = "http://www.w3.org/2000/svg", _e = "http://www.w3.org/1998/Math/MathML";
function ve() {
	console.warn("https://svelte.dev/e/derived_inert");
}
function ye(e) {
	console.warn("https://svelte.dev/e/hydration_mismatch");
}
function be() {
	console.warn("https://svelte.dev/e/select_multiple_invalid_value");
}
function xe() {
	console.warn("https://svelte.dev/e/svelte_boundary_reset_noop");
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/hydration.js
var T = !1;
function Se(e) {
	T = e;
}
var E;
function D(e) {
	if (e === null) throw ye(), me;
	return E = e;
}
function Ce() {
	return D(/* @__PURE__ */ tn(E));
}
function O(e) {
	if (T) {
		if (/* @__PURE__ */ tn(E) !== null) throw ye(), me;
		E = e;
	}
}
function we(e = 1) {
	if (T) {
		for (var t = e, n = E; t--;) n = /* @__PURE__ */ tn(n);
		E = n;
	}
}
function Te(e = !0) {
	for (var t = 0, n = E;;) {
		if (n.nodeType === 8) {
			var r = n.data;
			if (r === "]") {
				if (t === 0) return n;
				--t;
			} else (r === "[" || r === "[!" || r[0] === "[" && !isNaN(Number(r.slice(1)))) && (t += 1);
		}
		var i = /* @__PURE__ */ tn(n);
		e && n.remove(), n = i;
	}
}
function Ee(e) {
	if (!e || e.nodeType !== 8) throw ye(), me;
	return e.data;
}
//#endregion
//#region node_modules/svelte/src/internal/client/reactivity/equality.js
function De(e) {
	return e === this.v;
}
function Oe(e, t) {
	return e == e ? e !== t || typeof e == "object" && !!e || typeof e == "function" : t == t;
}
function ke(e) {
	return !Oe(e, this.v);
}
function Ae(e) {
	throw Error("https://svelte.dev/e/lifecycle_outside_component");
}
//#endregion
//#region node_modules/svelte/src/internal/client/errors.js
function je() {
	throw Error("https://svelte.dev/e/async_derived_orphan");
}
function Me(e, t, n) {
	throw Error("https://svelte.dev/e/each_key_duplicate");
}
function Ne(e) {
	throw Error("https://svelte.dev/e/effect_in_teardown");
}
function Pe() {
	throw Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function Fe(e) {
	throw Error("https://svelte.dev/e/effect_orphan");
}
function Ie() {
	throw Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function Le() {
	throw Error("https://svelte.dev/e/state_descriptors_fixed");
}
function Re() {
	throw Error("https://svelte.dev/e/state_prototype_fixed");
}
function ze() {
	throw Error("https://svelte.dev/e/state_unsafe_mutation");
}
function Be() {
	throw Error("https://svelte.dev/e/svelte_boundary_reset_onerror");
}
//#endregion
//#region node_modules/svelte/src/internal/client/context.js
var k = null;
function Ve(e) {
	k = e;
}
function He(e, t = !1, n) {
	k = {
		p: k,
		i: !1,
		c: null,
		e: null,
		s: e,
		x: null,
		r: W,
		l: null
	};
}
function Ue(e) {
	var t = k, n = t.e;
	if (n !== null) {
		t.e = null;
		for (var r of n) gn(r);
	}
	return e !== void 0 && (t.x = e), t.i = !0, k = t.p, We(e);
}
function We(e = {}) {
	return i(e, ae, { value: !0 }), e;
}
function Ge() {
	return !0;
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/task.js
var Ke = [];
function qe() {
	var e = Ke;
	Ke = [], f(e);
}
function Je(e) {
	if (Ke.length === 0 && !St) {
		var t = Ke;
		queueMicrotask(() => {
			t === Ke && qe();
		});
	}
	Ke.push(e);
}
function Ye() {
	for (; Ke.length > 0;) qe();
}
//#endregion
//#region node_modules/svelte/src/internal/client/reactivity/status.js
var Xe = ~(h | g | m);
function A(e, t) {
	e.f = e.f & Xe | t;
}
function Ze(e) {
	e.f & 512 || e.deps === null ? A(e, m) : A(e, g);
}
//#endregion
//#region node_modules/svelte/src/internal/client/reactivity/utils.js
function Qe(e, t, n) {
	e.f & 2048 ? t.add(e) : e.f & 4096 && n.add(e), A(e, m);
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/elements/misc.js
function $e(e) {
	T && /* @__PURE__ */ F(e) !== null && rn(e);
}
var et = !1;
function tt() {
	et || (et = !0, document.addEventListener("reset", (e) => {
		Promise.resolve().then(() => {
			if (!e.defaultPrevented) for (let t of e.target.elements) t[de]?.();
		});
	}, { capture: !0 }));
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/elements/bindings/shared.js
function nt(e) {
	var t = H, n = W;
	U(null), Ln(null);
	try {
		return e();
	} finally {
		U(t), Ln(n);
	}
}
function rt(e, t, n, r = n) {
	e.addEventListener(t, () => nt(n));
	let i = e[de];
	e[de] = i ? () => {
		i(), r(!0);
	} : () => r(!0), tt();
}
//#endregion
//#region node_modules/svelte/src/internal/client/reactivity/async.js
function it(e, t, n, r) {
	let i = Ge() ? ct : ft;
	var a = e.filter((e) => !e.settled), o = t.map(i);
	if (n.length === 0 && a.length === 0) {
		r(o);
		return;
	}
	var s = W, c = at(), l = a.length === 1 ? a[0].promise : a.length > 1 ? Promise.all(a.map((e) => e.promise)) : null;
	function u(e) {
		if (!(s.f & 16384)) {
			c();
			try {
				r([...o, ...e]);
			} catch (e) {
				ln(e, s);
			}
			ot();
		}
	}
	var d = st();
	if (n.length === 0) {
		l.then(() => u([])).finally(d);
		return;
	}
	function f() {
		Promise.all(n.map((e) => /* @__PURE__ */ ut(e))).then(u).catch((e) => ln(e, s)).finally(d);
	}
	l ? l.then(() => {
		c(), f(), ot();
	}) : f();
}
function at() {
	var e = W, t = H, n = k, r = j;
	return function(i = !0) {
		Ln(e), U(t), Ve(n), i && !(e.f & 16384) && (r?.activate(), r?.apply());
	};
}
function ot(e = !0) {
	Ln(null), U(null), Ve(null), e && j?.deactivate();
}
function st() {
	var e = W, t = e.b, n = j, r = !!t?.is_rendered();
	return t?.update_pending_count(1, n), n.increment(r, e), () => {
		t?.update_pending_count(-1, n), n.decrement(r, e);
	};
}
/*#__NO_SIDE_EFFECTS__*/
function ct(e) {
	var t = 2 | h;
	return W !== null && (W.f |= S), {
		ctx: k,
		deps: null,
		effects: null,
		equals: De,
		f: t,
		fn: e,
		reactions: null,
		rv: 0,
		v: w,
		wv: 0,
		parent: W,
		ac: null
	};
}
var lt = Symbol("obsolete");
/*#__NO_SIDE_EFFECTS__*/
function ut(e, t, n) {
	let r = W;
	r === null && je();
	var i = void 0, a = zt(w), o = !H, s = /* @__PURE__ */ new Set();
	return yn(() => {
		var t = W, n = p();
		i = n.promise;
		try {
			Promise.resolve(e()).then(n.resolve, (e) => {
				e !== fe && n.reject(e);
			}).finally(ot);
		} catch (e) {
			n.reject(e), ot();
		}
		var c = j;
		if (o) {
			if (t.f & 32768) var l = st();
			if (r.b?.is_rendered()) c.async_deriveds.get(t)?.reject(lt);
			else for (let e of s.values()) e.reject(lt);
			s.add(n), c.async_deriveds.set(t, n);
		}
		let u = (e, t = void 0) => {
			l?.(), s.delete(n), t !== lt && (c.activate(), t ? (a.f |= C, Ut(a, t)) : (a.f & 8388608 && (a.f ^= C), Ut(a, e)), c.deactivate());
		};
		n.promise.then(u, (e) => u(null, e || "unknown"));
	}), mn(() => {
		for (let e of s) e.reject(lt);
	}), new Promise((e) => {
		function t(n) {
			function r() {
				n === i ? e(a) : t(i);
			}
			n.then(r, r);
		}
		t(i);
	});
}
/*#__NO_SIDE_EFFECTS__*/
function dt(e) {
	let t = /* @__PURE__ */ ct(e);
	return zn(t), t;
}
/*#__NO_SIDE_EFFECTS__*/
function ft(e) {
	let t = /* @__PURE__ */ ct(e);
	return t.equals = ke, t;
}
function pt(e) {
	var t = e.effects;
	if (t !== null) {
		e.effects = null;
		for (var n = 0; n < t.length; n += 1) V(t[n]);
	}
}
function mt(e) {
	var t, n = W, r = e.parent;
	if (!Pn && r !== null && e.v !== w && r.f & 24576) return ve(), e.v;
	Ln(r);
	try {
		pt(e), t = Jn(e);
	} finally {
		Ln(n);
	}
	return t;
}
function ht(e) {
	var t = mt(e);
	if (!e.equals(t) && (e.wv = Gn(), (!j?.is_fork || e.deps === null) && (j === null ? e.v = t : (j.capture(e, t, !0), yt?.capture(e, t, !0)), e.deps === null))) {
		A(e, m);
		return;
	}
	Pn || (bt === null ? Ze(e) : (pn() || j?.is_fork) && bt.set(e, t));
}
function gt(e) {
	if (e.effects !== null) for (let t of e.effects) (t.teardown || t.ac) && (t.teardown?.(), t.ac !== null && nt(() => {
		t.ac.abort(fe), t.ac = null;
	}), t.fn !== null && (t.teardown = d), Zn(t, 0), Cn(t));
}
function _t(e) {
	if (e.effects !== null) for (let t of e.effects) t.teardown && t.fn !== null && Qn(t);
}
//#endregion
//#region node_modules/svelte/src/internal/client/reactivity/batch.js
var vt = null, j = null, yt = null, bt = null, xt = null, St = !1, Ct = !1, wt = null, Tt = null, Et = 0, Dt = 1, Ot = class e {
	id = Dt++;
	#e = !1;
	linked = !0;
	#t = null;
	#n = null;
	async_deriveds = /* @__PURE__ */ new Map();
	current = /* @__PURE__ */ new Map();
	previous = /* @__PURE__ */ new Map();
	#r = /* @__PURE__ */ new Set();
	#i = /* @__PURE__ */ new Set();
	#a = 0;
	#o = /* @__PURE__ */ new Map();
	#s = null;
	#c = [];
	#l = [];
	#u = /* @__PURE__ */ new Set();
	#d = /* @__PURE__ */ new Set();
	#f = /* @__PURE__ */ new Map();
	#p = /* @__PURE__ */ new Set();
	is_fork = !1;
	#m = !1;
	constructor() {
		vt === null ? vt = this : (vt.#n = this, this.#t = vt), vt = this;
	}
	#h() {
		if (this.is_fork) return !0;
		for (let n of this.#o.keys()) {
			for (var e = n, t = !1; e.parent !== null;) {
				if (this.#f.has(e)) {
					t = !0;
					break;
				}
				e = e.parent;
			}
			if (!t) return !0;
		}
		return !1;
	}
	skip_effect(e) {
		this.#f.has(e) || this.#f.set(e, {
			d: [],
			m: []
		}), this.#p.delete(e);
	}
	unskip_effect(e, t = (e) => this.schedule(e)) {
		var n = this.#f.get(e);
		if (n) {
			this.#f.delete(e);
			for (var r of n.d) A(r, h), t(r);
			for (r of n.m) A(r, g), t(r);
		}
		this.#p.add(e);
	}
	#g() {
		var e = [];
		for (let i of this.#c) if (!(i.f & 16384 || !(i.f & 6144))) {
			for (var t = i, n = !1; t.parent !== null;) {
				t = t.parent;
				var r = t.f;
				if (r & 96) {
					if (!(r & 1024)) {
						n = !0;
						break;
					}
					t.f ^= m;
				}
			}
			n || e.push(t);
		}
		return this.#c = [], e;
	}
	#_() {
		this.#e = !0;
		for (let e of this.#u) this.#d.delete(e), A(e, h), this.schedule(e);
		for (let e of this.#d) A(e, g), this.schedule(e);
		this.apply();
		for (var t = wt = [], n = [], r = Tt = []; this.#c.length > 0;) {
			Et++ > 1e3 && (this.#S(), At());
			for (let e of this.#g()) try {
				this.#v(e, t, n);
			} catch (t) {
				throw Ft(e), this.#h() || this.discard(), t;
			}
		}
		if (j = null, r.length > 0) {
			var i = e.ensure();
			for (let e of r) i.schedule(e);
		}
		if (wt = null, Tt = null, this.#h()) {
			this.#x(n), this.#x(t);
			for (let [e, t] of this.#f) Pt(e, t);
			r.length > 0 && j.#_();
			return;
		}
		let a = this.#y();
		if (a) {
			this.#x(n), this.#x(t), a.#b(this);
			return;
		}
		this.#u.clear(), this.#d.clear();
		for (let e of this.#r) e(this);
		this.#r.clear(), yt = this, Mt(n), Mt(t), yt = null, this.#s?.resolve();
		var o = j;
		if (this.#a === 0 && (this.#c.length === 0 || o !== null) && this.#S(), this.#c.length > 0) {
			if (o !== null) {
				for (let e of this.#c) o.#c.push(e);
				this.#c = [];
			} else o = this;
		}
		o !== null && (Lt.clear(), o.#_());
	}
	#v(e, t, n) {
		e.f ^= m;
		for (var r = e.first; r !== null;) {
			var i = r.f, a = !!(i & 96);
			if (!(a && i & 1024 || i & 8192 || this.#f.has(r)) && r.fn !== null) {
				a ? r.f ^= m : i & 4 ? t.push(r) : Kn(r) && (i & 16 && this.#d.add(r), Qn(r));
				var o = r.first;
				if (o !== null) {
					r = o;
					continue;
				}
			}
			for (; r !== null;) {
				var s = r.next;
				if (s !== null) {
					r = s;
					break;
				}
				r = r.parent;
			}
		}
	}
	#y() {
		for (var e = this.#t; e !== null;) {
			if (!e.is_fork) {
				for (let [t, [, n]] of this.current) if (e.current.has(t) && !n) return e;
			}
			e = e.#t;
		}
		return null;
	}
	#b(e) {
		for (let [t, n] of e.current) !this.previous.has(t) && e.previous.has(t) && this.previous.set(t, e.previous.get(t)), this.current.set(t, n);
		for (let [t, n] of e.async_deriveds) {
			let e = this.async_deriveds.get(t);
			e && n.promise.then(e.resolve).catch(e.reject);
		}
		e.async_deriveds.clear(), this.transfer_effects(e.#u, e.#d);
		let t = (e) => {
			var n = e.reactions;
			if (n !== null && !(e.f & 2 && !(e.f & 6144))) for (let e of n) {
				var r = e.f;
				if (r & 2) t(e);
				else {
					var i = e;
					r & 4194320 && !this.async_deriveds.has(i) && (this.#d.delete(i), A(i, h), this.schedule(i));
				}
			}
		};
		for (let e of this.current.keys()) t(e);
		this.oncommit(() => e.discard()), e.#S(), j = this, this.#_();
	}
	#x(e) {
		for (var t = 0; t < e.length; t += 1) Qe(e[t], this.#u, this.#d);
	}
	capture(e, t, n = !1) {
		e.v !== w && !this.previous.has(e) && this.previous.set(e, e.v), e.f & 8388608 || (this.current.set(e, [t, n]), bt?.set(e, t)), this.is_fork || (e.v = t);
	}
	activate() {
		j = this;
	}
	deactivate() {
		j = null, bt = null;
	}
	flush() {
		try {
			Ct = !0, j = this, this.#_();
		} finally {
			Et = 0, xt = null, wt = null, Tt = null, Ct = !1, j = null, bt = null, Lt.clear();
		}
	}
	discard() {
		for (let e of this.#i) e(this);
		this.#i.clear();
		for (let e of this.async_deriveds.values()) e.reject(lt);
		this.#S(), this.#s?.resolve();
	}
	register_created_effect(e) {
		this.#l.push(e);
	}
	increment(e, t) {
		if (this.#a += 1, e) {
			let e = this.#o.get(t) ?? 0;
			this.#o.set(t, e + 1);
		}
	}
	decrement(e, t) {
		if (--this.#a, e) {
			let e = this.#o.get(t) ?? 0;
			e === 1 ? this.#o.delete(t) : this.#o.set(t, e - 1);
		}
		this.#m || (this.#m = !0, Je(() => {
			this.#m = !1, this.linked && this.flush();
		}));
	}
	transfer_effects(e, t) {
		for (let t of e) this.#u.add(t);
		for (let e of t) this.#d.add(e);
		e.clear(), t.clear();
	}
	oncommit(e) {
		this.#r.add(e);
	}
	ondiscard(e) {
		this.#i.add(e);
	}
	settled() {
		return (this.#s ??= p()).promise;
	}
	static ensure() {
		if (j === null) {
			let t = j = new e();
			!Ct && !St && Je(() => {
				t.#e || t.flush();
			});
		}
		return j;
	}
	apply() {
		bt = null;
	}
	schedule(e) {
		if (xt = e, e.b?.is_pending && e.f & 16777228 && !(e.f & 32768)) {
			e.b.defer_effect(e);
			return;
		}
		this.#c.push(e);
	}
	#S() {
		if (this.linked) {
			var e = this.#t, t = this.#n;
			e === null || (e.#n = t), t === null ? vt = e : t.#t = e, this.linked = !1;
		}
	}
};
function kt(e) {
	var t = St;
	St = !0;
	try {
		var n;
		for (e && (j !== null && !j.is_fork && j.flush(), n = e());;) {
			if (Ye(), j === null) return n;
			j.flush();
		}
	} finally {
		St = t;
	}
}
function At() {
	try {
		Ie();
	} catch (e) {
		ln(e, xt);
	}
}
var jt = null;
function Mt(e) {
	var t = e.length;
	if (t !== 0) {
		for (var n = 0; n < t;) {
			var r = e[n++];
			if (!(r.f & 24576) && Kn(r) && (jt = /* @__PURE__ */ new Set(), Qn(r), r.deps === null && r.first === null && r.nodes === null && r.teardown === null && r.ac === null && En(r), jt?.size > 0)) {
				Lt.clear();
				for (let e of jt) {
					if (e.f & 24576) continue;
					let t = [e], n = e.parent;
					for (; n !== null;) jt.has(n) && (jt.delete(n), t.push(n)), n = n.parent;
					for (let e = t.length - 1; e >= 0; e--) {
						let n = t[e];
						n.f & 24576 || Qn(n);
					}
				}
				jt.clear();
			}
		}
		jt = null;
	}
}
function Nt(e) {
	j.schedule(e);
}
function Pt(e, t) {
	if (!(e.f & 32 && e.f & 1024)) {
		e.f & 2048 ? t.d.push(e) : e.f & 4096 && t.m.push(e), A(e, m);
		for (var n = e.first; n !== null;) Pt(n, t), n = n.next;
	}
}
function Ft(e) {
	A(e, m);
	for (var t = e.first; t !== null;) Ft(t), t = t.next;
}
//#endregion
//#region node_modules/svelte/src/internal/client/reactivity/sources.js
var It = /* @__PURE__ */ new Set(), Lt = /* @__PURE__ */ new Map(), Rt = !1;
function zt(e, t) {
	return {
		f: 0,
		v: e,
		reactions: null,
		equals: De,
		rv: 0,
		wv: 0
	};
}
/*#__NO_SIDE_EFFECTS__*/
function M(e, t) {
	let n = zt(e, t);
	return zn(n), n;
}
/*#__NO_SIDE_EFFECTS__*/
function Bt(e, t = !1, n = !0) {
	let r = zt(e);
	return t || (r.equals = ke), r;
}
function N(e, t, n = !1) {
	return H !== null && (!In || H.f & 131072) && Ge() && H.f & 4325394 && (Rn === null || !Rn.has(e)) && ze(), Ut(e, n ? qt(t) : t, Tt);
}
var Vt = null, Ht = 0;
function Ut(e, t, n = null) {
	if (!e.equals(t)) {
		Pn ? Lt.set(e, t) : Lt.has(e) || Lt.set(e, e.v);
		var r = Ot.ensure();
		if (r.capture(e, t), e.f & 2) {
			let t = e;
			e.f & 2048 && mt(t), bt === null && Ze(t);
		}
		e.wv = Gn(), Vt = null, Ht = 0, Kt(e, h, n), Vt = null, Ge() && W !== null && W.f & 1024 && !(W.f & 96) && (q === null ? Bn([e]) : q.push(e)), !r.is_fork && It.size > 0 && !Rt && Wt();
	}
	return t;
}
function Wt() {
	Rt = !1;
	for (let e of It) {
		e.f & 1024 && A(e, g);
		let t;
		try {
			t = Kn(e);
		} catch {
			t = !0;
		}
		t && Qn(e);
	}
	It.clear();
}
function Gt(e) {
	N(e, e.v + 1);
}
function Kt(e, t, n) {
	var r = e.reactions;
	if (r !== null) {
		var i = Ge(), a = r.length;
		if (Ht += a, Ht > 1e5 && Vt === null && (Vt = /* @__PURE__ */ new Set()), Vt !== null) {
			if (Vt.has(e)) return;
			Vt.add(e);
		}
		for (var o = 0; o < a; o++) {
			var s = r[o], c = s.f;
			if (i || s !== W) {
				var l = (c & h) === 0;
				if (l && A(s, t), c & 131072) It.add(s);
				else if (c & 2) {
					var u = s;
					bt?.delete(u), Kt(u, g, n);
				} else if (l) {
					var d = s;
					c & 16 && jt !== null && jt.add(d), n === null ? Nt(d) : n.push(d);
				}
			}
		}
	}
}
function qt(t) {
	if (typeof t != "object" || !t || ie in t || ae in t) return t;
	let n = l(t);
	if (n !== s && n !== c) return t;
	var r = /* @__PURE__ */ new Map(), i = e(t), o = /* @__PURE__ */ M(0), u = null, d = Un, f = (e) => {
		if (Un === d) return e();
		var t = H, n = Un;
		U(null), Wn(d);
		var r = e();
		return U(t), Wn(n), r;
	};
	return i && r.set("length", /* @__PURE__ */ M(t.length, u)), new Proxy(t, {
		defineProperty(e, t, n) {
			(!("value" in n) || n.configurable === !1 || n.enumerable === !1 || n.writable === !1) && Le();
			var i = r.get(t);
			return i === void 0 ? f(() => {
				var e = /* @__PURE__ */ M(n.value, u);
				return r.set(t, e), e;
			}) : N(i, n.value, !0), !0;
		},
		deleteProperty(e, t) {
			var n = r.get(t);
			if (n === void 0) {
				if (t in e) {
					let e = f(() => /* @__PURE__ */ M(w, u));
					r.set(t, e), Gt(o);
				}
			} else N(n, w), Gt(o);
			return !0;
		},
		get(e, n, i) {
			if (n === ie) return t;
			var o = r.get(n), s = n in e;
			if (o === void 0 && (!s || a(e, n)?.writable) && (o = f(() => /* @__PURE__ */ M(qt(s ? e[n] : w), u)), r.set(n, o)), o !== void 0) {
				var c = J(o);
				return c === w ? void 0 : c;
			}
			return Reflect.get(e, n, i);
		},
		getOwnPropertyDescriptor(e, t) {
			this.has?.(e, t);
			var n = Reflect.getOwnPropertyDescriptor(e, t), i = r.get(t);
			if (i !== void 0) {
				var a = J(i);
				if (a === w) return;
				if (n && "value" in n) n.value = a;
				else return {
					enumerable: !0,
					configurable: !0,
					value: a,
					writable: !0
				};
			}
			return n;
		},
		has(e, t) {
			if (t === ie) return !0;
			var n = r.get(t), i = n !== void 0 && n.v !== w || Reflect.has(e, t);
			return (n !== void 0 || W !== null && (!i || a(e, t)?.writable)) && (n === void 0 && (n = f(() => /* @__PURE__ */ M(i ? qt(e[t]) : w, u)), r.set(t, n)), J(n) === w) ? !1 : i;
		},
		set(e, t, n, s) {
			var c = r.get(t), l = t in e;
			if (i && t === "length") for (var d = n; d < c.v; d += 1) {
				var p = r.get(d + "");
				p === void 0 ? d in e && (p = f(() => /* @__PURE__ */ M(w, u)), r.set(d + "", p)) : N(p, w);
			}
			if (c === void 0) (!l || a(e, t)?.writable) && (c = f(() => /* @__PURE__ */ M(void 0, u)), N(c, qt(n)), r.set(t, c));
			else {
				l = c.v !== w;
				var m = f(() => qt(n));
				N(c, m);
			}
			var h = Reflect.getOwnPropertyDescriptor(e, t);
			if (h?.set && h.set.call(s, n), !l) {
				if (i && typeof t == "string") {
					var g = r.get("length"), _ = Number(t);
					Number.isInteger(_) && _ >= g.v && N(g, _ + 1);
				}
				Gt(o);
			}
			return !0;
		},
		ownKeys(e) {
			J(o);
			var t = Reflect.ownKeys(e).filter((e) => {
				var t = r.get(e);
				return t === void 0 || t.v !== w;
			});
			for (var [n, i] of r) i.v !== w && !(n in e) && t.push(n);
			return t;
		},
		setPrototypeOf() {
			Re();
		}
	});
}
function Jt(e) {
	try {
		if (typeof e == "object" && e && ie in e) return e[ie];
	} catch {}
	return e;
}
function Yt(e, t) {
	return Object.is(Jt(e), Jt(t));
}
var Xt, Zt, Qt, $t;
function en() {
	if (Xt === void 0) {
		Xt = window, Zt = /Firefox/.test(navigator.userAgent);
		var e = Element.prototype, t = Node.prototype, n = Text.prototype;
		Qt = a(t, "firstChild").get, $t = a(t, "nextSibling").get, u(e) && (e[ce] = void 0, e[se] = null, e[le] = void 0, e.__e = void 0), u(n) && (n[ue] = void 0);
	}
}
function P(e = "") {
	return document.createTextNode(e);
}
/*@__NO_SIDE_EFFECTS__*/
function F(e) {
	return Qt.call(e);
}
/*@__NO_SIDE_EFFECTS__*/
function tn(e) {
	return $t.call(e);
}
function I(e, t) {
	if (!T) return /* @__PURE__ */ F(e);
	var n = /* @__PURE__ */ F(E);
	if (n === null) n = E.appendChild(P());
	else if (t && n.nodeType !== 3) {
		var r = P();
		return n?.before(r), D(r), r;
	}
	return t && sn(n), D(n), n;
}
function nn(e, t = !1) {
	if (!T) {
		var n = /* @__PURE__ */ F(e);
		return n instanceof Comment && n.data === "" ? /* @__PURE__ */ tn(n) : n;
	}
	if (t) {
		if (E?.nodeType !== 3) {
			var r = P();
			return E?.before(r), D(r), r;
		}
		sn(E);
	}
	return E;
}
function L(e, t = !1) {
	if (!T) return /* @__PURE__ */ F(e);
	var n = I(e, t);
	return O(e), n;
}
function R(e, t = 1, n = !1) {
	let r = T ? E : e;
	for (var i; t--;) i = r, r = /* @__PURE__ */ tn(r);
	if (!T) return r;
	if (n) {
		if (r?.nodeType !== 3) {
			var a = P();
			return r === null ? i?.after(a) : r.before(a), D(a), a;
		}
		sn(r);
	}
	return D(r), r;
}
function rn(e) {
	e.textContent = "";
}
function an() {
	return !1;
}
function on(e, t, n) {
	return t == null || t === "http://www.w3.org/1999/xhtml" ? n ? document.createElement(e, { is: n }) : document.createElement(e) : n ? document.createElementNS(t, e, { is: n }) : document.createElementNS(t, e);
}
function sn(e) {
	if (e.nodeValue.length < 65536) return;
	let t = e.nextSibling;
	for (; t !== null && t.nodeType === 3;) t.remove(), e.nodeValue += t.nodeValue, t = e.nextSibling;
}
function cn(e) {
	var t = W;
	if (t === null) return H.f |= C, e;
	if (!(t.f & 32768) && !(t.f & 4)) throw e;
	ln(e, t);
}
function ln(e, t) {
	if (!(t !== null && t.f & 16384)) {
		for (; t !== null;) {
			if (t.f & 128 && !(t.f & 33570816)) {
				if (!(t.f & 32768)) throw e;
				try {
					t.b.error(e);
					return;
				} catch (t) {
					e = t;
				}
			}
			t = t.parent;
		}
		throw e;
	}
}
//#endregion
//#region node_modules/svelte/src/internal/client/reactivity/effects.js
function un(e) {
	W === null && (H === null && Fe(e), Pe()), Pn && Ne(e);
}
function dn(e, t) {
	var n = t.last;
	n === null ? t.last = t.first = e : (n.next = e, e.prev = n, t.last = e);
}
function fn(e, t) {
	var n = W;
	n !== null && n.f & 8192 && (e |= _);
	var r = {
		ctx: k,
		deps: null,
		nodes: null,
		f: e | h | 512,
		first: null,
		fn: t,
		last: null,
		next: null,
		parent: n,
		b: n && n.b,
		prev: null,
		teardown: null,
		wv: 0,
		ac: null
	};
	j?.register_created_effect(r);
	var i = r;
	if (e & 4) wt === null ? Ot.ensure().schedule(r) : wt.push(r);
	else if (t !== null) {
		try {
			Qn(r);
		} catch (e) {
			throw V(r), e;
		}
		i.deps === null && i.teardown === null && i.nodes === null && i.first === i.last && !(i.f & 524288) && (i = i.first, e & 16 && e & 65536 && i !== null && (i.f |= x));
	}
	if (i !== null && (i.parent = n, n !== null && dn(i, n), H !== null && H.f & 2 && !(e & 64))) {
		var a = H;
		(a.effects ??= []).push(i);
	}
	return r;
}
function pn() {
	return H !== null && !In;
}
function mn(e) {
	let t = fn(8, null);
	return A(t, m), t.teardown = e, t;
}
function hn(e) {
	un("$effect");
	var t = W.f;
	if (!H && t & 32 && k !== null && !k.i) {
		var n = k;
		(n.e ??= []).push(e);
	} else return gn(e);
}
function gn(e) {
	return fn(4 | ee, e);
}
function _n(e) {
	Ot.ensure();
	let t = fn(64 | S, e);
	return (e = {}) => new Promise((n) => {
		e.outro ? Dn(t, () => {
			V(t), n(void 0);
		}) : (V(t), n(void 0));
	});
}
function vn(e) {
	return fn(4, e);
}
function yn(e) {
	return fn(re | S, e);
}
function bn(e, t = 0) {
	return fn(8 | t, e);
}
function z(e, t = [], n = [], r = []) {
	it(r, t, n, (t) => {
		fn(8, () => {
			e(...t.map(J));
		});
	});
}
function xn(e, t = 0) {
	return fn(16 | t, e);
}
function B(e) {
	return fn(32 | S, e);
}
function Sn(e) {
	var t = e.teardown;
	if (t !== null) {
		let n = Pn, r = H;
		Fn(!0), U(null);
		try {
			t.call(null);
		} catch (t) {
			ln(t, e.parent);
		} finally {
			Fn(n), U(r);
		}
	}
}
function Cn(e, t = !1) {
	var n = e.first;
	for (e.first = e.last = null; n !== null;) {
		let e = n.ac;
		e !== null && nt(() => {
			e.abort(fe);
		});
		var r = n.next;
		n.f & 64 ? n.parent = null : V(n, t), n = r;
	}
}
function wn(e) {
	for (var t = e.first; t !== null;) {
		var n = t.next;
		t.f & 32 || V(t), t = n;
	}
}
function V(e, t = !0) {
	var n = !1;
	(t || e.f & 262144) && e.nodes !== null && e.nodes.end !== null && (Tn(e.nodes.start, e.nodes.end), n = !0), e.f |= b, Cn(e, t && !n), Zn(e, 0);
	var r = e.nodes && e.nodes.t;
	if (r !== null) for (let e of r) e.stop();
	Sn(e), e.f ^= b, e.f |= v;
	var i = e.parent;
	i !== null && i.first !== null && En(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function Tn(e, t) {
	for (; e !== null;) {
		var n = e === t ? null : /* @__PURE__ */ tn(e);
		e.remove(), e = n;
	}
}
function En(e) {
	var t = e.parent, n = e.prev, r = e.next;
	n !== null && (n.next = r), r !== null && (r.prev = n), t !== null && (t.first === e && (t.first = r), t.last === e && (t.last = n));
}
function Dn(e, t, n = !0) {
	var r = [];
	e.f |= 256, On(e, r, !0);
	var i = () => {
		n && V(e), t && t();
	}, a = r.length;
	if (a > 0) {
		var o = () => --a || i();
		for (var s of r) s.out(o);
	} else i();
}
function On(e, t, n) {
	if (!(e.f & 8192)) {
		e.f ^= _;
		var r = e.nodes && e.nodes.t;
		if (r !== null) for (let e of r) (e.is_global || n) && t.push(e);
		for (var i = e.first; i !== null;) {
			var a = i.next;
			if (!(i.f & 64)) {
				var o = !!(i.f & 65536) || !!(i.f & 32) && !!(e.f & 16);
				On(i, t, o ? n : !1);
			}
			i = a;
		}
	}
}
function kn(e) {
	e.f &= -257, An(e, !0);
}
function An(e, t) {
	if (!(e.f & 256) && e.f & 8192) {
		e.f ^= _, e.f & 1024 || (A(e, h), Ot.ensure().schedule(e));
		for (var n = e.first; n !== null;) {
			var r = n.next, i = !!(n.f & 65536) || !!(n.f & 32);
			An(n, i ? t : !1), n = r;
		}
		var a = e.nodes && e.nodes.t;
		if (a !== null) for (let e of a) (e.is_global || t) && e.in();
	}
}
function jn(e, t) {
	if (e.nodes) for (var n = e.nodes.start, r = e.nodes.end; n !== null;) {
		var i = n === r ? null : /* @__PURE__ */ tn(n);
		t.append(n), n = i;
	}
}
//#endregion
//#region node_modules/svelte/src/internal/client/legacy.js
var Mn = null, Nn = !1, Pn = !1;
function Fn(e) {
	Pn = e;
}
var H = null, In = !1;
function U(e) {
	H = e;
}
var W = null;
function Ln(e) {
	W = e;
}
var Rn = null;
function zn(e) {
	H !== null && (H.f & 2097152 || H.f & 2) && (Rn ??= /* @__PURE__ */ new Set()).add(e);
}
var G = null, K = 0, q = null;
function Bn(e) {
	q = e;
}
var Vn = 1, Hn = 0, Un = Hn;
function Wn(e) {
	Un = e;
}
function Gn() {
	return ++Vn;
}
function Kn(e) {
	var t = e.f;
	if (t & 2048) return !0;
	if (t & 4096) {
		for (var n = e.deps, r = n.length, i = 0; i < r; i++) {
			var a = n[i];
			if (Kn(a) && ht(a), a.wv > e.wv) return !0;
		}
		t & 512 && bt === null && A(e, m);
	}
	return !1;
}
function qn(e, t, n = !0) {
	var r = e.reactions;
	if (r !== null && !(Rn !== null && Rn.has(e))) for (var i = 0; i < r.length; i++) {
		var a = r[i];
		a.f & 2 ? qn(a, t, !1) : t === a && (n ? A(a, h) : a.f & 1024 && A(a, g), Nt(a));
	}
}
function Jn(e) {
	var t = G, n = K, r = q, i = H, a = Rn, o = k, s = In, c = Un, l = e.f;
	G = null, K = 0, q = null, H = l & 96 ? null : e, Rn = null, Ve(e.ctx), In = !1, Un = ++Hn, e.ac !== null && (nt(() => {
		e.ac.abort(fe);
	}), e.ac = null);
	try {
		e.f |= ne;
		var u = e.fn, d = u();
		e.f |= y;
		var f = Yn(e);
		if (Ge() && q !== null && !In && f !== null && !(e.f & 6146)) for (var p = 0; p < q.length; p++) qn(q[p], e);
		if (i !== null && i !== e) {
			if (Hn++, i.deps !== null) for (let e = 0; e < n; e += 1) i.deps[e].rv = Hn;
			if (t !== null) for (let e of t) e.rv = Hn;
			q !== null && (r === null ? r = q : r.push(...q));
		}
		return e.f & 8388608 && (e.f ^= C), d;
	} catch (t) {
		return Yn(e), cn(t);
	} finally {
		e.f ^= ne, G = t, K = n, q = r, H = i, Rn = a, Ve(o), In = s, Un = c;
	}
}
function Yn(e) {
	var t = e.deps, n = j?.is_fork;
	if (G !== null) {
		var r;
		if (n || Zn(e, K), t !== null && K > 0) for (t.length = K + G.length, r = 0; r < G.length; r++) t[K + r] = G[r];
		else e.deps = t = G;
		if (pn() && e.f & 512) for (r = K; r < t.length; r++) (t[r].reactions ??= []).push(e);
	} else !n && t !== null && K < t.length && (Zn(e, K), t.length = K);
	return t;
}
function Xn(e, r) {
	let i = r.reactions;
	if (i !== null) {
		var a = t.call(i, e);
		if (a !== -1) {
			var o = i.length - 1;
			o === 0 ? i = r.reactions = null : (i[a] = i[o], i.pop());
		}
	}
	if (i === null && r.f & 2 && (G === null || !n.call(G, r))) {
		var s = r;
		s.f & 512 && (s.f ^= 512), s.v !== w && Ze(s), s.ac !== null && nt(() => {
			s.ac.abort(fe), s.ac = null, A(s, h);
		}), gt(s), Zn(s, 0);
	}
}
function Zn(e, t) {
	var n = e.deps;
	if (n !== null) for (var r = t; r < n.length; r++) Xn(e, n[r]);
}
function Qn(e) {
	var t = e.f;
	if (!(t & 16384)) {
		A(e, m);
		var n = W, r = Nn;
		W = e, Nn = !(t & 96);
		try {
			t & 16777232 ? wn(e) : Cn(e), Sn(e);
			var i = Jn(e);
			e.teardown = typeof i == "function" ? i : null, e.wv = Vn;
		} finally {
			Nn = r, W = n;
		}
	}
}
async function $n() {
	await Promise.resolve(), kt();
}
function J(e) {
	var t = !!(e.f & 2);
	if (Mn?.add(e), H !== null && !In && !(W !== null && W.f & 16384) && (Rn === null || !Rn.has(e))) {
		var r = H.deps;
		if (H.f & 2097152) e.rv < Hn && (e.rv = Hn, G === null && r !== null && r[K] === e ? K++ : G === null ? G = [e] : G.push(e));
		else {
			H.deps ??= [], n.call(H.deps, e) || H.deps.push(e);
			var i = e.reactions;
			i === null ? e.reactions = [H] : n.call(i, H) || i.push(H);
		}
	}
	if (Pn && Lt.has(e)) return Lt.get(e);
	if (t) {
		var a = e;
		if (Pn) {
			var o = a.v;
			return (!(a.f & 1024) && a.reactions !== null || tr(a)) && (o = mt(a)), Lt.set(a, o), o;
		}
		var s = !(a.f & 512) && !In && H !== null && (Nn || !!(H.f & 512)), c = (a.f & y) === 0;
		Kn(a) && (s && (a.f |= 512), ht(a)), s && !c && (_t(a), er(a));
	}
	if (bt?.has(e)) return bt.get(e);
	if (e.f & 8388608) throw e.v;
	return e.v;
}
function er(e) {
	if (e.f |= 512, e.deps !== null) for (let t of e.deps) (t.reactions ??= []).push(e), t.f & 2 && !(t.f & 512) && (_t(t), er(t));
}
function tr(e) {
	if (e.v === w) return !0;
	if (e.deps === null) return !1;
	for (let t of e.deps) if (Lt.has(t) || t.f & 2 && tr(t)) return !0;
	return !1;
}
function nr(e) {
	var t = In;
	try {
		return In = !0, e();
	} finally {
		In = t;
	}
}
[.../* @__PURE__ */ "allowfullscreen.async.autofocus.autoplay.checked.controls.default.disabled.formnovalidate.indeterminate.inert.ismap.loop.multiple.muted.nomodule.novalidate.open.playsinline.readonly.required.reversed.seamless.selected.webkitdirectory.defer.disablepictureinpicture.disableremoteplayback".split(".")];
var rr = ["touchstart", "touchmove"];
function ir(e) {
	return rr.includes(e);
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/elements/events.js
var ar = Symbol("events"), or = /* @__PURE__ */ new Set(), sr = /* @__PURE__ */ new Set();
function cr(e, t, n, r = {}) {
	function i(e) {
		if (r.capture || pr.call(t, e), !e.cancelBubble) return nt(() => n?.call(this, e));
	}
	return e.startsWith("pointer") || e.startsWith("touch") || e === "wheel" ? (i.__removed = !1, Je(() => {
		i.__removed || t.addEventListener(e, i, r);
	})) : t.addEventListener(e, i, r), i;
}
function lr(e, t, n, r, i) {
	var a = {
		capture: r,
		passive: i
	}, o = cr(e, t, n, a);
	(t === document.body || t === window || t === document || t instanceof HTMLMediaElement) && mn(() => {
		o.__removed = !0, t.removeEventListener(e, o, a);
	});
}
function Y(e, t, n) {
	(t[ar] ??= {})[e] = n;
}
function ur(e) {
	for (var t = 0; t < e.length; t++) or.add(e[t]);
	for (var n of sr) n(e);
}
var dr = null, fr = !1;
function pr(e) {
	var t = this, n = t.ownerDocument, r = e.type, a = e.composedPath?.() || [], o = a[0] || e.target;
	dr = e, fr || (fr = !0, setTimeout(() => {
		fr = !1, dr = null;
	}));
	var s = 0, c = dr === e && e[ar];
	if (c) {
		var l = a.indexOf(c);
		if (l !== -1 && (t === document || t === window)) {
			e[ar] = t;
			return;
		}
		var u = a.indexOf(t);
		if (u === -1) return;
		l <= u && (s = l);
	}
	if (o = a[s] || e.target, o !== t) {
		i(e, "currentTarget", {
			configurable: !0,
			get() {
				return o || n;
			}
		});
		var d = H, f = W;
		U(null), Ln(null);
		try {
			for (var p, m = []; o !== null && o !== t;) {
				try {
					var h = o[ar]?.[r];
					h != null && (!o.disabled || e.target === o) && h.call(o, e);
				} catch (e) {
					p ? m.push(e) : p = e;
				}
				if (e.cancelBubble) break;
				s++, o = s < a.length ? a[s] : null;
			}
			if (p) {
				for (let e of m) queueMicrotask(() => {
					throw e;
				});
				throw p;
			}
		} finally {
			e[ar] = t, delete e.currentTarget, U(d), Ln(f);
		}
	}
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/reconciler.js
var mr = globalThis?.window?.trustedTypes && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", { createHTML: (e) => e });
function hr(e) {
	return mr?.createHTML(e) ?? e;
}
function gr(e) {
	var t = on("template");
	return t.innerHTML = hr(e.replaceAll("<!>", "<!---->")), t.content;
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/template.js
function _r(e, t) {
	var n = W;
	n.nodes === null && (n.nodes = {
		start: e,
		end: t,
		a: null,
		t: null
	});
}
/*#__NO_SIDE_EFFECTS__*/
function X(e, t) {
	var n = !!(t & 1), r = !!(t & 2), i, a = !e.startsWith("<!>");
	return () => {
		if (T) return _r(E, null), E;
		i === void 0 && (i = gr(a ? e : "<!>" + e), n || (i = /* @__PURE__ */ F(i)));
		var t = r || Zt ? document.importNode(i, !0) : i.cloneNode(!0);
		if (n) {
			var o = /* @__PURE__ */ F(t), s = t.lastChild;
			_r(o, s);
		} else _r(t, t);
		return t;
	};
}
function vr() {
	if (T) return _r(E, null), E;
	var e = document.createDocumentFragment(), t = document.createComment(""), n = P();
	return e.append(t, n), _r(t, n), e;
}
function Z(e, t) {
	if (T) {
		var n = W;
		(!(n.f & 32768) || n.nodes.end === null) && (n.nodes.end = E), Ce();
		return;
	}
	e !== null && e.before(t);
}
//#endregion
//#region node_modules/svelte/src/reactivity/create-subscriber.js
function yr(e) {
	let t = 0, n = zt(0), r;
	return () => {
		pn() && (J(n), bn(() => (t === 0 && (r = nr(() => e(() => Gt(n)))), t += 1, () => {
			Je(() => {
				--t, t === 0 && (r?.(), r = void 0, Gt(n));
			});
		})));
	};
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/blocks/boundary.js
var br = x | S;
function xr(e, t, n, r) {
	new Sr(e, t, n, r);
}
var Sr = class {
	parent;
	is_pending = !1;
	transform_error;
	#e;
	#t = T ? E : null;
	#n;
	#r;
	#i;
	#a = null;
	#o = null;
	#s = null;
	#c = null;
	#l = 0;
	#u = 0;
	#d = !1;
	#f = /* @__PURE__ */ new Set();
	#p = /* @__PURE__ */ new Set();
	#m = null;
	#h = yr(() => (this.#m = zt(this.#l), () => {
		this.#m = null;
	}));
	constructor(e, t, n, r) {
		this.#e = e, this.#n = t, this.#r = (e) => {
			var t = W;
			t.b = this, t.f |= 128, n(e);
		}, this.parent = W.b, this.transform_error = r ?? this.parent?.transform_error ?? ((e) => e), this.#i = xn(() => {
			if (T) {
				let e = this.#t;
				Ce();
				let t = e.data === "[!";
				if (e.data.startsWith("[?")) {
					let t = JSON.parse(e.data.slice(2));
					this.#_(t);
				} else t ? this.#y() : this.#g();
			} else this.#b();
		}, br), T && (this.#e = E);
	}
	#g() {
		try {
			this.#a = B(() => this.#r(this.#e));
		} catch (e) {
			this.error(e);
		}
	}
	#_(e) {
		let t = this.#n.failed, { reset: n, invoke_onerror: r } = this.#v(e);
		Je(r), t && (this.#s = B(() => {
			t(this.#e, () => e, () => n);
		}));
	}
	#v(e) {
		var t = !1, n = !1;
		let r = () => {
			if (t) {
				xe();
				return;
			}
			t = !0, n && Be(), this.#s !== null && Dn(this.#s, () => {
				this.#s = null;
			}), this.#S(() => {
				this.#b();
			});
		};
		return {
			reset: r,
			invoke_onerror: () => {
				try {
					n = !0, this.#n.onerror?.(e, r), n = !1;
				} catch (e) {
					ln(e, this.#i && this.#i.parent);
				}
			}
		};
	}
	#y() {
		let e = this.#n.pending;
		e && (this.is_pending = !0, this.#o = B(() => e(this.#e)), Je(() => {
			var e = this.#c = document.createDocumentFragment(), t = P(), n = !1;
			if (e.append(t), this.#a = this.#S(() => {
				try {
					return B(() => this.#r(t));
				} catch (e) {
					try {
						this.error(e), n = !0;
					} catch (e) {
						ln(e, this.#i.parent);
					}
					return null;
				}
			}), this.#a === null) {
				this.#c = null, n && this.#x(j);
				return;
			}
			this.#u === 0 && (this.#e.before(e), this.#c = null, Dn(this.#o, () => {
				this.#o = null;
			}), this.#x(j));
		}));
	}
	#b() {
		try {
			if (this.is_pending = this.has_pending_snippet(), this.#u = 0, this.#l = 0, this.#a = B(() => {
				this.#r(this.#e);
			}), this.#u > 0) {
				var e = this.#c = document.createDocumentFragment();
				jn(this.#a, e);
				let t = this.#n.pending;
				this.#o = B(() => t(this.#e));
			} else this.#x(j);
		} catch (e) {
			this.error(e);
		}
	}
	#x(e) {
		this.is_pending = !1, e.transfer_effects(this.#f, this.#p);
	}
	defer_effect(e) {
		Qe(e, this.#f, this.#p);
	}
	is_rendered() {
		return !this.is_pending && (!this.parent || this.parent.is_rendered());
	}
	has_pending_snippet() {
		return !!this.#n.pending;
	}
	#S(e) {
		var t = W, n = H, r = k;
		Ln(this.#i), U(this.#i), Ve(this.#i.ctx);
		try {
			return Ot.ensure(), e();
		} finally {
			Ln(t), U(n), Ve(r);
		}
	}
	#C(e, t) {
		if (!this.has_pending_snippet()) {
			this.parent && this.parent.#C(e, t);
			return;
		}
		this.#u += e, this.#u === 0 && (this.#x(t), this.#o && Dn(this.#o, () => {
			this.#o = null;
		}), this.#c &&= (this.#e.before(this.#c), null));
	}
	update_pending_count(e, t) {
		this.#C(e, t), this.#l += e, !(!this.#m || this.#d) && (this.#d = !0, Je(() => {
			this.#d = !1, this.#m && Ut(this.#m, this.#l);
		}));
	}
	get_effect_pending() {
		return this.#h(), J(this.#m);
	}
	error(e) {
		if (!this.#n.onerror && !this.#n.failed) throw e;
		j?.is_fork ? (this.#a && j.skip_effect(this.#a), this.#o && j.skip_effect(this.#o), this.#s && j.skip_effect(this.#s), j.oncommit(() => {
			this.#w(e);
		})) : this.#w(e);
	}
	#w(e) {
		this.#a &&= (V(this.#a), null), this.#o &&= (V(this.#o), null), this.#s &&= (V(this.#s), null), T && (D(this.#t), we(), D(Te()));
		let t = this.#n.failed, n = (e) => {
			let { reset: n, invoke_onerror: r } = this.#v(e);
			r(), t && (this.#s = this.#S(() => {
				try {
					return B(() => {
						var r = W;
						r.b = this, r.f |= 128, t(this.#e, () => e, () => n);
					});
				} catch (e) {
					return ln(e, this.#i.parent), null;
				}
			}));
		};
		Je(() => {
			var t;
			try {
				t = this.transform_error(e);
			} catch (e) {
				ln(e, this.#i && this.#i.parent);
				return;
			}
			typeof t == "object" && t && typeof t.then == "function" ? t.then(n, (e) => ln(e, this.#i && this.#i.parent)) : n(t);
		});
	}
};
function Q(e, t) {
	var n = t == null ? "" : typeof t == "object" ? `${t}` : t;
	n !== (e[ue] ??= e.nodeValue) && (e[ue] = n, e.nodeValue = `${n}`);
}
function Cr(e, t) {
	return Tr(e, t);
}
var wr = /* @__PURE__ */ new Map();
function Tr(e, { target: t, anchor: n, props: i = {}, events: a, context: o, intro: s = !0, transformError: c }) {
	en();
	var l = void 0, u = _n(() => {
		var s = n ?? t.appendChild(P());
		xr(s, { pending: () => {} }, (t) => {
			He({});
			var n = k;
			if (o && (n.c = o), a && (i.$$events = a), T && _r(t, null), l = e(t, i) || We(), T && (W.nodes.end = E, E === null || E.nodeType !== 8 || E.data !== "]")) throw ye(), me;
			Ue();
		}, c);
		var u = /* @__PURE__ */ new Set(), d = (e) => {
			for (var n = 0; n < e.length; n++) {
				var r = e[n];
				if (!u.has(r)) {
					u.add(r);
					var i = ir(r);
					for (let e of [t, document]) {
						var a = wr.get(e);
						a === void 0 && (a = /* @__PURE__ */ new Map(), wr.set(e, a));
						var o = a.get(r);
						o === void 0 ? (e.addEventListener(r, pr, { passive: i }), a.set(r, 1)) : a.set(r, o + 1);
					}
				}
			}
		};
		return d(r(or)), sr.add(d), () => {
			for (var e of u) for (let n of [t, document]) {
				var r = wr.get(n), i = r.get(e);
				--i == 0 ? (n.removeEventListener(e, pr), r.delete(e), r.size === 0 && wr.delete(n)) : r.set(e, i);
			}
			sr.delete(d), s !== n && s.parentNode?.removeChild(s);
		};
	});
	return Er.set(l, u), l;
}
var Er = /* @__PURE__ */ new WeakMap(), Dr = class {
	anchor;
	#e = /* @__PURE__ */ new Map();
	#t = /* @__PURE__ */ new Map();
	#n = /* @__PURE__ */ new Map();
	#r = /* @__PURE__ */ new Set();
	#i = !0;
	constructor(e, t = !0) {
		this.anchor = e, this.#i = t;
	}
	#a = (e) => {
		if (this.#e.has(e)) {
			var t = this.#e.get(e), n = this.#t.get(t);
			if (n) kn(n), this.#r.delete(t);
			else {
				var r = this.#n.get(t);
				r && (kn(r.effect), this.#t.set(t, r.effect), this.#n.delete(t), r.fragment.lastChild.remove(), this.anchor.before(r.fragment), n = r.effect);
			}
			for (let [t, n] of this.#e) {
				if (this.#e.delete(t), t === e) break;
				let r = this.#n.get(n);
				r && (V(r.effect), this.#n.delete(n));
			}
			for (let [e, r] of this.#t) {
				if (e === t || this.#r.has(e)) continue;
				let i = () => {
					if (Array.from(this.#e.values()).includes(e)) {
						var t = document.createDocumentFragment();
						jn(r, t), t.append(P()), this.#n.set(e, {
							effect: r,
							fragment: t
						});
					} else V(r);
					this.#r.delete(e), this.#t.delete(e);
				};
				this.#i || !n ? (this.#r.add(e), Dn(r, i, !1)) : i();
			}
		}
	};
	#o = (e) => {
		this.#e.delete(e);
		let t = Array.from(this.#e.values());
		for (let [e, n] of this.#n) t.includes(e) || (V(n.effect), this.#n.delete(e));
	};
	ensure(e, t) {
		var n = j, r = an();
		if (t && !this.#t.has(e) && !this.#n.has(e)) {
			if (r) {
				var i = document.createDocumentFragment(), a = P();
				i.append(a), this.#n.set(e, {
					effect: B(() => t(a)),
					fragment: i
				});
			} else this.#t.set(e, B(() => t(this.anchor)));
		}
		if (this.#e.set(n, e), r) {
			for (let [t, r] of this.#t) t === e ? n.unskip_effect(r) : n.skip_effect(r);
			for (let [t, r] of this.#n) t === e ? n.unskip_effect(r.effect) : n.skip_effect(r.effect);
			n.oncommit(this.#a), n.ondiscard(this.#o);
		} else T && (this.anchor = E), this.#a(n);
	}
};
//#endregion
//#region node_modules/svelte/src/internal/client/dom/blocks/if.js
function Or(e, t, n = !1) {
	var r;
	T && (r = E, Ce());
	var i = new Dr(e), a = n ? x : 0;
	function o(e, t) {
		if (T) {
			var n = Ee(r);
			if (e !== parseInt(n.substring(1))) {
				var a = Te();
				D(a), i.anchor = a, Se(!1), i.ensure(e, t), Se(!0);
				return;
			}
		}
		i.ensure(e, t);
	}
	xn(() => {
		var e = !1;
		t((t, n = 0) => {
			e = !0, o(n, t);
		}), e || o(-1, null);
	}, a);
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/blocks/each.js
function kr(e, t) {
	return t;
}
function Ar(e, t, n) {
	for (var i = [], a = t.length, o, s = t.length, c = 0; c < a; c++) {
		let n = t[c];
		Dn(n, () => {
			if (o) {
				if (o.pending.delete(n), o.done.add(n), o.pending.size === 0) {
					var t = e.outrogroups;
					jr(e, r(o.done)), t.delete(o), t.size === 0 && (e.outrogroups = null);
				}
			} else --s;
		}, !1);
	}
	if (s === 0) {
		var l = i.length === 0 && n !== null && e.pending.size === 0;
		if (l) {
			var u = n, d = u.parentNode;
			rn(d), d.append(u), e.items.clear();
		}
		jr(e, t, !l);
	} else o = {
		pending: new Set(t),
		done: /* @__PURE__ */ new Set()
	}, (e.outrogroups ??= /* @__PURE__ */ new Set()).add(o);
}
function jr(e, t, n = !0) {
	var r;
	if (e.pending.size > 0) {
		r = /* @__PURE__ */ new Set();
		for (let t of e.pending.values()) for (let n of t) r.add(e.items.get(n).e);
	}
	for (var i = 0; i < t.length; i++) {
		var a = t[i];
		r?.has(a) ? (a.f |= te, jn(a, document.createDocumentFragment())) : V(t[i], n);
	}
}
var Mr;
function Nr(t, n, i, a, o, s = null) {
	var c = t, l = /* @__PURE__ */ new Map();
	if (n & 4) {
		var u = t;
		c = T ? D(/* @__PURE__ */ F(u)) : u.appendChild(P());
	}
	T && Ce();
	var d = null, f = /* @__PURE__ */ ft(() => {
		var t = i();
		return e(t) ? t : t == null ? [] : r(t);
	}), p, m = /* @__PURE__ */ new Map(), h = !0;
	function g(e) {
		v.effect.f & 16384 || (v.pending.delete(e), v.fallback = d, Fr(v, p, c, n, a), d !== null && (p.length === 0 ? d.f & 33554432 ? (d.f ^= te, Lr(d, null, c)) : kn(d) : Dn(d, () => {
			d = null;
		})));
	}
	function _(e) {
		v.pending.delete(e);
	}
	var v = {
		effect: xn(() => {
			p = J(f);
			var e = p.length;
			let t = !1;
			T && Ee(c) === "[!" != (e === 0) && (c = Te(), D(c), Se(!1), t = !0);
			for (var r = /* @__PURE__ */ new Set(), u = j, v = an(), y = 0; y < e; y += 1) {
				T && E.nodeType === 8 && E.data === "]" && (c = E, t = !0, Se(!1));
				var b = p[y], x = a(b, y), S = h ? null : l.get(x);
				S ? (S.v && Ut(S.v, b), S.i && Ut(S.i, y), v && u.unskip_effect(S.e)) : (S = Ir(l, h ? c : Mr ??= P(), b, x, y, o, n, i), h || (S.e.f |= te), l.set(x, S)), r.add(x);
			}
			if (e === 0 && s && !d && (h ? d = B(() => s(c)) : (d = B(() => s(Mr ??= P())), d.f |= te)), e > r.size && Me("", "", ""), T && e > 0 && D(Te()), !h) {
				if (m.set(u, r), v) {
					for (let [e, t] of l) r.has(e) || u.skip_effect(t.e);
					u.oncommit(g), u.ondiscard(_);
				} else g(u);
			}
			t && Se(!0), J(f);
		}),
		flags: n,
		items: l,
		pending: m,
		outrogroups: null,
		fallback: d
	};
	h = !1, T && (c = E);
}
function Pr(e) {
	for (; e !== null && !(e.f & 32);) e = e.next;
	return e;
}
function Fr(e, t, n, i, a) {
	var o = !!(i & 8), s = t.length, c = e.items, l = Pr(e.effect.first), u, d = null, f, p = [], m = [], h, g, _, v;
	if (o) for (v = 0; v < s; v += 1) h = t[v], g = a(h, v), _ = c.get(g).e, _.f & 33554432 || (_.nodes?.a?.measure(), (f ??= /* @__PURE__ */ new Set()).add(_));
	for (v = 0; v < s; v += 1) {
		if (h = t[v], g = a(h, v), _ = c.get(g).e, e.outrogroups !== null) for (let t of e.outrogroups) t.pending.delete(_), t.done.delete(_);
		if (_.f & 8192 && (kn(_), o && (_.nodes?.a?.unfix(), (f ??= /* @__PURE__ */ new Set()).delete(_))), _.f & 33554432) {
			if (_.f ^= te, _ === l) Lr(_, null, n);
			else {
				var y = d ? d.next : l;
				_ === e.effect.last && (e.effect.last = _.prev), _.prev && (_.prev.next = _.next), _.next && (_.next.prev = _.prev), Rr(e, d, _), Rr(e, _, y), Lr(_, y, n), d = _, p = [], m = [], l = Pr(d.next);
				continue;
			}
		}
		if (_ !== l) {
			if (u !== void 0 && u.has(_)) {
				if (p.length < m.length) {
					var b = m[0], x;
					d = b.prev;
					var S = p[0], ee = p[p.length - 1];
					for (x = 0; x < p.length; x += 1) Lr(p[x], b, n);
					for (x = 0; x < m.length; x += 1) u.delete(m[x]);
					Rr(e, S.prev, ee.next), Rr(e, d, S), Rr(e, ee, b), l = b, d = ee, --v, p = [], m = [];
				} else u.delete(_), Lr(_, l, n), Rr(e, _.prev, _.next), Rr(e, _, d === null ? e.effect.first : d.next), Rr(e, d, _), d = _;
				continue;
			}
			for (p = [], m = []; l !== null && l !== _;) (u ??= /* @__PURE__ */ new Set()).add(l), m.push(l), l = Pr(l.next);
			if (l === null) continue;
		}
		_.f & 33554432 || p.push(_), d = _, l = Pr(_.next);
	}
	if (e.outrogroups !== null) {
		for (let t of e.outrogroups) t.pending.size === 0 && (jr(e, r(t.done)), e.outrogroups?.delete(t));
		e.outrogroups.size === 0 && (e.outrogroups = null);
	}
	if (l !== null || u !== void 0) {
		var ne = [];
		if (u !== void 0) for (_ of u) _.f & 8192 || ne.push(_);
		for (; l !== null;) !(l.f & 8192) && l !== e.fallback && ne.push(l), l = Pr(l.next);
		var re = ne.length;
		if (re > 0) {
			var C = i & 4 && s === 0 ? n : null;
			if (o) {
				for (v = 0; v < re; v += 1) ne[v].nodes?.a?.measure();
				for (v = 0; v < re; v += 1) ne[v].nodes?.a?.fix();
			}
			Ar(e, ne, C);
		}
	}
	o && Je(() => {
		if (f !== void 0) for (_ of f) _.nodes?.a?.apply();
	});
}
function Ir(e, t, n, r, i, a, o, s) {
	var c = o & 1 ? o & 16 ? zt(n) : /* @__PURE__ */ Bt(n, !1, !1) : null, l = o & 2 ? zt(i) : null;
	return {
		v: c,
		i: l,
		e: B(() => (a(t, c ?? n, l ?? i, s), () => {
			e.delete(r);
		}))
	};
}
function Lr(e, t, n) {
	if (e.nodes) for (var r = e.nodes.start, i = e.nodes.end, a = t && !(t.f & 33554432) ? t.nodes.start : n; r !== null;) {
		var o = /* @__PURE__ */ tn(r);
		if (a.before(r), r === i) return;
		r = o;
	}
}
function Rr(e, t, n) {
	t === null ? e.effect.first = n : t.next = n, n === null ? e.effect.last = t : n.prev = t;
}
function zr(e, t, n = !1, r = !1, i = !1, a = !1) {
	var o = e, s = "";
	if (n) {
		var c = e;
		T && (o = D(/* @__PURE__ */ F(c)));
	}
	z(() => {
		var e = W;
		if (s === (s = t() ?? "")) {
			T && Ce();
			return;
		}
		if (n && !T) {
			e.nodes = null, c.innerHTML = s, s !== "" && _r(/* @__PURE__ */ F(c), c.lastChild);
			return;
		}
		if (e.nodes !== null && (Tn(e.nodes.start, e.nodes.end), e.nodes = null), s !== "") {
			if (T) {
				for (var a = E.data, l = Ce(), u = l; l !== null && (l.nodeType !== 8 || l.data !== "");) u = l, l = /* @__PURE__ */ tn(l);
				if (l === null) throw ye(), me;
				_r(E, u), o = D(l);
				return;
			}
			var d = on(r ? "svg" : i ? "math" : "template", r ? ge : i ? _e : void 0);
			d.innerHTML = s;
			var f = r || i ? d : d.content;
			if (_r(/* @__PURE__ */ F(f), f.lastChild), r || i) for (; /* @__PURE__ */ F(f);) o.before(/* @__PURE__ */ F(f));
			else o.before(f);
		}
	});
}
//#endregion
//#region node_modules/svelte/src/internal/shared/attributes.js
var Br = [..." 	\n\r\f\xA0\v﻿"];
function Vr(e, t, n) {
	var r = e == null ? "" : "" + e;
	if (t && (r = r ? r + " " + t : t), n) {
		for (var i of Object.keys(n)) if (n[i]) r = r ? r + " " + i : i;
		else if (r.length) for (var a = i.length, o = 0; (o = r.indexOf(i, o)) >= 0;) {
			var s = o + a;
			(o === 0 || Br.includes(r[o - 1])) && (s === r.length || Br.includes(r[s])) ? r = (o === 0 ? "" : r.substring(0, o)) + r.substring(s + 1) : o = s;
		}
	}
	return r === "" ? null : r;
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/elements/class.js
function Hr(e, t, n, r, i, a) {
	var o = e[ce];
	if (T || o !== n || o === void 0) {
		var s = Vr(n, r, a);
		(!T || s !== e.getAttribute("class")) && (s == null ? e.removeAttribute("class") : t ? e.className = s : e.setAttribute("class", s)), e[ce] = n;
	} else if (a && i !== a) for (var c in a) {
		var l = !!a[c];
		(i == null || l !== !!i[c]) && e.classList.toggle(c, l);
	}
	return a;
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/elements/bindings/select.js
function Ur(e, t) {
	t ? e.hasAttribute("selected") || e.setAttribute("selected", "") : e.removeAttribute("selected");
}
function Wr(t, n) {
	var r = t.__defaultValue, i = t.multiple, a = i ? r ?? [] : null;
	if (!i || e(a)) {
		var o = t.selectedIndex, s = n && i ? new Set(t.selectedOptions) : null;
		for (var c of t.options) {
			var l = Jr(c);
			Ur(c, i ? a.includes(l) : Yt(l, r));
		}
		if (n) {
			if (s !== null) for (c of t.options) {
				var u = s.has(c);
				c.selected !== u && (c.selected = u);
			}
			else t.selectedIndex !== o && (t.selectedIndex = o);
		}
	}
}
function Gr(t, n, r = !1) {
	if (t.multiple) {
		if (n == null) return;
		if (!e(n)) return be();
		for (var i of t.options) i.selected = n.includes(Jr(i));
		return;
	}
	for (i of t.options) if (Yt(Jr(i), n)) {
		i.selected = !0;
		return;
	}
	(!r || n !== void 0) && (t.selectedIndex = -1);
}
function Kr(e) {
	var t = new MutationObserver((t) => {
		t.every(Yr) || ("__defaultValue" in e && Wr(e, !1), "__value" in e && Gr(e, e.__value));
	});
	t.observe(e, {
		childList: !0,
		subtree: !0,
		attributes: !0,
		attributeFilter: ["value"]
	}), mn(() => {
		t.disconnect();
	});
}
function qr(e, t, n = t) {
	var r = /* @__PURE__ */ new WeakSet(), i = !0;
	rt(e, "change", (t) => {
		var i = t ? "[selected]" : ":checked", a;
		if (e.multiple) a = [].map.call(e.querySelectorAll(i), Jr);
		else {
			var o = e.querySelector(i) ?? e.querySelector("option:not([disabled])");
			a = o && Jr(o);
		}
		n(a), e.__value = a, j !== null && r.add(j);
	}), vn(() => {
		var a = t();
		if (e === document.activeElement) {
			var o = j;
			if (r.has(o)) return;
		}
		if (Gr(e, a, i), i && a === void 0) {
			var s = e.querySelector(":checked");
			s !== null && (a = Jr(s), n(a));
		}
		e.__value = a, i = !1;
	});
}
function Jr(e) {
	return "__value" in e ? e.__value : e.value;
}
function Yr(e) {
	if (e.target.closest("selectedcontent") !== null) return !0;
	if (e.type === "childList") {
		var t = [...e.addedNodes, ...e.removedNodes];
		return t.length > 0 && t.every((e) => e.nodeName === "SELECTEDCONTENT");
	}
	return !1;
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/elements/attributes.js
var Xr = Symbol("is custom element"), Zr = Symbol("is html"), Qr = pe ? "link" : "LINK";
function $r(e) {
	if (T) {
		var t = !1, n = () => {
			if (!t) {
				if (t = !0, e.hasAttribute("value")) {
					var n = e.value;
					$(e, "value", null), e.value = n;
				}
				if (e.hasAttribute("checked")) {
					var r = e.checked;
					$(e, "checked", null), e.checked = r;
				}
			}
		};
		e[de] = n, Je(n), tt();
	}
}
function $(e, t, n, r) {
	var i = ei(e);
	T && (i[t] = e.getAttribute(t), t === "src" || t === "srcset" || t === "href" && e.nodeName === Qr) || i[t] !== (i[t] = n) && (t === "loading" && (e[oe] = n), n == null ? e.removeAttribute(t) : typeof n != "string" && ni(e).has(t) ? e[t] = n : e.setAttribute(t, n));
}
function ei(e) {
	return e[se] ??= {
		[Xr]: e.nodeName.includes("-"),
		[Zr]: e.namespaceURI === he
	};
}
var ti = /* @__PURE__ */ new Map();
function ni(e) {
	var t = e.getAttribute("is") || e.nodeName, n = ti.get(t);
	if (n) return n;
	ti.set(t, n = /* @__PURE__ */ new Set());
	for (var r, i = e, a = Element.prototype; a !== i;) {
		for (var s in r = o(i), r) r[s].set && s !== "innerHTML" && s !== "textContent" && s !== "innerText" && n.add(s);
		i = l(i);
	}
	return n;
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/elements/bindings/input.js
function ri(e, t, n = t) {
	var r = /* @__PURE__ */ new WeakSet();
	rt(e, "input", async (i) => {
		var a = i ? e.defaultValue : e.value;
		if (a = ii(e) ? ai(a) : a, n(a), j !== null && r.add(j), await $n(), a !== (a = t())) {
			var o = e.selectionStart, s = e.selectionEnd, c = e.value.length;
			if (e.value = a ?? "", s !== null) {
				var l = e.value.length;
				o === s && s === c && l > c ? (e.selectionStart = l, e.selectionEnd = l) : (e.selectionStart = o, e.selectionEnd = Math.min(s, l));
			}
		}
	}), (T && e.defaultValue !== e.value || nr(t) == null && e.value) && (n(ii(e) ? ai(e.value) : e.value), j !== null && r.add(j)), bn(() => {
		var n = t();
		if (e === document.activeElement) {
			var i = j;
			if (r.has(i)) return;
		}
		ii(e) && n === ai(e.value) || (e.type !== "date" || n || e.value) && n !== e.value && (e.value = n ?? "");
	});
}
function ii(e) {
	var t = e.type;
	return t === "number" || t === "range";
}
function ai(e) {
	return e === "" ? null : +e;
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/elements/bindings/this.js
function oi(e, t) {
	return e === t || e?.[ie] === t;
}
function si(e = We(), t, n, r) {
	var i = k.r, a = W;
	return vn(() => {
		var o, s;
		return bn(() => {
			o = s, s = r?.() || [], nr(() => {
				oi(n(...s), e) || (t(e, ...s), o && oi(n(...o), e) && t(null, ...o));
			});
		}), () => {
			let r = a;
			for (; r !== i && r.parent !== null && r.parent.f & 33554432;) r = r.parent;
			let o = () => {
				s && oi(n(...s), e) && t(null, ...s);
			}, c = r.teardown;
			r.teardown = () => {
				o(), c?.();
			};
		};
	}), e;
}
function ci(e) {
	k === null && Ae("onMount"), hn(() => {
		let t = nr(e);
		if (typeof t == "function") return t;
	});
}
//#endregion
//#region node_modules/svelte/src/internal/disclose-version.js
typeof window < "u" && ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add("5");
//#endregion
//#region src/selection.js
function li(e) {
	let t = 0;
	return (e.match(/[^\n]*\n|[^\n]+$/g) || [""]).map((e, n) => {
		let r = {
			start: t,
			end: t + new TextEncoder().encode(e).length,
			text: e.replace(/\n$/, ""),
			number: n + 1
		};
		return t = r.end, r;
	});
}
function ui(e, t, n) {
	let r = li(e);
	if (!Number.isInteger(t) || !Number.isInteger(n) || t < 1 || n < t || n > r.length) throw Error("Choose an existing line range");
	return {
		start_byte: r[t - 1].start,
		end_byte: r[n - 1].end
	};
}
function di(e, t) {
	let n = (e instanceof Element ? e : e.parentElement)?.closest("[data-start][data-snapshot]");
	if (!(n instanceof HTMLElement) || n !== e && n.firstChild !== e) return null;
	let r = n.textContent || "", i = e === n ? t === 0 ? 0 : r.length : t;
	return i < 0 || i > r.length ? null : {
		snapshot_id: n.dataset.snapshot,
		byte: Number(n.dataset.start) + new TextEncoder().encode(r.slice(0, i)).length
	};
}
//#endregion
//#region src/App.svelte
var fi = /* @__PURE__ */ X("<div class=\"destination\">Feedback: <code> </code><span class=\"badge\"> </span></div> <button>Save feedback</button>", 1), pi = /* @__PURE__ */ X("<option> </option>"), mi = /* @__PURE__ */ X("<button>Unified diff</button>"), hi = /* @__PURE__ */ X("<button>Markdown preview</button>"), gi = /* @__PURE__ */ X("<p class=\"hint\">Preview is read-only. Use Source to select a precise comment target.</p> <article class=\"markdown\"></article>", 1), _i = /* @__PURE__ */ X("<div><code class=\"revision-gutter\"> </code><span> </span></div>"), vi = /* @__PURE__ */ X("<p> </p>"), yi = /* @__PURE__ */ X("<p class=\"hint\">Disk revision is read-only. Existing comments remain on the original snapshot.</p> <!>", 1), bi = /* @__PURE__ */ X("<button> </button>"), xi = /* @__PURE__ */ X("<span></span>"), Si = /* @__PURE__ */ X("<span> </span>"), Ci = /* @__PURE__ */ X("<div><div class=\"diff-gutter\"></div> <!></div>"), wi = /* @__PURE__ */ X("<p>No textual changes (empty files or mode-only change). Choose Source to comment.</p>"), Ti = /* @__PURE__ */ X("<label class=\"hint\">Context target side <select><option>new</option><option>old</option></select></label> <!> <!>", 1), Ei = /* @__PURE__ */ X("<div><button class=\"line-number\"> </button> <span> </span></div>"), Di = /* @__PURE__ */ X("<blockquote aria-label=\"Selected quote\"> </blockquote>"), Oi = /* @__PURE__ */ X("<p class=\"hint\">Select a passage or click a line number to add the first comment.</p>"), ki = /* @__PURE__ */ X("<article class=\"comment\"><button class=\"comment-target\"> </button> <blockquote> </blockquote><p> </p> <button>Edit</button> <button>Delete</button></article>"), Ai = /* @__PURE__ */ X("<p class=\"hint\">Last save: <code> </code></p>"), ji = /* @__PURE__ */ X("<nav aria-label=\"Review controls\"><label>File <select aria-label=\"File\"></select></label> <label>Side <select></select></label> <button>Source</button> <!> <!> <button>Inspect revisions</button></nav> <p> </p> <main><section aria-label=\"Reviewed content\"><div class=\"content\" role=\"region\" aria-label=\"Source content\" tabindex=\"0\"><!></div> <form><div class=\"range\"><label>Start line <input type=\"number\" min=\"1\"/></label> <label>End line <input type=\"number\" min=\"1\"/></label> <button type=\"button\">Select lines</button></div> <!> <label for=\"comment\"> </label> <textarea id=\"comment\" rows=\"4\" placeholder=\"Explain what should change…\" maxlength=\"32768\"></textarea> <button> </button> <button type=\"button\">Cancel draft</button> <small>Ctrl+S in the comment records it. Save feedback writes JSON. [ and ] switch files.</small></form></section> <aside aria-label=\"Comments\"><h2>Comments <span class=\"badge\"> </span></h2> <!> <!> <!></aside></main>", 1), Mi = /* @__PURE__ */ X("<p class=\"loading\"> </p>"), Ni = /* @__PURE__ */ X("<header><h1>Review</h1> <!></header> <div class=\"status\" role=\"status\" aria-live=\"polite\"> </div> <!>", 1);
function Pi(e, t) {
	He(t, !0);
	let n = /* @__PURE__ */ M(null), r = /* @__PURE__ */ M(null), i = /* @__PURE__ */ M(0), a = /* @__PURE__ */ M(""), o = /* @__PURE__ */ M("source"), s = /* @__PURE__ */ M("new"), c = /* @__PURE__ */ M(null), l = /* @__PURE__ */ M(1), u = /* @__PURE__ */ M(1), d = /* @__PURE__ */ M(""), f = /* @__PURE__ */ M(null), p = /* @__PURE__ */ M(""), m = /* @__PURE__ */ M(!1), h = /* @__PURE__ */ M(void 0), g = 0, _ = new URLSearchParams(location.hash.slice(1)), v = _.get("token") || sessionStorage.getItem("review-token") || "";
	_.has("token") && (sessionStorage.setItem("review-token", v), history.replaceState(null, "", location.pathname));
	let y = /* @__PURE__ */ dt(() => J(n)?.files[J(i)]), b = /* @__PURE__ */ dt(() => J(y)?.snapshots.find((e) => e.id === J(a)) || J(y)?.snapshots.at(-1)), x = /* @__PURE__ */ dt(() => J(r)?.disk.find((e) => e.file_id === J(y)?.id)), S = /* @__PURE__ */ dt(() => li(J(b)?.text || "")), ee = /* @__PURE__ */ dt(() => new Map(J(y)?.snapshots.map((e) => [e.id, li(e.text)]))), te = /* @__PURE__ */ dt(() => J(n)?.previews.find((e) => e.snapshot_id === J(b)?.id)?.html || ""), ne = /* @__PURE__ */ dt(() => {
		if (!J(c) || !J(y)) return "";
		let e = J(c), t = J(y).snapshots.find((t) => t.id === e.snapshot_id);
		return t ? new TextDecoder().decode(new TextEncoder().encode(t.text).slice(e.start_byte, e.end_byte)) : "";
	});
	async function re(e, t = "GET", n) {
		let r = await fetch(e, {
			method: t,
			headers: {
				Authorization: `Bearer ${v}`,
				...n === void 0 ? {} : { "Content-Type": "application/json" }
			},
			...n === void 0 ? {} : { body: JSON.stringify(n) }
		}), i = await r.text();
		if (!r.ok) {
			let e = i;
			try {
				e = JSON.parse(i).error || i;
			} catch {}
			throw Error(e);
		}
		return JSON.parse(i);
	}
	async function C() {
		try {
			N(n, await re("/api/content"), !0), N(a, J(n).files[0].snapshots.at(-1).id, !0), N(o, J(n).files[0].diff ? "diff" : "source", !0);
		} catch (e) {
			N(p, String(e), !0);
		}
	}
	async function ie() {
		let e = ++g;
		try {
			let t = await re("/api/refresh", "POST");
			e === g && N(r, t, !0);
		} catch (e) {
			N(p, String(e), !0);
		}
	}
	async function ae(e, t, n) {
		N(m, !0);
		let i = ++g;
		try {
			let a = await re(e, t, n);
			return i === g && N(r, a, !0), !0;
		} catch (e) {
			return await ie(), N(p, String(e), !0), !1;
		} finally {
			N(m, !1);
		}
	}
	function oe(e) {
		(!J(d) && !J(f) || confirm("Discard this unrecorded comment draft?")) && (N(i, e, !0), N(a, J(n).files[e].snapshots.at(-1).id, !0), N(o, J(n).files[e].diff ? "diff" : "source", !0), N(c, null), N(f, null), N(d, ""), N(l, N(u, 1), !0));
	}
	function se(e, t, n = !1) {
		if (J(f)) {
			N(p, "Finish or cancel editing before choosing another target.");
			return;
		}
		!n || J(c)?.snapshot_id !== e.id ? N(l, N(u, t, !0), !0) : (N(l, Math.min(J(l), t), !0), N(u, Math.max(J(u), t), !0)), N(a, e.id, !0), N(c, {
			snapshot_id: e.id,
			...ui(e.text, J(l), J(u))
		}, !0), N(p, `${e.side} lines ${J(l)}–${J(u)} selected`);
	}
	function ce() {
		if (J(b) && !J(f)) try {
			N(c, {
				snapshot_id: J(b).id,
				...ui(J(b).text, J(l), J(u))
			}, !0), N(p, "");
		} catch (e) {
			N(c, null), N(p, String(e), !0);
		}
	}
	function le() {
		if (J(f) || J(o) === "current" || J(o) === "preview") return;
		let e = window.getSelection();
		if (!e || e.isCollapsed || !e.anchorNode || !e.focusNode) return;
		let t = di(e.anchorNode, e.anchorOffset), n = di(e.focusNode, e.focusOffset);
		if (!t || !n) {
			N(p, "Select source text without the line-number controls, or use line ranges.");
			return;
		}
		if (t.snapshot_id !== n.snapshot_id) {
			N(p, "Select one diff side, or switch to its full Source view.");
			return;
		}
		let r = J(y).snapshots.find((e) => e.id === t.snapshot_id);
		N(a, r.id, !0), N(c, {
			snapshot_id: r.id,
			start_byte: Math.min(t.byte, n.byte),
			end_byte: Math.max(t.byte, n.byte)
		}, !0), N(l, li(r.text).findIndex((e) => e.end > J(c).start_byte) + 1), N(u, li(r.text).findIndex((e) => e.end >= J(c).end_byte) + 1), N(p, "Passage selected. Write a comment below.");
	}
	async function ue() {
		J(o) !== "current" && J(o) !== "preview" && J(y) && (J(c) || J(f)) && J(d).trim() && await ae(J(f) ? `/api/comments/${J(f)}` : "/api/comments", J(f) ? "PUT" : "POST", J(f) ? { body: J(d) } : {
			file_id: J(y).id,
			...J(c),
			body: J(d)
		}) && (N(d, ""), N(f, null), N(p, "Comment recorded. Save feedback to write it to disk."));
	}
	function de(e, t = !1) {
		(!J(d) && !J(f) || confirm("Discard this unrecorded comment draft?")) && (N(i, J(n).files.findIndex((t) => t.id === e.target.file_id), !0), N(a, e.target.snapshot_id, !0), N(o, "source"), N(c, {
			snapshot_id: J(a),
			start_byte: e.target.start_byte,
			end_byte: e.target.end_byte
		}, !0), N(l, e.target.start_line, !0), N(u, e.target.end_line, !0), N(f, t ? e.id : null, !0), N(d, t ? e.body : "", !0), N(p, `Original ${e.target.side} lines ${J(l)}–${J(u)}`), setTimeout(() => {
			document.getElementById(`line-${J(l)}`)?.scrollIntoView({ block: "center" }), t && J(h)?.focus();
		}, 0));
	}
	async function fe(e) {
		confirm("Delete this comment?") && await ae(`/api/comments/${e.id}`, "DELETE") && (J(f) === e.id && (N(d, ""), N(f, null)), N(p, "Comment deleted. Save to write feedback."));
	}
	async function pe() {
		if (J(d) || J(f)) {
			N(p, "Record or cancel the comment draft before saving feedback."), J(h)?.focus();
			return;
		}
		await ae("/api/save", "POST") && N(p, `Saved ${J(r).last_saved}`);
	}
	function me(e) {
		return J(y)?.snapshots.find((t) => t.side === (e.kind === "delete" ? "old" : e.kind === "add" ? "new" : J(s)));
	}
	function w(e, t) {
		return (t?.side === "old" ? e.old_line : e.new_line) || 1;
	}
	function he(e) {
		if (e.ctrlKey && e.key === "s") {
			e.preventDefault(), !J(m) && J(r) && (e.target === J(h) ? ue() : pe());
			return;
		}
		e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement || (e.key === "c" && J(h)?.focus(), e.key === "]" && J(n) && oe((J(i) + 1) % J(n).files.length), e.key === "[" && J(n) && oe((J(i) + J(n).files.length - 1) % J(n).files.length));
	}
	ci(() => {
		C(), ie();
		let e = setInterval(() => {
			J(m) || ie();
		}, 2500), t = (e) => {
			(J(r)?.dirty || J(d) || J(f)) && (e.preventDefault(), e.returnValue = "");
		};
		return window.addEventListener("beforeunload", t), window.addEventListener("keydown", he), () => {
			clearInterval(e), window.removeEventListener("beforeunload", t), window.removeEventListener("keydown", he);
		};
	});
	var ge = Ni(), _e = nn(ge), ve = R(I(_e), 2), ye = (e) => {
		var t = fi(), n = nn(t), i = R(I(n)), a = L(i, !0), o = L(R(i), !0);
		O(n);
		var s = R(n, 2);
		z(() => {
			Q(a, J(r).output), Q(o, J(r).dirty ? "Unsaved" : "Saved"), s.disabled = J(m);
		}), Y("click", s, pe), Z(e, t);
	};
	Or(ve, (e) => {
		J(r) && e(ye);
	}), O(_e);
	var be = R(_e, 2), xe = L(be, !0), T = R(be, 2), Se = (e) => {
		var t = ji(), p = nn(t), g = I(p), _ = R(I(g));
		Nr(_, 21, () => J(n).files, kr, (e, t, n) => {
			var r = pi(), i = L(r, !0);
			r.value = r.__value = n, z(() => Q(i, J(t).path)), Z(e, r);
		}), O(_);
		var v;
		Kr(_), O(g);
		var re = R(g, 2), C = R(I(re));
		Nr(C, 21, () => J(y).snapshots, kr, (e, t) => {
			var n = pi(), r = L(n), i = {};
			z((e) => {
				Q(r, `${J(t).side ?? ""} · ${e ?? ""}`), i !== (i = J(t).id) && (n.value = (n.__value = i) ?? "");
			}, [() => J(t).revision.slice(0, 16)]), Z(e, n);
		}), O(C), Kr(C), O(re);
		var ae = R(re, 2), pe = R(ae, 2), he = (e) => {
			var t = mi();
			z(() => $(t, "aria-pressed", J(o) === "diff")), Y("click", t, () => N(o, "diff")), Z(e, t);
		};
		Or(pe, (e) => {
			J(y).diff && e(he);
		});
		var ge = R(pe, 2), _e = (e) => {
			var t = hi();
			z(() => $(t, "aria-pressed", J(o) === "preview")), Y("click", t, () => N(o, "preview")), Z(e, t);
		};
		Or(ge, (e) => {
			J(te) && e(_e);
		});
		var ve = R(ge, 2);
		O(p);
		var ye = R(p, 2);
		let be;
		var xe = L(ye), T = R(ye, 2), Se = I(T), E = I(Se), D = I(E), Ce = (e) => {
			var t = gi(), n = R(nn(t), 2);
			zr(n, () => J(te), !0), O(n), Z(e, t);
		}, Te = (e) => {
			var t = yi(), n = R(nn(t), 2), r = (e) => {
				var t = vr();
				Nr(nn(t), 17, () => J(x).diff, kr, (e, t) => {
					var n = _i(), r = I(n), i = L(r), a = L(R(r));
					O(n), z(() => {
						Hr(n, 1, `source-row ${J(t).kind ?? ""}`), Q(i, `${J(t).old_line ?? "" ?? ""} → ${J(t).new_line ?? "" ?? ""}`), Q(a, `${J(t).kind === "delete" ? "−" : J(t).kind === "add" ? "+" : " "} ${J(t).text ?? ""}`);
					}), Z(e, n);
				}), Z(e, t);
			}, i = (e) => {
				var t = vi(), n = L(t, !0);
				z(() => Q(n, J(x)?.message)), Z(e, t);
			};
			Or(n, (e) => {
				J(x)?.diff.length ? e(r) : e(i, -1);
			}), Z(e, t);
		}, Ee = (e) => {
			var t = Ti(), n = nn(t), r = R(I(n)), i = I(r);
			i.value = i.__value = "new";
			var a = R(i);
			a.value = a.__value = "old", O(r), Kr(r), O(n);
			var o = R(n, 2);
			Nr(o, 17, () => J(y).diff, kr, (e, t) => {
				let n = /* @__PURE__ */ dt(() => me(J(t))), r = /* @__PURE__ */ dt(() => w(J(t), J(n)));
				var i = Ci(), a = I(i);
				Nr(a, 21, () => J(y).snapshots, kr, (e, n) => {
					let r = /* @__PURE__ */ dt(() => J(n).side === "old" ? J(t).old_line : J(t).new_line);
					var i = vr(), a = nn(i), o = (e) => {
						var t = bi(), i = L(t);
						z(() => {
							$(t, "aria-label", `Select ${J(n).side ?? ""} line ${J(r) ?? ""}`), Q(i, `${J(n).side === "old" ? "−" : "+"}${J(r) ?? ""}`);
						}), Y("click", t, (e) => se(J(n), J(r), e.shiftKey)), Z(e, t);
					}, s = (e) => {
						Z(e, xi());
					};
					Or(a, (e) => {
						J(r) ? e(o) : e(s, -1);
					}), Z(e, i);
				}), O(a);
				var o = R(a, 2), s = (e) => {
					var i = Si(), a = L(i, !0);
					z((e) => {
						$(i, "data-start", e), $(i, "data-snapshot", J(n).id), Q(a, J(t).text);
					}, [() => J(ee).get(J(n).id)[J(r) - 1].start]), Z(e, i);
				}, c = (e) => {
					var n = Si(), r = L(n, !0);
					z(() => Q(r, J(t).text)), Z(e, n);
				};
				Or(o, (e) => {
					J(n) && (J(t).old_line || J(t).new_line) ? e(s) : e(c, -1);
				}), O(i), z(() => Hr(i, 1, `source-row ${J(t).kind ?? ""}`)), Z(e, i);
			});
			var c = R(o, 2), l = (e) => {
				Z(e, wi());
			};
			Or(c, (e) => {
				J(y).diff.length || e(l);
			}), qr(r, () => J(s), (e) => N(s, e)), Z(e, t);
		}, De = (e) => {
			var t = vr();
			Nr(nn(t), 17, () => J(S), kr, (e, t) => {
				var n = Ei();
				let r;
				var i = I(n), a = L(i, !0), o = R(i, 2), s = L(o, !0);
				O(n), z(() => {
					$(n, "id", `line-${J(t).number ?? ""}`), r = Hr(n, 1, "source-row", null, r, { selected: J(c)?.snapshot_id === J(b).id && J(t).number >= J(l) && J(t).number <= J(u) }), $(i, "aria-label", `Select line ${J(t).number ?? ""}`), Q(a, J(t).number), $(o, "data-start", J(t).start), $(o, "data-snapshot", J(b).id), Q(s, J(t).text);
				}), Y("click", i, (e) => se(J(b), J(t).number, e.shiftKey)), Z(e, n);
			}), Z(e, t);
		};
		Or(D, (e) => {
			J(o) === "preview" ? e(Ce) : J(o) === "current" ? e(Te, 1) : J(o) === "diff" && J(y).diff ? e(Ee, 2) : e(De, -1);
		}), O(E);
		var Oe = R(E, 2), ke = I(Oe), Ae = I(ke), je = R(I(Ae));
		$r(je), O(Ae);
		var Me = R(Ae, 2), Ne = R(I(Me));
		$r(Ne), O(Me);
		var Pe = R(Me, 2);
		O(ke);
		var Fe = R(ke, 2), Ie = (e) => {
			var t = Di(), n = L(t, !0);
			z(() => Q(n, J(ne) || "(empty file)")), Z(e, t);
		};
		Or(Fe, (e) => {
			J(c) && e(Ie);
		});
		var Le = R(Fe, 2), Re = L(Le, !0), ze = R(Le, 2);
		$e(ze), si(ze, (e) => N(h, e), () => J(h));
		var Be = R(ze, 2), k = L(Be, !0), Ve = R(Be, 2);
		we(2), O(Oe), O(Se);
		var He = R(Se, 2), Ue = I(He), We = L(R(I(Ue)), !0);
		O(Ue);
		var Ge = R(Ue, 2), Ke = (e) => {
			Z(e, Oi());
		};
		Or(Ge, (e) => {
			J(r).comments.length || e(Ke);
		});
		var qe = R(Ge, 2);
		Nr(qe, 17, () => J(r).comments, (e) => e.id, (e, t) => {
			var n = ki(), r = I(n), i = L(r), a = R(r, 2), o = L(a, !0), s = R(a), c = L(s, !0), l = R(s, 2), u = R(l, 2);
			O(n), z(() => {
				Q(i, `${J(t).target.path ?? ""} · ${J(t).target.side ?? ""} L${J(t).target.start_line ?? ""}–${J(t).target.end_line ?? ""}`), Q(o, J(t).target.quote || "(empty file)"), Q(c, J(t).body), l.disabled = J(m), u.disabled = J(m);
			}), Y("click", r, () => de(J(t))), Y("click", l, () => de(J(t), !0)), Y("click", u, () => fe(J(t))), Z(e, n);
		});
		var Je = R(qe, 2), Ye = (e) => {
			var t = Ai(), n = L(R(I(t)), !0);
			O(t), z(() => Q(n, J(r).last_saved)), Z(e, t);
		};
		Or(Je, (e) => {
			J(r).last_saved && e(Ye);
		}), O(He), O(T), z((e) => {
			v !== (v = J(i)) && (_.value = (_.__value = v) ?? "", Gr(_, v)), C.disabled = !!J(f), $(ae, "aria-pressed", J(o) === "source"), $(ve, "aria-pressed", J(o) === "current"), be = Hr(ye, 1, "revision-status", null, be, { changed: J(x)?.status !== "unchanged" }), Q(xe, `${J(x)?.status ?? ""}: ${J(x)?.message ?? ""}`), $(je, "max", J(S).length), je.disabled = !!J(f) || J(o) === "current" || J(o) === "preview", $(Ne, "max", J(S).length), Ne.disabled = !!J(f) || J(o) === "current" || J(o) === "preview", Pe.disabled = !!J(f) || J(o) === "current" || J(o) === "preview", Q(Re, J(f) ? "Edit comment" : "Comment"), ze.disabled = J(m) || J(o) === "current" || J(o) === "preview", Be.disabled = e, Q(k, J(f) ? "Update comment" : "Add comment"), Ve.disabled = J(m), Q(We, J(r).comments.length);
		}, [() => J(m) || J(o) === "current" || J(o) === "preview" || !J(d).trim() || !J(c) && !J(f)]), Y("change", _, (e) => {
			oe(Number(e.currentTarget.value)), e.currentTarget.value = String(J(i));
		}), Y("change", C, () => {
			N(c, null), N(l, N(u, 1), !0);
		}), qr(C, () => J(a), (e) => N(a, e)), Y("click", ae, () => N(o, "source")), Y("click", ve, async () => {
			await ie(), N(o, J(o) === "current" ? "source" : "current", !0);
		}), Y("mouseup", E, le), Y("keyup", E, () => le()), lr("submit", Oe, (e) => {
			e.preventDefault(), ue();
		}), Y("change", je, ce), ri(je, () => J(l), (e) => N(l, e)), Y("change", Ne, ce), ri(Ne, () => J(u), (e) => N(u, e)), Y("click", Pe, ce), ri(ze, () => J(d), (e) => N(d, e)), Y("click", Ve, () => {
			N(d, ""), N(f, null), N(c, null);
		}), Z(e, t);
	}, E = (e) => {
		var t = Mi(), n = L(t, !0);
		z(() => Q(n, J(p) || "Loading the local review session…")), Z(e, t);
	};
	Or(T, (e) => {
		J(r) && J(n) && J(y) && J(b) ? e(Se) : e(E, -1);
	}), z(() => Q(xe, J(p) || "Select source text or line numbers, write a comment, then save feedback.")), Z(e, ge), Ue();
}
//#endregion
//#region src/main.ts
ur([
	"click",
	"change",
	"mouseup",
	"keyup"
]), Cr(Pi, { target: document.getElementById("app") });
//#endregion

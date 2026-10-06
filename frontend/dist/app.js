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
function m(e, t) {
	if (Array.isArray(e)) return e;
	if (t === void 0 || !(Symbol.iterator in e)) return Array.from(e);
	let n = [];
	for (let r of e) if (n.push(r), n.length === t) break;
	return n;
}
var h = 1024, g = 2048, _ = 4096, v = 8192, y = 16384, b = 32768, x = 1 << 25, S = 65536, C = 1 << 19, w = 1 << 20, ee = 1 << 25, te = 1 << 21, ne = 1 << 22, re = 1 << 23, T = Symbol("$state"), ie = Symbol("component"), ae = Symbol("legacy props"), oe = Symbol(""), se = Symbol("attributes"), ce = Symbol("class"), le = Symbol("style"), ue = Symbol("text"), de = Symbol("form reset"), fe = new class extends Error {
	name = "StaleReactionError";
	message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
}(), pe = !!globalThis.document?.contentType && /* @__PURE__ */ globalThis.document.contentType.includes("xml"), me = {}, E = Symbol("uninitialized"), he = "http://www.w3.org/1999/xhtml", ge = "http://www.w3.org/2000/svg", _e = "http://www.w3.org/1998/Math/MathML";
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
var D = !1;
function Se(e) {
	D = e;
}
var O;
function k(e) {
	if (e === null) throw ye(), me;
	return O = e;
}
function Ce() {
	return k(/* @__PURE__ */ rn(O));
}
function A(e) {
	if (D) {
		if (/* @__PURE__ */ rn(O) !== null) throw ye(), me;
		O = e;
	}
}
function we(e = 1) {
	if (D) {
		for (var t = e, n = O; t--;) n = /* @__PURE__ */ rn(n);
		O = n;
	}
}
function Te(e = !0) {
	for (var t = 0, n = O;;) {
		if (n.nodeType === 8) {
			var r = n.data;
			if (r === "]") {
				if (t === 0) return n;
				--t;
			} else (r === "[" || r === "[!" || r[0] === "[" && !isNaN(Number(r.slice(1)))) && (t += 1);
		}
		var i = /* @__PURE__ */ rn(n);
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
function Le(e) {
	throw Error("https://svelte.dev/e/props_invalid_value");
}
function Re() {
	throw Error("https://svelte.dev/e/state_descriptors_fixed");
}
function ze() {
	throw Error("https://svelte.dev/e/state_prototype_fixed");
}
function Be() {
	throw Error("https://svelte.dev/e/state_unsafe_mutation");
}
function Ve() {
	throw Error("https://svelte.dev/e/svelte_boundary_reset_onerror");
}
//#endregion
//#region node_modules/svelte/src/internal/client/context.js
var j = null;
function He(e) {
	j = e;
}
function Ue(e, t = !1, n) {
	j = {
		p: j,
		i: !1,
		c: null,
		e: null,
		s: e,
		x: null,
		r: W,
		l: null
	};
}
function We(e) {
	var t = j, n = t.e;
	if (n !== null) {
		t.e = null;
		for (var r of n) vn(r);
	}
	return e !== void 0 && (t.x = e), t.i = !0, j = t.p, Ge(e);
}
function Ge(e = {}) {
	return i(e, ie, { value: !0 }), e;
}
function Ke() {
	return !0;
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/task.js
var qe = [];
function Je() {
	var e = qe;
	qe = [], f(e);
}
function Ye(e) {
	if (qe.length === 0 && !St) {
		var t = qe;
		queueMicrotask(() => {
			t === qe && Je();
		});
	}
	qe.push(e);
}
function Xe() {
	for (; qe.length > 0;) Je();
}
//#endregion
//#region node_modules/svelte/src/internal/client/reactivity/status.js
var Ze = ~(g | _ | h);
function M(e, t) {
	e.f = e.f & Ze | t;
}
function Qe(e) {
	e.f & 512 || e.deps === null ? M(e, h) : M(e, _);
}
//#endregion
//#region node_modules/svelte/src/internal/client/reactivity/utils.js
function $e(e, t, n) {
	e.f & 2048 ? t.add(e) : e.f & 4096 && n.add(e), M(e, h);
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/elements/misc.js
function et(e) {
	D && /* @__PURE__ */ L(e) !== null && on(e);
}
var tt = !1;
function nt() {
	tt || (tt = !0, document.addEventListener("reset", (e) => {
		Promise.resolve().then(() => {
			if (!e.defaultPrevented) for (let t of e.target.elements) t[de]?.();
		});
	}, { capture: !0 }));
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/elements/bindings/shared.js
function rt(e) {
	var t = U, n = W;
	Bn(null), Vn(null);
	try {
		return e();
	} finally {
		Bn(t), Vn(n);
	}
}
function it(e, t, n, r = n) {
	e.addEventListener(t, () => rt(n));
	let i = e[de];
	e[de] = i ? () => {
		i(), r(!0);
	} : () => r(!0), nt();
}
//#endregion
//#region node_modules/svelte/src/internal/client/reactivity/async.js
function at(e, t, n, r) {
	let i = Ke() ? lt : ft;
	var a = e.filter((e) => !e.settled), o = t.map(i);
	if (n.length === 0 && a.length === 0) {
		r(o);
		return;
	}
	var s = W, c = ot(), l = a.length === 1 ? a[0].promise : a.length > 1 ? Promise.all(a.map((e) => e.promise)) : null;
	function u(e) {
		if (!(s.f & 16384)) {
			c();
			try {
				r([...o, ...e]);
			} catch (e) {
				dn(e, s);
			}
			st();
		}
	}
	var d = ct();
	if (n.length === 0) {
		l.then(() => u([])).finally(d);
		return;
	}
	function f() {
		Promise.all(n.map((e) => /* @__PURE__ */ dt(e))).then(u).catch((e) => dn(e, s)).finally(d);
	}
	l ? l.then(() => {
		c(), f(), st();
	}) : f();
}
function ot() {
	var e = W, t = U, n = j, r = P;
	return function(i = !0) {
		Vn(e), Bn(t), He(n), i && !(e.f & 16384) && (r?.activate(), r?.apply());
	};
}
function st(e = !0) {
	Vn(null), Bn(null), He(null), e && P?.deactivate();
}
function ct() {
	var e = W, t = e.b, n = P, r = !!t?.is_rendered();
	return t?.update_pending_count(1, n), n.increment(r, e), () => {
		t?.update_pending_count(-1, n), n.decrement(r, e);
	};
}
/*#__NO_SIDE_EFFECTS__*/
function lt(e) {
	var t = 2 | g;
	return W !== null && (W.f |= C), {
		ctx: j,
		deps: null,
		effects: null,
		equals: De,
		f: t,
		fn: e,
		reactions: null,
		rv: 0,
		v: E,
		wv: 0,
		parent: W,
		ac: null
	};
}
var ut = Symbol("obsolete");
/*#__NO_SIDE_EFFECTS__*/
function dt(e, t, n) {
	let r = W;
	r === null && je();
	var i = void 0, a = zt(E), o = !U, s = /* @__PURE__ */ new Set();
	return xn(() => {
		var t = W, n = p();
		i = n.promise;
		try {
			Promise.resolve(e()).then(n.resolve, (e) => {
				e !== fe && n.reject(e);
			}).finally(st);
		} catch (e) {
			n.reject(e), st();
		}
		var c = P;
		if (o) {
			if (t.f & 32768) var l = ct();
			if (r.b?.is_rendered()) c.async_deriveds.get(t)?.reject(ut);
			else for (let e of s.values()) e.reject(ut);
			s.add(n), c.async_deriveds.set(t, n);
		}
		let u = (e, t = void 0) => {
			l?.(), s.delete(n), t !== ut && (c.activate(), t ? (a.f |= re, Ut(a, t)) : (a.f & 8388608 && (a.f ^= re), Ut(a, e)), c.deactivate());
		};
		n.promise.then(u, (e) => u(null, e || "unknown"));
	}), gn(() => {
		for (let e of s) e.reject(ut);
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
function N(e) {
	let t = /* @__PURE__ */ lt(e);
	return Un(t), t;
}
/*#__NO_SIDE_EFFECTS__*/
function ft(e) {
	let t = /* @__PURE__ */ lt(e);
	return t.equals = ke, t;
}
function pt(e) {
	var t = e.effects;
	if (t !== null) {
		e.effects = null;
		for (var n = 0; n < t.length; n += 1) H(t[n]);
	}
}
function mt(e) {
	var t, n = W, r = e.parent;
	if (!Ln && r !== null && e.v !== E && r.f & 24576) return ve(), e.v;
	Vn(r);
	try {
		pt(e), t = $n(e);
	} finally {
		Vn(n);
	}
	return t;
}
function ht(e) {
	var t = mt(e);
	if (!e.equals(t) && (e.wv = Xn(), (!P?.is_fork || e.deps === null) && (P === null ? e.v = t : (P.capture(e, t, !0), yt?.capture(e, t, !0)), e.deps === null))) {
		M(e, h);
		return;
	}
	Ln || (bt === null ? Qe(e) : (hn() || P?.is_fork) && bt.set(e, t));
}
function gt(e) {
	if (e.effects !== null) for (let t of e.effects) (t.teardown || t.ac) && (t.teardown?.(), t.ac !== null && rt(() => {
		t.ac.abort(fe), t.ac = null;
	}), t.fn !== null && (t.teardown = d), nr(t, 0), En(t));
}
function _t(e) {
	if (e.effects !== null) for (let t of e.effects) t.teardown && t.fn !== null && rr(t);
}
//#endregion
//#region node_modules/svelte/src/internal/client/reactivity/batch.js
var vt = null, P = null, yt = null, bt = null, xt = null, St = !1, Ct = !1, wt = null, Tt = null, Et = 0, Dt = 1, Ot = class e {
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
			for (var r of n.d) M(r, g), t(r);
			for (r of n.m) M(r, _), t(r);
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
					t.f ^= h;
				}
			}
			n || e.push(t);
		}
		return this.#c = [], e;
	}
	#_() {
		this.#e = !0;
		for (let e of this.#u) this.#d.delete(e), M(e, g), this.schedule(e);
		for (let e of this.#d) M(e, _), this.schedule(e);
		this.apply();
		for (var t = wt = [], n = [], r = Tt = []; this.#c.length > 0;) {
			Et++ > 1e3 && (this.#S(), At());
			for (let e of this.#g()) try {
				this.#v(e, t, n);
			} catch (t) {
				throw Ft(e), this.#h() || this.discard(), t;
			}
		}
		if (P = null, r.length > 0) {
			var i = e.ensure();
			for (let e of r) i.schedule(e);
		}
		if (wt = null, Tt = null, this.#h()) {
			this.#x(n), this.#x(t);
			for (let [e, t] of this.#f) Pt(e, t);
			r.length > 0 && P.#_();
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
		var o = P;
		if (this.#a === 0 && (this.#c.length === 0 || o !== null) && this.#S(), this.#c.length > 0) {
			if (o !== null) {
				for (let e of this.#c) o.#c.push(e);
				this.#c = [];
			} else o = this;
		}
		o !== null && (Lt.clear(), o.#_());
	}
	#v(e, t, n) {
		e.f ^= h;
		for (var r = e.first; r !== null;) {
			var i = r.f, a = !!(i & 96);
			if (!(a && i & 1024 || i & 8192 || this.#f.has(r)) && r.fn !== null) {
				a ? r.f ^= h : i & 4 ? t.push(r) : Zn(r) && (i & 16 && this.#d.add(r), rr(r));
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
					r & 4194320 && !this.async_deriveds.has(i) && (this.#d.delete(i), M(i, g), this.schedule(i));
				}
			}
		};
		for (let e of this.current.keys()) t(e);
		this.oncommit(() => e.discard()), e.#S(), P = this, this.#_();
	}
	#x(e) {
		for (var t = 0; t < e.length; t += 1) $e(e[t], this.#u, this.#d);
	}
	capture(e, t, n = !1) {
		e.v !== E && !this.previous.has(e) && this.previous.set(e, e.v), e.f & 8388608 || (this.current.set(e, [t, n]), bt?.set(e, t)), this.is_fork || (e.v = t);
	}
	activate() {
		P = this;
	}
	deactivate() {
		P = null, bt = null;
	}
	flush() {
		try {
			Ct = !0, P = this, this.#_();
		} finally {
			Et = 0, xt = null, wt = null, Tt = null, Ct = !1, P = null, bt = null, Lt.clear();
		}
	}
	discard() {
		for (let e of this.#i) e(this);
		this.#i.clear();
		for (let e of this.async_deriveds.values()) e.reject(ut);
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
		this.#m || (this.#m = !0, Ye(() => {
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
		if (P === null) {
			let t = P = new e();
			!Ct && !St && Ye(() => {
				t.#e || t.flush();
			});
		}
		return P;
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
		for (e && (P !== null && !P.is_fork && P.flush(), n = e());;) {
			if (Xe(), P === null) return n;
			P.flush();
		}
	} finally {
		St = t;
	}
}
function At() {
	try {
		Ie();
	} catch (e) {
		dn(e, xt);
	}
}
var jt = null;
function Mt(e) {
	var t = e.length;
	if (t !== 0) {
		for (var n = 0; n < t;) {
			var r = e[n++];
			if (!(r.f & 24576) && Zn(r) && (jt = /* @__PURE__ */ new Set(), rr(r), r.deps === null && r.first === null && r.nodes === null && r.teardown === null && r.ac === null && kn(r), jt?.size > 0)) {
				Lt.clear();
				for (let e of jt) {
					if (e.f & 24576) continue;
					let t = [e], n = e.parent;
					for (; n !== null;) jt.has(n) && (jt.delete(n), t.push(n)), n = n.parent;
					for (let e = t.length - 1; e >= 0; e--) {
						let n = t[e];
						n.f & 24576 || rr(n);
					}
				}
				jt.clear();
			}
		}
		jt = null;
	}
}
function Nt(e) {
	P.schedule(e);
}
function Pt(e, t) {
	if (!(e.f & 32 && e.f & 1024)) {
		e.f & 2048 ? t.d.push(e) : e.f & 4096 && t.m.push(e), M(e, h);
		for (var n = e.first; n !== null;) Pt(n, t), n = n.next;
	}
}
function Ft(e) {
	M(e, h);
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
function F(e, t) {
	let n = zt(e, t);
	return Un(n), n;
}
/*#__NO_SIDE_EFFECTS__*/
function Bt(e, t = !1, n = !0) {
	let r = zt(e);
	return t || (r.equals = ke), r;
}
function I(e, t, n = !1) {
	return U !== null && (!zn || U.f & 131072) && Ke() && U.f & 4325394 && (Hn === null || !Hn.has(e)) && Be(), Ut(e, n ? qt(t) : t, Tt);
}
var Vt = null, Ht = 0;
function Ut(e, t, n = null) {
	if (!e.equals(t)) {
		Ln ? Lt.set(e, t) : Lt.has(e) || Lt.set(e, e.v);
		var r = Ot.ensure();
		if (r.capture(e, t), e.f & 2) {
			let t = e;
			e.f & 2048 && mt(t), bt === null && Qe(t);
		}
		e.wv = Xn(), Vt = null, Ht = 0, Kt(e, g, n), Vt = null, Ke() && W !== null && W.f & 1024 && !(W.f & 96) && (Wn === null ? Gn([e]) : Wn.push(e)), !r.is_fork && It.size > 0 && !Rt && Wt();
	}
	return t;
}
function Wt() {
	Rt = !1;
	for (let e of It) {
		e.f & 1024 && M(e, _);
		let t;
		try {
			t = Zn(e);
		} catch {
			t = !0;
		}
		t && rr(e);
	}
	It.clear();
}
function Gt(e) {
	I(e, e.v + 1);
}
function Kt(e, t, n) {
	var r = e.reactions;
	if (r !== null) {
		var i = Ke(), a = r.length;
		if (Ht += a, Ht > 1e5 && Vt === null && (Vt = /* @__PURE__ */ new Set()), Vt !== null) {
			if (Vt.has(e)) return;
			Vt.add(e);
		}
		for (var o = 0; o < a; o++) {
			var s = r[o], c = s.f;
			if (i || s !== W) {
				var l = (c & g) === 0;
				if (l && M(s, t), c & 131072) It.add(s);
				else if (c & 2) {
					var u = s;
					bt?.delete(u), Kt(u, _, n);
				} else if (l) {
					var d = s;
					c & 16 && jt !== null && jt.add(d), n === null ? Nt(d) : n.push(d);
				}
			}
		}
	}
}
function qt(t) {
	if (typeof t != "object" || !t || T in t || ie in t) return t;
	let n = l(t);
	if (n !== s && n !== c) return t;
	var r = /* @__PURE__ */ new Map(), i = e(t), o = /* @__PURE__ */ F(0), u = null, d = Jn, f = (e) => {
		if (Jn === d) return e();
		var t = U, n = Jn;
		Bn(null), Yn(d);
		var r = e();
		return Bn(t), Yn(n), r;
	};
	return i && r.set("length", /* @__PURE__ */ F(t.length, u)), new Proxy(t, {
		defineProperty(e, t, n) {
			(!("value" in n) || n.configurable === !1 || n.enumerable === !1 || n.writable === !1) && Re();
			var i = r.get(t);
			return i === void 0 ? f(() => {
				var e = /* @__PURE__ */ F(n.value, u);
				return r.set(t, e), e;
			}) : I(i, n.value, !0), !0;
		},
		deleteProperty(e, t) {
			var n = r.get(t);
			if (n === void 0) {
				if (t in e) {
					let e = f(() => /* @__PURE__ */ F(E, u));
					r.set(t, e), Gt(o);
				}
			} else I(n, E), Gt(o);
			return !0;
		},
		get(e, n, i) {
			if (n === T) return t;
			var o = r.get(n), s = n in e;
			if (o === void 0 && (!s || a(e, n)?.writable) && (o = f(() => /* @__PURE__ */ F(qt(s ? e[n] : E), u)), r.set(n, o)), o !== void 0) {
				var c = q(o);
				return c === E ? void 0 : c;
			}
			return Reflect.get(e, n, i);
		},
		getOwnPropertyDescriptor(e, t) {
			this.has?.(e, t);
			var n = Reflect.getOwnPropertyDescriptor(e, t), i = r.get(t);
			if (i !== void 0) {
				var a = q(i);
				if (a === E) return;
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
			if (t === T) return !0;
			var n = r.get(t), i = n !== void 0 && n.v !== E || Reflect.has(e, t);
			return (n !== void 0 || W !== null && (!i || a(e, t)?.writable)) && (n === void 0 && (n = f(() => /* @__PURE__ */ F(i ? qt(e[t]) : E, u)), r.set(t, n)), q(n) === E) ? !1 : i;
		},
		set(e, t, n, s) {
			var c = r.get(t), l = t in e;
			if (i && t === "length") for (var d = n; d < c.v; d += 1) {
				var p = r.get(d + "");
				p === void 0 ? d in e && (p = f(() => /* @__PURE__ */ F(E, u)), r.set(d + "", p)) : I(p, E);
			}
			if (c === void 0) (!l || a(e, t)?.writable) && (c = f(() => /* @__PURE__ */ F(void 0, u)), I(c, qt(n)), r.set(t, c));
			else {
				l = c.v !== E;
				var m = f(() => qt(n));
				I(c, m);
			}
			var h = Reflect.getOwnPropertyDescriptor(e, t);
			if (h?.set && h.set.call(s, n), !l) {
				if (i && typeof t == "string") {
					var g = r.get("length"), _ = Number(t);
					Number.isInteger(_) && _ >= g.v && I(g, _ + 1);
				}
				Gt(o);
			}
			return !0;
		},
		ownKeys(e) {
			q(o);
			var t = Reflect.ownKeys(e).filter((e) => {
				var t = r.get(e);
				return t === void 0 || t.v !== E;
			});
			for (var [n, i] of r) i.v !== E && !(n in e) && t.push(n);
			return t;
		},
		setPrototypeOf() {
			ze();
		}
	});
}
function Jt(e) {
	try {
		if (typeof e == "object" && e && T in e) return e[T];
	} catch {}
	return e;
}
function Yt(e, t) {
	return Object.is(Jt(e), Jt(t));
}
var Xt, Zt, Qt, $t, en;
function tn() {
	if (Xt === void 0) {
		Xt = window, Zt = document, Qt = /Firefox/.test(navigator.userAgent);
		var e = Element.prototype, t = Node.prototype, n = Text.prototype;
		$t = a(t, "firstChild").get, en = a(t, "nextSibling").get, u(e) && (e[ce] = void 0, e[se] = null, e[le] = void 0, e.__e = void 0), u(n) && (n[ue] = void 0);
	}
}
function nn(e = "") {
	return document.createTextNode(e);
}
/*@__NO_SIDE_EFFECTS__*/
function L(e) {
	return $t.call(e);
}
/*@__NO_SIDE_EFFECTS__*/
function rn(e) {
	return en.call(e);
}
function R(e, t) {
	if (!D) return /* @__PURE__ */ L(e);
	var n = /* @__PURE__ */ L(O);
	if (n === null) n = O.appendChild(nn());
	else if (t && n.nodeType !== 3) {
		var r = nn();
		return n?.before(r), k(r), r;
	}
	return t && ln(n), k(n), n;
}
function an(e, t = !1) {
	if (!D) {
		var n = /* @__PURE__ */ L(e);
		return n instanceof Comment && n.data === "" ? /* @__PURE__ */ rn(n) : n;
	}
	if (t) {
		if (O?.nodeType !== 3) {
			var r = nn();
			return O?.before(r), k(r), r;
		}
		ln(O);
	}
	return O;
}
function z(e, t = !1) {
	if (!D) return /* @__PURE__ */ L(e);
	var n = R(e, t);
	return A(e), n;
}
function B(e, t = 1, n = !1) {
	let r = D ? O : e;
	for (var i; t--;) i = r, r = /* @__PURE__ */ rn(r);
	if (!D) return r;
	if (n) {
		if (r?.nodeType !== 3) {
			var a = nn();
			return r === null ? i?.after(a) : r.before(a), k(a), a;
		}
		ln(r);
	}
	return k(r), r;
}
function on(e) {
	e.textContent = "";
}
function sn() {
	return !1;
}
function cn(e, t, n) {
	return t == null || t === "http://www.w3.org/1999/xhtml" ? n ? document.createElement(e, { is: n }) : document.createElement(e) : n ? document.createElementNS(t, e, { is: n }) : document.createElementNS(t, e);
}
function ln(e) {
	if (e.nodeValue.length < 65536) return;
	let t = e.nextSibling;
	for (; t !== null && t.nodeType === 3;) t.remove(), e.nodeValue += t.nodeValue, t = e.nextSibling;
}
function un(e) {
	var t = W;
	if (t === null) return U.f |= re, e;
	if (!(t.f & 32768) && !(t.f & 4)) throw e;
	dn(e, t);
}
function dn(e, t) {
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
function fn(e) {
	W === null && (U === null && Fe(e), Pe()), Ln && Ne(e);
}
function pn(e, t) {
	var n = t.last;
	n === null ? t.last = t.first = e : (n.next = e, e.prev = n, t.last = e);
}
function mn(e, t) {
	var n = W;
	n !== null && n.f & 8192 && (e |= v);
	var r = {
		ctx: j,
		deps: null,
		nodes: null,
		f: e | g | 512,
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
	P?.register_created_effect(r);
	var i = r;
	if (e & 4) wt === null ? Ot.ensure().schedule(r) : wt.push(r);
	else if (t !== null) {
		try {
			rr(r);
		} catch (e) {
			throw H(r), e;
		}
		i.deps === null && i.teardown === null && i.nodes === null && i.first === i.last && !(i.f & 524288) && (i = i.first, e & 16 && e & 65536 && i !== null && (i.f |= S));
	}
	if (i !== null && (i.parent = n, n !== null && pn(i, n), U !== null && U.f & 2 && !(e & 64))) {
		var a = U;
		(a.effects ??= []).push(i);
	}
	return r;
}
function hn() {
	return U !== null && !zn;
}
function gn(e) {
	let t = mn(8, null);
	return M(t, h), t.teardown = e, t;
}
function _n(e) {
	fn("$effect");
	var t = W.f;
	if (!U && t & 32 && j !== null && !j.i) {
		var n = j;
		(n.e ??= []).push(e);
	} else return vn(e);
}
function vn(e) {
	return mn(4 | w, e);
}
function yn(e) {
	Ot.ensure();
	let t = mn(64 | C, e);
	return (e = {}) => new Promise((n) => {
		e.outro ? An(t, () => {
			H(t), n(void 0);
		}) : (H(t), n(void 0));
	});
}
function bn(e) {
	return mn(4, e);
}
function xn(e) {
	return mn(ne | C, e);
}
function Sn(e, t = 0) {
	return mn(8 | t, e);
}
function V(e, t = [], n = [], r = []) {
	at(r, t, n, (t) => {
		mn(8, () => {
			e(...t.map(q));
		});
	});
}
function Cn(e, t = 0) {
	return mn(16 | t, e);
}
function wn(e) {
	return mn(32 | C, e);
}
function Tn(e) {
	var t = e.teardown;
	if (t !== null) {
		let n = Ln, r = U;
		Rn(!0), Bn(null);
		try {
			t.call(null);
		} catch (t) {
			dn(t, e.parent);
		} finally {
			Rn(n), Bn(r);
		}
	}
}
function En(e, t = !1) {
	var n = e.first;
	for (e.first = e.last = null; n !== null;) {
		let e = n.ac;
		e !== null && rt(() => {
			e.abort(fe);
		});
		var r = n.next;
		n.f & 64 ? n.parent = null : H(n, t), n = r;
	}
}
function Dn(e) {
	for (var t = e.first; t !== null;) {
		var n = t.next;
		t.f & 32 || H(t), t = n;
	}
}
function H(e, t = !0) {
	var n = !1;
	(t || e.f & 262144) && e.nodes !== null && e.nodes.end !== null && (On(e.nodes.start, e.nodes.end), n = !0), e.f |= x, En(e, t && !n), nr(e, 0);
	var r = e.nodes && e.nodes.t;
	if (r !== null) for (let e of r) e.stop();
	Tn(e), e.f ^= x, e.f |= y;
	var i = e.parent;
	i !== null && i.first !== null && kn(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function On(e, t) {
	for (; e !== null;) {
		var n = e === t ? null : /* @__PURE__ */ rn(e);
		e.remove(), e = n;
	}
}
function kn(e) {
	var t = e.parent, n = e.prev, r = e.next;
	n !== null && (n.next = r), r !== null && (r.prev = n), t !== null && (t.first === e && (t.first = r), t.last === e && (t.last = n));
}
function An(e, t, n = !0) {
	var r = [];
	e.f |= 256, jn(e, r, !0);
	var i = () => {
		n && H(e), t && t();
	}, a = r.length;
	if (a > 0) {
		var o = () => --a || i();
		for (var s of r) s.out(o);
	} else i();
}
function jn(e, t, n) {
	if (!(e.f & 8192)) {
		e.f ^= v;
		var r = e.nodes && e.nodes.t;
		if (r !== null) for (let e of r) (e.is_global || n) && t.push(e);
		for (var i = e.first; i !== null;) {
			var a = i.next;
			if (!(i.f & 64)) {
				var o = !!(i.f & 65536) || !!(i.f & 32) && !!(e.f & 16);
				jn(i, t, o ? n : !1);
			}
			i = a;
		}
	}
}
function Mn(e) {
	e.f &= -257, Nn(e, !0);
}
function Nn(e, t) {
	if (!(e.f & 256) && e.f & 8192) {
		e.f ^= v, e.f & 1024 || (M(e, g), Ot.ensure().schedule(e));
		for (var n = e.first; n !== null;) {
			var r = n.next, i = !!(n.f & 65536) || !!(n.f & 32);
			Nn(n, i ? t : !1), n = r;
		}
		var a = e.nodes && e.nodes.t;
		if (a !== null) for (let e of a) (e.is_global || t) && e.in();
	}
}
function Pn(e, t) {
	if (e.nodes) for (var n = e.nodes.start, r = e.nodes.end; n !== null;) {
		var i = n === r ? null : /* @__PURE__ */ rn(n);
		t.append(n), n = i;
	}
}
//#endregion
//#region node_modules/svelte/src/internal/client/legacy.js
var Fn = null, In = !1, Ln = !1;
function Rn(e) {
	Ln = e;
}
var U = null, zn = !1;
function Bn(e) {
	U = e;
}
var W = null;
function Vn(e) {
	W = e;
}
var Hn = null;
function Un(e) {
	U !== null && (U.f & 2097152 || U.f & 2) && (Hn ??= /* @__PURE__ */ new Set()).add(e);
}
var G = null, K = 0, Wn = null;
function Gn(e) {
	Wn = e;
}
var Kn = 1, qn = 0, Jn = qn;
function Yn(e) {
	Jn = e;
}
function Xn() {
	return ++Kn;
}
function Zn(e) {
	var t = e.f;
	if (t & 2048) return !0;
	if (t & 4096) {
		for (var n = e.deps, r = n.length, i = 0; i < r; i++) {
			var a = n[i];
			if (Zn(a) && ht(a), a.wv > e.wv) return !0;
		}
		t & 512 && bt === null && M(e, h);
	}
	return !1;
}
function Qn(e, t, n = !0) {
	var r = e.reactions;
	if (r !== null && !(Hn !== null && Hn.has(e))) for (var i = 0; i < r.length; i++) {
		var a = r[i];
		a.f & 2 ? Qn(a, t, !1) : t === a && (n ? M(a, g) : a.f & 1024 && M(a, _), Nt(a));
	}
}
function $n(e) {
	var t = G, n = K, r = Wn, i = U, a = Hn, o = j, s = zn, c = Jn, l = e.f;
	G = null, K = 0, Wn = null, U = l & 96 ? null : e, Hn = null, He(e.ctx), zn = !1, Jn = ++qn, e.ac !== null && (rt(() => {
		e.ac.abort(fe);
	}), e.ac = null);
	try {
		e.f |= te;
		var u = e.fn, d = u();
		e.f |= b;
		var f = er(e);
		if (Ke() && Wn !== null && !zn && f !== null && !(e.f & 6146)) for (var p = 0; p < Wn.length; p++) Qn(Wn[p], e);
		if (i !== null && i !== e) {
			if (qn++, i.deps !== null) for (let e = 0; e < n; e += 1) i.deps[e].rv = qn;
			if (t !== null) for (let e of t) e.rv = qn;
			Wn !== null && (r === null ? r = Wn : r.push(...Wn));
		}
		return e.f & 8388608 && (e.f ^= re), d;
	} catch (t) {
		return er(e), un(t);
	} finally {
		e.f ^= te, G = t, K = n, Wn = r, U = i, Hn = a, He(o), zn = s, Jn = c;
	}
}
function er(e) {
	var t = e.deps, n = P?.is_fork;
	if (G !== null) {
		var r;
		if (n || nr(e, K), t !== null && K > 0) for (t.length = K + G.length, r = 0; r < G.length; r++) t[K + r] = G[r];
		else e.deps = t = G;
		if (hn() && e.f & 512) for (r = K; r < t.length; r++) (t[r].reactions ??= []).push(e);
	} else !n && t !== null && K < t.length && (nr(e, K), t.length = K);
	return t;
}
function tr(e, r) {
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
		s.f & 512 && (s.f ^= 512), s.v !== E && Qe(s), s.ac !== null && rt(() => {
			s.ac.abort(fe), s.ac = null, M(s, g);
		}), gt(s), nr(s, 0);
	}
}
function nr(e, t) {
	var n = e.deps;
	if (n !== null) for (var r = t; r < n.length; r++) tr(e, n[r]);
}
function rr(e) {
	var t = e.f;
	if (!(t & 16384)) {
		M(e, h);
		var n = W, r = In;
		W = e, In = !(t & 96);
		try {
			t & 16777232 ? Dn(e) : En(e), Tn(e);
			var i = $n(e);
			e.teardown = typeof i == "function" ? i : null, e.wv = Kn;
		} finally {
			In = r, W = n;
		}
	}
}
async function ir() {
	await Promise.resolve(), kt();
}
function q(e) {
	var t = !!(e.f & 2);
	if (Fn?.add(e), U !== null && !zn && !(W !== null && W.f & 16384) && (Hn === null || !Hn.has(e))) {
		var r = U.deps;
		if (U.f & 2097152) e.rv < qn && (e.rv = qn, G === null && r !== null && r[K] === e ? K++ : G === null ? G = [e] : G.push(e));
		else {
			U.deps ??= [], n.call(U.deps, e) || U.deps.push(e);
			var i = e.reactions;
			i === null ? e.reactions = [U] : n.call(i, U) || i.push(U);
		}
	}
	if (Ln && Lt.has(e)) return Lt.get(e);
	if (t) {
		var a = e;
		if (Ln) {
			var o = a.v;
			return (!(a.f & 1024) && a.reactions !== null || or(a)) && (o = mt(a)), Lt.set(a, o), o;
		}
		var s = !(a.f & 512) && !zn && U !== null && (In || !!(U.f & 512)), c = (a.f & b) === 0;
		Zn(a) && (s && (a.f |= 512), ht(a)), s && !c && (_t(a), ar(a));
	}
	if (bt?.has(e)) return bt.get(e);
	if (e.f & 8388608) throw e.v;
	return e.v;
}
function ar(e) {
	if (e.f |= 512, e.deps !== null) for (let t of e.deps) (t.reactions ??= []).push(e), t.f & 2 && !(t.f & 512) && (_t(t), ar(t));
}
function or(e) {
	if (e.v === E) return !0;
	if (e.deps === null) return !1;
	for (let t of e.deps) if (Lt.has(t) || t.f & 2 && or(t)) return !0;
	return !1;
}
function sr(e) {
	var t = zn;
	try {
		return zn = !0, e();
	} finally {
		zn = t;
	}
}
[.../* @__PURE__ */ "allowfullscreen.async.autofocus.autoplay.checked.controls.default.disabled.formnovalidate.indeterminate.inert.ismap.loop.multiple.muted.nomodule.novalidate.open.playsinline.readonly.required.reversed.seamless.selected.webkitdirectory.defer.disablepictureinpicture.disableremoteplayback".split(".")];
var cr = ["touchstart", "touchmove"];
function lr(e) {
	return cr.includes(e);
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/elements/events.js
var ur = Symbol("events"), dr = /* @__PURE__ */ new Set(), fr = /* @__PURE__ */ new Set();
function pr(e, t, n, r = {}) {
	function i(e) {
		if (r.capture || vr.call(t, e), !e.cancelBubble) return rt(() => n?.call(this, e));
	}
	return e.startsWith("pointer") || e.startsWith("touch") || e === "wheel" ? (i.__removed = !1, Ye(() => {
		i.__removed || t.addEventListener(e, i, r);
	})) : t.addEventListener(e, i, r), i;
}
function mr(e, t, n, r, i) {
	var a = {
		capture: r,
		passive: i
	}, o = pr(e, t, n, a);
	(t === document.body || t === window || t === document || t instanceof HTMLMediaElement) && gn(() => {
		o.__removed = !0, t.removeEventListener(e, o, a);
	});
}
function J(e, t, n) {
	(t[ur] ??= {})[e] = n;
}
function hr(e) {
	for (var t = 0; t < e.length; t++) dr.add(e[t]);
	for (var n of fr) n(e);
}
var gr = null, _r = !1;
function vr(e) {
	var t = this, n = t.ownerDocument, r = e.type, a = e.composedPath?.() || [], o = a[0] || e.target;
	gr = e, _r || (_r = !0, setTimeout(() => {
		_r = !1, gr = null;
	}));
	var s = 0, c = gr === e && e[ur];
	if (c) {
		var l = a.indexOf(c);
		if (l !== -1 && (t === document || t === window)) {
			e[ur] = t;
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
		var d = U, f = W;
		Bn(null), Vn(null);
		try {
			for (var p, m = []; o !== null && o !== t;) {
				try {
					var h = o[ur]?.[r];
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
			e[ur] = t, delete e.currentTarget, Bn(d), Vn(f);
		}
	}
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/reconciler.js
var yr = globalThis?.window?.trustedTypes && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", { createHTML: (e) => e });
function br(e) {
	return yr?.createHTML(e) ?? e;
}
function xr(e) {
	var t = cn("template");
	return t.innerHTML = br(e.replaceAll("<!>", "<!---->")), t.content;
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/template.js
function Sr(e, t) {
	var n = W;
	n.nodes === null && (n.nodes = {
		start: e,
		end: t,
		a: null,
		t: null
	});
}
/*#__NO_SIDE_EFFECTS__*/
function Y(e, t) {
	var n = !!(t & 1), r = !!(t & 2), i, a = !e.startsWith("<!>");
	return () => {
		if (D) return Sr(O, null), O;
		i === void 0 && (i = xr(a ? e : "<!>" + e), n || (i = /* @__PURE__ */ L(i)));
		var t = r || Qt ? document.importNode(i, !0) : i.cloneNode(!0);
		if (n) {
			var o = /* @__PURE__ */ L(t), s = t.lastChild;
			Sr(o, s);
		} else Sr(t, t);
		return t;
	};
}
function Cr() {
	if (D) return Sr(O, null), O;
	var e = document.createDocumentFragment(), t = document.createComment(""), n = nn();
	return e.append(t, n), Sr(t, n), e;
}
function X(e, t) {
	if (D) {
		var n = W;
		(!(n.f & 32768) || n.nodes.end === null) && (n.nodes.end = O), Ce();
		return;
	}
	e !== null && e.before(t);
}
//#endregion
//#region node_modules/svelte/src/reactivity/create-subscriber.js
function wr(e) {
	let t = 0, n = zt(0), r;
	return () => {
		hn() && (q(n), Sn(() => (t === 0 && (r = sr(() => e(() => Gt(n)))), t += 1, () => {
			Ye(() => {
				--t, t === 0 && (r?.(), r = void 0, Gt(n));
			});
		})));
	};
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/blocks/boundary.js
var Tr = S | C;
function Er(e, t, n, r) {
	new Dr(e, t, n, r);
}
var Dr = class {
	parent;
	is_pending = !1;
	transform_error;
	#e;
	#t = D ? O : null;
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
	#h = wr(() => (this.#m = zt(this.#l), () => {
		this.#m = null;
	}));
	constructor(e, t, n, r) {
		this.#e = e, this.#n = t, this.#r = (e) => {
			var t = W;
			t.b = this, t.f |= 128, n(e);
		}, this.parent = W.b, this.transform_error = r ?? this.parent?.transform_error ?? ((e) => e), this.#i = Cn(() => {
			if (D) {
				let e = this.#t;
				Ce();
				let t = e.data === "[!";
				if (e.data.startsWith("[?")) {
					let t = JSON.parse(e.data.slice(2));
					this.#_(t);
				} else t ? this.#y() : this.#g();
			} else this.#b();
		}, Tr), D && (this.#e = O);
	}
	#g() {
		try {
			this.#a = wn(() => this.#r(this.#e));
		} catch (e) {
			this.error(e);
		}
	}
	#_(e) {
		let t = this.#n.failed, { reset: n, invoke_onerror: r } = this.#v(e);
		Ye(r), t && (this.#s = wn(() => {
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
			t = !0, n && Ve(), this.#s !== null && An(this.#s, () => {
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
					dn(e, this.#i && this.#i.parent);
				}
			}
		};
	}
	#y() {
		let e = this.#n.pending;
		e && (this.is_pending = !0, this.#o = wn(() => e(this.#e)), Ye(() => {
			var e = this.#c = document.createDocumentFragment(), t = nn(), n = !1;
			if (e.append(t), this.#a = this.#S(() => {
				try {
					return wn(() => this.#r(t));
				} catch (e) {
					try {
						this.error(e), n = !0;
					} catch (e) {
						dn(e, this.#i.parent);
					}
					return null;
				}
			}), this.#a === null) {
				this.#c = null, n && this.#x(P);
				return;
			}
			this.#u === 0 && (this.#e.before(e), this.#c = null, An(this.#o, () => {
				this.#o = null;
			}), this.#x(P));
		}));
	}
	#b() {
		try {
			if (this.is_pending = this.has_pending_snippet(), this.#u = 0, this.#l = 0, this.#a = wn(() => {
				this.#r(this.#e);
			}), this.#u > 0) {
				var e = this.#c = document.createDocumentFragment();
				Pn(this.#a, e);
				let t = this.#n.pending;
				this.#o = wn(() => t(this.#e));
			} else this.#x(P);
		} catch (e) {
			this.error(e);
		}
	}
	#x(e) {
		this.is_pending = !1, e.transfer_effects(this.#f, this.#p);
	}
	defer_effect(e) {
		$e(e, this.#f, this.#p);
	}
	is_rendered() {
		return !this.is_pending && (!this.parent || this.parent.is_rendered());
	}
	has_pending_snippet() {
		return !!this.#n.pending;
	}
	#S(e) {
		var t = W, n = U, r = j;
		Vn(this.#i), Bn(this.#i), He(this.#i.ctx);
		try {
			return Ot.ensure(), e();
		} finally {
			Vn(t), Bn(n), He(r);
		}
	}
	#C(e, t) {
		if (!this.has_pending_snippet()) {
			this.parent && this.parent.#C(e, t);
			return;
		}
		this.#u += e, this.#u === 0 && (this.#x(t), this.#o && An(this.#o, () => {
			this.#o = null;
		}), this.#c &&= (this.#e.before(this.#c), null));
	}
	update_pending_count(e, t) {
		this.#C(e, t), this.#l += e, !(!this.#m || this.#d) && (this.#d = !0, Ye(() => {
			this.#d = !1, this.#m && Ut(this.#m, this.#l);
		}));
	}
	get_effect_pending() {
		return this.#h(), q(this.#m);
	}
	error(e) {
		if (!this.#n.onerror && !this.#n.failed) throw e;
		P?.is_fork ? (this.#a && P.skip_effect(this.#a), this.#o && P.skip_effect(this.#o), this.#s && P.skip_effect(this.#s), P.oncommit(() => {
			this.#w(e);
		})) : this.#w(e);
	}
	#w(e) {
		this.#a &&= (H(this.#a), null), this.#o &&= (H(this.#o), null), this.#s &&= (H(this.#s), null), D && (k(this.#t), we(), k(Te()));
		let t = this.#n.failed, n = (e) => {
			let { reset: n, invoke_onerror: r } = this.#v(e);
			r(), t && (this.#s = this.#S(() => {
				try {
					return wn(() => {
						var r = W;
						r.b = this, r.f |= 128, t(this.#e, () => e, () => n);
					});
				} catch (e) {
					return dn(e, this.#i.parent), null;
				}
			}));
		};
		Ye(() => {
			var t;
			try {
				t = this.transform_error(e);
			} catch (e) {
				dn(e, this.#i && this.#i.parent);
				return;
			}
			typeof t == "object" && t && typeof t.then == "function" ? t.then(n, (e) => dn(e, this.#i && this.#i.parent)) : n(t);
		});
	}
};
function Z(e, t) {
	var n = t == null ? "" : typeof t == "object" ? `${t}` : t;
	n !== (e[ue] ??= e.nodeValue) && (e[ue] = n, e.nodeValue = `${n}`);
}
function Or(e, t) {
	return Ar(e, t);
}
var kr = /* @__PURE__ */ new Map();
function Ar(e, { target: t, anchor: n, props: i = {}, events: a, context: o, intro: s = !0, transformError: c }) {
	tn();
	var l = void 0, u = yn(() => {
		var s = n ?? t.appendChild(nn());
		Er(s, { pending: () => {} }, (t) => {
			Ue({});
			var n = j;
			if (o && (n.c = o), a && (i.$$events = a), D && Sr(t, null), l = e(t, i) || Ge(), D && (W.nodes.end = O, O === null || O.nodeType !== 8 || O.data !== "]")) throw ye(), me;
			We();
		}, c);
		var u = /* @__PURE__ */ new Set(), d = (e) => {
			for (var n = 0; n < e.length; n++) {
				var r = e[n];
				if (!u.has(r)) {
					u.add(r);
					var i = lr(r);
					for (let e of [t, document]) {
						var a = kr.get(e);
						a === void 0 && (a = /* @__PURE__ */ new Map(), kr.set(e, a));
						var o = a.get(r);
						o === void 0 ? (e.addEventListener(r, vr, { passive: i }), a.set(r, 1)) : a.set(r, o + 1);
					}
				}
			}
		};
		return d(r(dr)), fr.add(d), () => {
			for (var e of u) for (let n of [t, document]) {
				var r = kr.get(n), i = r.get(e);
				--i == 0 ? (n.removeEventListener(e, vr), r.delete(e), r.size === 0 && kr.delete(n)) : r.set(e, i);
			}
			fr.delete(d), s !== n && s.parentNode?.removeChild(s);
		};
	});
	return jr.set(l, u), l;
}
var jr = /* @__PURE__ */ new WeakMap(), Mr = class {
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
			if (n) Mn(n), this.#r.delete(t);
			else {
				var r = this.#n.get(t);
				r && (Mn(r.effect), this.#t.set(t, r.effect), this.#n.delete(t), r.fragment.lastChild.remove(), this.anchor.before(r.fragment), n = r.effect);
			}
			for (let [t, n] of this.#e) {
				if (this.#e.delete(t), t === e) break;
				let r = this.#n.get(n);
				r && (H(r.effect), this.#n.delete(n));
			}
			for (let [e, r] of this.#t) {
				if (e === t || this.#r.has(e)) continue;
				let i = () => {
					if (Array.from(this.#e.values()).includes(e)) {
						var t = document.createDocumentFragment();
						Pn(r, t), t.append(nn()), this.#n.set(e, {
							effect: r,
							fragment: t
						});
					} else H(r);
					this.#r.delete(e), this.#t.delete(e);
				};
				this.#i || !n ? (this.#r.add(e), An(r, i, !1)) : i();
			}
		}
	};
	#o = (e) => {
		this.#e.delete(e);
		let t = Array.from(this.#e.values());
		for (let [e, n] of this.#n) t.includes(e) || (H(n.effect), this.#n.delete(e));
	};
	ensure(e, t) {
		var n = P, r = sn();
		if (t && !this.#t.has(e) && !this.#n.has(e)) {
			if (r) {
				var i = document.createDocumentFragment(), a = nn();
				i.append(a), this.#n.set(e, {
					effect: wn(() => t(a)),
					fragment: i
				});
			} else this.#t.set(e, wn(() => t(this.anchor)));
		}
		if (this.#e.set(n, e), r) {
			for (let [t, r] of this.#t) t === e ? n.unskip_effect(r) : n.skip_effect(r);
			for (let [t, r] of this.#n) t === e ? n.unskip_effect(r.effect) : n.skip_effect(r.effect);
			n.oncommit(this.#a), n.ondiscard(this.#o);
		} else D && (this.anchor = O), this.#a(n);
	}
};
//#endregion
//#region node_modules/svelte/src/internal/client/dom/blocks/if.js
function Q(e, t, n = !1) {
	var r;
	D && (r = O, Ce());
	var i = new Mr(e), a = n ? S : 0;
	function o(e, t) {
		if (D) {
			var n = Ee(r);
			if (e !== parseInt(n.substring(1))) {
				var a = Te();
				k(a), i.anchor = a, Se(!1), i.ensure(e, t), Se(!0);
				return;
			}
		}
		i.ensure(e, t);
	}
	Cn(() => {
		var e = !1;
		t((t, n = 0) => {
			e = !0, o(n, t);
		}), e || o(-1, null);
	}, a);
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/blocks/each.js
function Nr(e, t) {
	return t;
}
function Pr(e, t, n) {
	for (var i = [], a = t.length, o, s = t.length, c = 0; c < a; c++) {
		let n = t[c];
		An(n, () => {
			if (o) {
				if (o.pending.delete(n), o.done.add(n), o.pending.size === 0) {
					var t = e.outrogroups;
					Fr(e, r(o.done)), t.delete(o), t.size === 0 && (e.outrogroups = null);
				}
			} else --s;
		}, !1);
	}
	if (s === 0) {
		var l = i.length === 0 && n !== null && e.pending.size === 0;
		if (l) {
			var u = n, d = u.parentNode;
			on(d), d.append(u), e.items.clear();
		}
		Fr(e, t, !l);
	} else o = {
		pending: new Set(t),
		done: /* @__PURE__ */ new Set()
	}, (e.outrogroups ??= /* @__PURE__ */ new Set()).add(o);
}
function Fr(e, t, n = !0) {
	var r;
	if (e.pending.size > 0) {
		r = /* @__PURE__ */ new Set();
		for (let t of e.pending.values()) for (let n of t) r.add(e.items.get(n).e);
	}
	for (var i = 0; i < t.length; i++) {
		var a = t[i];
		r?.has(a) ? (a.f |= ee, Pn(a, document.createDocumentFragment())) : H(t[i], n);
	}
}
var Ir;
function Lr(t, n, i, a, o, s = null) {
	var c = t, l = /* @__PURE__ */ new Map();
	if (n & 4) {
		var u = t;
		c = D ? k(/* @__PURE__ */ L(u)) : u.appendChild(nn());
	}
	D && Ce();
	var d = null, f = /* @__PURE__ */ ft(() => {
		var t = i();
		return e(t) ? t : t == null ? [] : r(t);
	}), p, m = /* @__PURE__ */ new Map(), h = !0;
	function g(e) {
		v.effect.f & 16384 || (v.pending.delete(e), v.fallback = d, zr(v, p, c, n, a), d !== null && (p.length === 0 ? d.f & 33554432 ? (d.f ^= ee, Vr(d, null, c)) : Mn(d) : An(d, () => {
			d = null;
		})));
	}
	function _(e) {
		v.pending.delete(e);
	}
	var v = {
		effect: Cn(() => {
			p = q(f);
			var e = p.length;
			let t = !1;
			D && Ee(c) === "[!" != (e === 0) && (c = Te(), k(c), Se(!1), t = !0);
			for (var r = /* @__PURE__ */ new Set(), u = P, v = sn(), y = 0; y < e; y += 1) {
				D && O.nodeType === 8 && O.data === "]" && (c = O, t = !0, Se(!1));
				var b = p[y], x = a(b, y), S = h ? null : l.get(x);
				S ? (S.v && Ut(S.v, b), S.i && Ut(S.i, y), v && u.unskip_effect(S.e)) : (S = Br(l, h ? c : Ir ??= nn(), b, x, y, o, n, i), h || (S.e.f |= ee), l.set(x, S)), r.add(x);
			}
			if (e === 0 && s && !d && (h ? d = wn(() => s(c)) : (d = wn(() => s(Ir ??= nn())), d.f |= ee)), e > r.size && Me("", "", ""), D && e > 0 && k(Te()), !h) {
				if (m.set(u, r), v) {
					for (let [e, t] of l) r.has(e) || u.skip_effect(t.e);
					u.oncommit(g), u.ondiscard(_);
				} else g(u);
			}
			t && Se(!0), q(f);
		}),
		flags: n,
		items: l,
		pending: m,
		outrogroups: null,
		fallback: d
	};
	h = !1, D && (c = O);
}
function Rr(e) {
	for (; e !== null && !(e.f & 32);) e = e.next;
	return e;
}
function zr(e, t, n, i, a) {
	var o = !!(i & 8), s = t.length, c = e.items, l = Rr(e.effect.first), u, d = null, f, p = [], m = [], h, g, _, v;
	if (o) for (v = 0; v < s; v += 1) h = t[v], g = a(h, v), _ = c.get(g).e, _.f & 33554432 || (_.nodes?.a?.measure(), (f ??= /* @__PURE__ */ new Set()).add(_));
	for (v = 0; v < s; v += 1) {
		if (h = t[v], g = a(h, v), _ = c.get(g).e, e.outrogroups !== null) for (let t of e.outrogroups) t.pending.delete(_), t.done.delete(_);
		if (_.f & 8192 && (Mn(_), o && (_.nodes?.a?.unfix(), (f ??= /* @__PURE__ */ new Set()).delete(_))), _.f & 33554432) {
			if (_.f ^= ee, _ === l) Vr(_, null, n);
			else {
				var y = d ? d.next : l;
				_ === e.effect.last && (e.effect.last = _.prev), _.prev && (_.prev.next = _.next), _.next && (_.next.prev = _.prev), Hr(e, d, _), Hr(e, _, y), Vr(_, y, n), d = _, p = [], m = [], l = Rr(d.next);
				continue;
			}
		}
		if (_ !== l) {
			if (u !== void 0 && u.has(_)) {
				if (p.length < m.length) {
					var b = m[0], x;
					d = b.prev;
					var S = p[0], C = p[p.length - 1];
					for (x = 0; x < p.length; x += 1) Vr(p[x], b, n);
					for (x = 0; x < m.length; x += 1) u.delete(m[x]);
					Hr(e, S.prev, C.next), Hr(e, d, S), Hr(e, C, b), l = b, d = C, --v, p = [], m = [];
				} else u.delete(_), Vr(_, l, n), Hr(e, _.prev, _.next), Hr(e, _, d === null ? e.effect.first : d.next), Hr(e, d, _), d = _;
				continue;
			}
			for (p = [], m = []; l !== null && l !== _;) (u ??= /* @__PURE__ */ new Set()).add(l), m.push(l), l = Rr(l.next);
			if (l === null) continue;
		}
		_.f & 33554432 || p.push(_), d = _, l = Rr(_.next);
	}
	if (e.outrogroups !== null) {
		for (let t of e.outrogroups) t.pending.size === 0 && (Fr(e, r(t.done)), e.outrogroups?.delete(t));
		e.outrogroups.size === 0 && (e.outrogroups = null);
	}
	if (l !== null || u !== void 0) {
		var w = [];
		if (u !== void 0) for (_ of u) _.f & 8192 || w.push(_);
		for (; l !== null;) !(l.f & 8192) && l !== e.fallback && w.push(l), l = Rr(l.next);
		var te = w.length;
		if (te > 0) {
			var ne = i & 4 && s === 0 ? n : null;
			if (o) {
				for (v = 0; v < te; v += 1) w[v].nodes?.a?.measure();
				for (v = 0; v < te; v += 1) w[v].nodes?.a?.fix();
			}
			Pr(e, w, ne);
		}
	}
	o && Ye(() => {
		if (f !== void 0) for (_ of f) _.nodes?.a?.apply();
	});
}
function Br(e, t, n, r, i, a, o, s) {
	var c = o & 1 ? o & 16 ? zt(n) : /* @__PURE__ */ Bt(n, !1, !1) : null, l = o & 2 ? zt(i) : null;
	return {
		v: c,
		i: l,
		e: wn(() => (a(t, c ?? n, l ?? i, s), () => {
			e.delete(r);
		}))
	};
}
function Vr(e, t, n) {
	if (e.nodes) for (var r = e.nodes.start, i = e.nodes.end, a = t && !(t.f & 33554432) ? t.nodes.start : n; r !== null;) {
		var o = /* @__PURE__ */ rn(r);
		if (a.before(r), r === i) return;
		r = o;
	}
}
function Hr(e, t, n) {
	t === null ? e.effect.first = n : t.next = n, n === null ? e.effect.last = t : n.prev = t;
}
function Ur(e, t, n = !1, r = !1, i = !1, a = !1) {
	var o = e, s = "";
	if (n) {
		var c = e;
		D && (o = k(/* @__PURE__ */ L(c)));
	}
	V(() => {
		var e = W;
		if (s === (s = t() ?? "")) {
			D && Ce();
			return;
		}
		if (n && !D) {
			e.nodes = null, c.innerHTML = s, s !== "" && Sr(/* @__PURE__ */ L(c), c.lastChild);
			return;
		}
		if (e.nodes !== null && (On(e.nodes.start, e.nodes.end), e.nodes = null), s !== "") {
			if (D) {
				for (var a = O.data, l = Ce(), u = l; l !== null && (l.nodeType !== 8 || l.data !== "");) u = l, l = /* @__PURE__ */ rn(l);
				if (l === null) throw ye(), me;
				Sr(O, u), o = k(l);
				return;
			}
			var d = cn(r ? "svg" : i ? "math" : "template", r ? ge : i ? _e : void 0);
			d.innerHTML = s;
			var f = r || i ? d : d.content;
			if (Sr(/* @__PURE__ */ L(f), f.lastChild), r || i) for (; /* @__PURE__ */ L(f);) o.before(/* @__PURE__ */ L(f));
			else o.before(f);
		}
	});
}
//#endregion
//#region node_modules/svelte/src/internal/shared/attributes.js
var Wr = [..." 	\n\r\f\xA0\v﻿"];
function Gr(e, t, n) {
	var r = e == null ? "" : "" + e;
	if (t && (r = r ? r + " " + t : t), n) {
		for (var i of Object.keys(n)) if (n[i]) r = r ? r + " " + i : i;
		else if (r.length) for (var a = i.length, o = 0; (o = r.indexOf(i, o)) >= 0;) {
			var s = o + a;
			(o === 0 || Wr.includes(r[o - 1])) && (s === r.length || Wr.includes(r[s])) ? r = (o === 0 ? "" : r.substring(0, o)) + r.substring(s + 1) : o = s;
		}
	}
	return r === "" ? null : r;
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/elements/class.js
function Kr(e, t, n, r, i, a) {
	var o = e[ce];
	if (D || o !== n || o === void 0) {
		var s = Gr(n, r, a);
		(!D || s !== e.getAttribute("class")) && (s == null ? e.removeAttribute("class") : t ? e.className = s : e.setAttribute("class", s)), e[ce] = n;
	} else if (a && i !== a) for (var c in a) {
		var l = !!a[c];
		(i == null || l !== !!i[c]) && e.classList.toggle(c, l);
	}
	return a;
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/elements/bindings/select.js
function qr(e, t) {
	t ? e.hasAttribute("selected") || e.setAttribute("selected", "") : e.removeAttribute("selected");
}
function Jr(t, n) {
	var r = t.__defaultValue, i = t.multiple, a = i ? r ?? [] : null;
	if (!i || e(a)) {
		var o = t.selectedIndex, s = n && i ? new Set(t.selectedOptions) : null;
		for (var c of t.options) {
			var l = Qr(c);
			qr(c, i ? a.includes(l) : Yt(l, r));
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
function Yr(t, n, r = !1) {
	if (t.multiple) {
		if (n == null) return;
		if (!e(n)) return be();
		for (var i of t.options) i.selected = n.includes(Qr(i));
		return;
	}
	for (i of t.options) if (Yt(Qr(i), n)) {
		i.selected = !0;
		return;
	}
	(!r || n !== void 0) && (t.selectedIndex = -1);
}
function Xr(e) {
	var t = new MutationObserver((t) => {
		t.every($r) || ("__defaultValue" in e && Jr(e, !1), "__value" in e && Yr(e, e.__value));
	});
	t.observe(e, {
		childList: !0,
		subtree: !0,
		attributes: !0,
		attributeFilter: ["value"]
	}), gn(() => {
		t.disconnect();
	});
}
function Zr(e, t, n = t) {
	var r = /* @__PURE__ */ new WeakSet(), i = !0;
	it(e, "change", (t) => {
		var i = t ? "[selected]" : ":checked", a;
		if (e.multiple) a = [].map.call(e.querySelectorAll(i), Qr);
		else {
			var o = e.querySelector(i) ?? e.querySelector("option:not([disabled])");
			a = o && Qr(o);
		}
		n(a), e.__value = a, P !== null && r.add(P);
	}), bn(() => {
		var a = t();
		if (e === document.activeElement) {
			var o = P;
			if (r.has(o)) return;
		}
		if (Yr(e, a, i), i && a === void 0) {
			var s = e.querySelector(":checked");
			s !== null && (a = Qr(s), n(a));
		}
		e.__value = a, i = !1;
	});
}
function Qr(e) {
	return "__value" in e ? e.__value : e.value;
}
function $r(e) {
	if (e.target.closest("selectedcontent") !== null) return !0;
	if (e.type === "childList") {
		var t = [...e.addedNodes, ...e.removedNodes];
		return t.length > 0 && t.every((e) => e.nodeName === "SELECTEDCONTENT");
	}
	return !1;
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/elements/attributes.js
var ei = Symbol("is custom element"), ti = Symbol("is html"), ni = pe ? "link" : "LINK";
function ri(e) {
	if (D) {
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
		e[de] = n, Ye(n), nt();
	}
}
function $(e, t, n, r) {
	var i = ii(e);
	D && (i[t] = e.getAttribute(t), t === "src" || t === "srcset" || t === "href" && e.nodeName === ni) || i[t] !== (i[t] = n) && (t === "loading" && (e[oe] = n), n == null ? e.removeAttribute(t) : typeof n != "string" && oi(e).has(t) ? e[t] = n : e.setAttribute(t, n));
}
function ii(e) {
	return e[se] ??= {
		[ei]: e.nodeName.includes("-"),
		[ti]: e.namespaceURI === he
	};
}
var ai = /* @__PURE__ */ new Map();
function oi(e) {
	var t = e.getAttribute("is") || e.nodeName, n = ai.get(t);
	if (n) return n;
	ai.set(t, n = /* @__PURE__ */ new Set());
	for (var r, i = e, a = Element.prototype; a !== i;) {
		for (var s in r = o(i), r) r[s].set && s !== "innerHTML" && s !== "textContent" && s !== "innerText" && n.add(s);
		i = l(i);
	}
	return n;
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/elements/bindings/input.js
function si(e, t, n = t) {
	var r = /* @__PURE__ */ new WeakSet();
	it(e, "input", async (i) => {
		var a = i ? e.defaultValue : e.value;
		if (a = ci(e) ? li(a) : a, n(a), P !== null && r.add(P), await ir(), a !== (a = t())) {
			var o = e.selectionStart, s = e.selectionEnd, c = e.value.length;
			if (e.value = a ?? "", s !== null) {
				var l = e.value.length;
				o === s && s === c && l > c ? (e.selectionStart = l, e.selectionEnd = l) : (e.selectionStart = o, e.selectionEnd = Math.min(s, l));
			}
		}
	}), (D && e.defaultValue !== e.value || sr(t) == null && e.value) && (n(ci(e) ? li(e.value) : e.value), P !== null && r.add(P)), Sn(() => {
		var n = t();
		if (e === document.activeElement) {
			var i = P;
			if (r.has(i)) return;
		}
		ci(e) && n === li(e.value) || (e.type !== "date" || n || e.value) && n !== e.value && (e.value = n ?? "");
	});
}
function ci(e) {
	var t = e.type;
	return t === "number" || t === "range";
}
function li(e) {
	return e === "" ? null : +e;
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/elements/bindings/this.js
function ui(e, t) {
	return e === t || e?.[T] === t;
}
function di(e = Ge(), t, n, r) {
	var i = j.r, a = W;
	return bn(() => {
		var o, s;
		return Sn(() => {
			o = s, s = r?.() || [], sr(() => {
				ui(n(...s), e) || (t(e, ...s), o && ui(n(...o), e) && t(null, ...o));
			});
		}), () => {
			let r = a;
			for (; r !== i && r.parent !== null && r.parent.f & 33554432;) r = r.parent;
			let o = () => {
				s && ui(n(...s), e) && t(null, ...s);
			}, c = r.teardown;
			r.teardown = () => {
				o(), c?.();
			};
		};
	}), e;
}
//#endregion
//#region node_modules/svelte/src/internal/client/reactivity/store.js
var fi = !1;
function pi(e) {
	var t = fi;
	try {
		return fi = !1, [e(), fi];
	} finally {
		fi = t;
	}
}
//#endregion
//#region node_modules/svelte/src/internal/client/reactivity/props.js
function mi(e, t, n, r) {
	var i = !0, o = !!(n & 8), s = !!(n & 16), c = r, l = !0, u = void 0, d = () => s && i ? (u ??= /* @__PURE__ */ lt(r), q(u)) : (l && (l = !1, c = s ? sr(r) : r), c);
	let f;
	if (o) {
		var p = T in e || ae in e;
		f = a(e, t)?.set ?? (p && t in e ? (n) => e[t] = n : void 0);
	}
	var m, h = !1;
	o ? [m, h] = pi(() => e[t]) : m = e[t], m === void 0 && r !== void 0 && (m = d(), f && (i && Le(t), f(m)));
	var g = i ? () => {
		var n = e[t];
		return n === void 0 ? d() : (l = !0, n);
	} : () => {
		var n = e[t];
		return n !== void 0 && (c = void 0), n === void 0 ? c : n;
	};
	if (i && !(n & 4)) return g;
	if (f) {
		var _ = e.$$legacy;
		return (function(e, t) {
			return arguments.length > 0 ? ((!i || !t || _ || h) && f(t ? g() : e), e) : g();
		});
	}
	var v = !1, y = (n & 1 ? lt : ft)(() => (v = !1, g()));
	o && q(y);
	var b = W;
	return (function(e, t) {
		if (arguments.length > 0) {
			let n = t ? q(y) : i && o ? qt(e) : e;
			return I(y, n), v = !0, c !== void 0 && (c = n), e;
		}
		return Ln && v || b.f & 16384 ? y.v : q(y);
	});
}
function hi(e) {
	j === null && Ae("onMount"), _n(() => {
		let t = sr(e);
		if (typeof t == "function") return t;
	});
}
//#endregion
//#region node_modules/svelte/src/internal/disclose-version.js
typeof window < "u" && ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add("5");
//#endregion
//#region src/api.ts
var gi = "review-token";
function _i() {
	let e = new URLSearchParams(location.hash.slice(1)).get("token");
	return e === null ? sessionStorage.getItem(gi) ?? "" : (sessionStorage.setItem(gi, e), history.replaceState(null, "", location.pathname), e);
}
var vi = _i();
async function yi(e, t, n) {
	let r = { Authorization: `Bearer ${vi}` }, i = {
		method: e,
		headers: r
	};
	n !== void 0 && (r["Content-Type"] = "application/json", i.body = JSON.stringify(n));
	let a = await fetch(t, i), o = await a.text();
	if (!a.ok) throw Error(bi(o) || `${a.status} ${a.statusText}`);
	return JSON.parse(o);
}
function bi(e) {
	try {
		return JSON.parse(e).error ?? e;
	} catch {
		return e;
	}
}
var xi = (e) => `/api/comments/${encodeURIComponent(e)}`, Si = {
	content: () => yi("GET", "/api/content"),
	refresh: () => yi("POST", "/api/refresh"),
	addComment: (e, t, n) => yi("POST", "/api/comments", {
		file_id: e,
		...t,
		body: n
	}),
	editComment: (e, t) => yi("PUT", xi(e), { body: t }),
	deleteComment: (e) => yi("DELETE", xi(e)),
	save: () => yi("POST", "/api/save")
}, Ci = /* @__PURE__ */ Y("<p class=\"hint\">Select a passage or click a line number to add the first comment.</p>"), wi = /* @__PURE__ */ Y("<article class=\"comment\"><button class=\"comment-target\"> </button> <blockquote> </blockquote> <p> </p> <button>Edit</button> <button>Delete</button></article>"), Ti = /* @__PURE__ */ Y("<p class=\"hint\">Last save: <code> </code></p>"), Ei = /* @__PURE__ */ Y("<aside aria-label=\"Comments\"><h2>Comments <span class=\"badge\"> </span></h2> <!> <!> <!></aside>");
function Di(e, t) {
	Ue(t, !0);
	var n = Ei(), r = R(n), i = z(B(R(r)), !0);
	A(r);
	var a = B(r, 2), o = (e) => {
		X(e, Ci());
	};
	Q(a, (e) => {
		t.comments.length === 0 && e(o);
	});
	var s = B(a, 2);
	Lr(s, 17, () => t.comments, (e) => e.id, (e, n) => {
		let r = /* @__PURE__ */ N(() => q(n).target);
		var i = wi(), a = R(i), o = z(a), s = B(a, 2), c = z(s, !0), l = B(s, 2), u = z(l, !0), d = B(l, 2), f = B(d, 2);
		A(i), V(() => {
			Z(o, `${q(r).path ?? ""} · ${q(r).side ?? ""} L${q(r).start_line ?? ""}–${q(r).end_line ?? ""}`), Z(c, q(r).quote || "(empty file)"), Z(u, q(n).body), d.disabled = t.busy, f.disabled = t.busy;
		}), J("click", a, () => t.onrevisit(q(n))), J("click", d, () => t.onedit(q(n))), J("click", f, () => t.ondelete(q(n))), X(e, i);
	});
	var c = B(s, 2), l = (e) => {
		var n = Ti(), r = z(B(R(n)), !0);
		A(n), V(() => Z(r, t.lastSaved)), X(e, n);
	};
	Q(c, (e) => {
		t.lastSaved && e(l);
	}), A(n), V(() => Z(i, t.comments.length)), X(e, n), We();
}
hr(["click"]);
//#endregion
//#region src/lines.ts
var Oi = new TextEncoder(), ki = new TextDecoder();
function Ai(e) {
	return Oi.encode(e).length;
}
function ji(e, t, n) {
	return ki.decode(Oi.encode(e).subarray(t, n));
}
function Mi(e) {
	let t = [], n = 0;
	for (let r of e.match(/[^\n]*\n|[^\n]+$/g) ?? [""]) {
		let e = n + Ai(r);
		t.push({
			number: t.length + 1,
			start: n,
			end: e,
			text: r.replace(/\n$/, "")
		}), n = e;
	}
	return t;
}
function Ni(e, t, n) {
	if (!Number.isInteger(t) || !Number.isInteger(n) || t < 1 || n < t || n > e.length) throw Error("Choose an existing line range");
	return {
		start_byte: e[t - 1].start,
		end_byte: e[n - 1].end
	};
}
function Pi(e, t, n) {
	let r = (t) => (t ?? e[e.length - 1]).number;
	return [r(e.find((e) => e.end > t)), r(e.find((e) => e.end >= n))];
}
function Fi(e, t) {
	let n = (e instanceof Element ? e : e.parentElement)?.closest("[data-start][data-snapshot]"), r = n?.dataset.snapshot;
	if (!n || r === void 0 || e !== n && e !== n.firstChild) return null;
	let i = n.textContent ?? "", a = e === n ? t === 0 ? 0 : i.length : t;
	return a > i.length ? null : {
		snapshot_id: r,
		byte: Number(n.dataset.start) + Ai(i.slice(0, a))
	};
}
//#endregion
//#region src/ContentView.svelte
var Ii = /* @__PURE__ */ Y("<p class=\"hint\">Preview is read-only. Use Source to select a precise comment target.</p> <article class=\"markdown\"></article>", 1), Li = /* @__PURE__ */ Y("<div><code class=\"revision-gutter\"> </code> <span> </span></div>"), Ri = /* @__PURE__ */ Y("<p> </p>"), zi = /* @__PURE__ */ Y("<p class=\"hint\">Disk revision is read-only. Existing comments remain on the original snapshot.</p> <!>", 1), Bi = /* @__PURE__ */ Y("<button> </button>"), Vi = /* @__PURE__ */ Y("<span></span>"), Hi = /* @__PURE__ */ Y("<span> </span>"), Ui = /* @__PURE__ */ Y("<div><div class=\"diff-gutter\"></div> <!></div>"), Wi = /* @__PURE__ */ Y("<p>No textual changes (empty files or mode-only change). Choose Source to comment.</p>"), Gi = /* @__PURE__ */ Y("<label class=\"hint\">Context target side <select><option>new</option><option>old</option></select></label> <!> <!>", 1), Ki = /* @__PURE__ */ Y("<div><button class=\"line-number\"> </button> <span> </span></div>"), qi = /* @__PURE__ */ Y("<div class=\"content\" role=\"region\" aria-label=\"Source content\"><!></div>");
function Ji(e, t) {
	Ue(t, !0);
	let n = mi(t, "contextSide", 15), r = /* @__PURE__ */ F(void 0), i = /* @__PURE__ */ N(() => new Map(t.file.snapshots.map((e) => [e.id, Mi(e.text)])));
	function a(e) {
		let r = e.kind === "delete" ? "old" : e.kind === "add" ? "new" : n();
		return t.file.snapshots.find((e) => e.side === r);
	}
	function o(e, t) {
		let n = t.side === "old" ? e.old_line : e.new_line;
		return n === null ? void 0 : q(i).get(t.id)?.[n - 1]?.start;
	}
	function s(e) {
		return t.highlight?.snapshotId === t.snapshot.id && e >= t.highlight.first && e <= t.highlight.last;
	}
	function c() {
		if (t.mode === "preview" || t.mode === "revisions") return;
		let e = document.getSelection(), { anchorNode: n, focusNode: i } = e ?? {};
		if (!e || e.isCollapsed || !n || !i || !q(r)?.contains(n)) return;
		let a = Fi(n, e.anchorOffset), o = Fi(i, e.focusOffset);
		!a || !o ? t.onselecterror("Select source text without the line-number controls, or use line ranges.") : a.snapshot_id === o.snapshot_id ? t.onselecttext({
			snapshot_id: a.snapshot_id,
			start_byte: Math.min(a.byte, o.byte),
			end_byte: Math.max(a.byte, o.byte)
		}) : t.onselecterror("Select one diff side, or switch to its full Source view.");
	}
	var l = qi();
	mr("selectionchange", Zt, c);
	var u = R(l), d = (e) => {
		var n = Ii(), r = B(an(n), 2);
		Ur(r, () => t.preview, !0), A(r), X(e, n);
	}, f = (e) => {
		var n = zi(), r = B(an(n), 2), i = (e) => {
			var n = Cr();
			Lr(an(n), 17, () => t.disk.diff, Nr, (e, t) => {
				var n = Li(), r = R(n), i = z(r), a = z(B(r, 2));
				A(n), V(() => {
					Kr(n, 1, `source-row ${q(t).kind ?? ""}`), Z(i, `${q(t).old_line ?? "" ?? ""} → ${q(t).new_line ?? "" ?? ""}`), Z(a, `${q(t).kind === "delete" ? "−" : q(t).kind === "add" ? "+" : " "} ${q(t).text ?? ""}`);
				}), X(e, n);
			}), X(e, n);
		}, a = (e) => {
			var n = Ri(), r = z(n, !0);
			V(() => Z(r, t.disk?.message)), X(e, n);
		};
		Q(r, (e) => {
			t.disk?.diff.length ? e(i) : e(a, -1);
		}), X(e, n);
	}, p = (e) => {
		var r = Gi(), i = an(r), s = B(R(i)), c = R(s);
		c.value = c.__value = "new";
		var l = B(c);
		l.value = l.__value = "old", A(s), Xr(s), A(i);
		var u = B(i, 2);
		Lr(u, 17, () => t.file.diff, Nr, (e, n) => {
			let r = /* @__PURE__ */ N(() => a(q(n))), i = /* @__PURE__ */ N(() => q(r) && o(q(n), q(r)));
			var s = Ui(), c = R(s);
			Lr(c, 21, () => t.file.snapshots, (e) => e.id, (e, r) => {
				let i = /* @__PURE__ */ N(() => q(r).side === "old" ? q(n).old_line : q(n).new_line);
				var a = Cr(), o = an(a), s = (e) => {
					var n = Bi(), a = z(n);
					V(() => {
						$(n, "aria-label", `Select ${q(r).side ?? ""} line ${q(i) ?? ""}`), Z(a, `${q(r).side === "old" ? "−" : "+"}${q(i) ?? ""}`);
					}), J("click", n, (e) => t.onselectline(q(r), q(i), e.shiftKey)), X(e, n);
				}, c = (e) => {
					X(e, Vi());
				};
				Q(o, (e) => {
					q(i) ? e(s) : e(c, -1);
				}), X(e, a);
			}), A(c);
			var l = B(c, 2), u = (e) => {
				var t = Hi(), a = z(t, !0);
				V(() => {
					$(t, "data-start", q(i)), $(t, "data-snapshot", q(r).id), Z(a, q(n).text);
				}), X(e, t);
			}, d = (e) => {
				var t = Hi(), r = z(t, !0);
				V(() => Z(r, q(n).text)), X(e, t);
			};
			Q(l, (e) => {
				q(r) && q(i) !== void 0 ? e(u) : e(d, -1);
			}), A(s), V(() => Kr(s, 1, `source-row ${q(n).kind ?? ""}`)), X(e, s);
		});
		var d = B(u, 2), f = (e) => {
			X(e, Wi());
		};
		Q(d, (e) => {
			t.file.diff.length === 0 && e(f);
		}), Zr(s, n), X(e, r);
	}, m = (e) => {
		var n = Cr();
		Lr(an(n), 17, () => t.lines, (e) => e.number, (e, n) => {
			var r = Ki();
			let i;
			var a = R(r), o = z(a, !0), c = B(a, 2), l = z(c, !0);
			A(r), V((e) => {
				$(r, "id", `line-${q(n).number ?? ""}`), i = Kr(r, 1, "source-row", null, i, { selected: e }), $(a, "aria-label", `Select line ${q(n).number ?? ""}`), Z(o, q(n).number), $(c, "data-start", q(n).start), $(c, "data-snapshot", t.snapshot.id), Z(l, q(n).text);
			}, [() => s(q(n).number)]), J("click", a, (e) => t.onselectline(t.snapshot, q(n).number, e.shiftKey)), X(e, r);
		}), X(e, n);
	};
	Q(u, (e) => {
		t.mode === "preview" ? e(d) : t.mode === "revisions" ? e(f, 1) : t.mode === "diff" && t.file.diff ? e(p, 2) : e(m, -1);
	}), A(l), di(l, (e) => I(r, e), () => q(r)), X(e, l), We();
}
hr(["click"]);
//#endregion
//#region src/App.svelte
var Yi = /* @__PURE__ */ Y("<span class=\"badge\">Unsaved</span>"), Xi = /* @__PURE__ */ Y("<span class=\"badge\">Saved</span>"), Zi = /* @__PURE__ */ Y("<div class=\"destination\">Feedback: <code> </code> <!></div> <button>Save feedback</button>", 1), Qi = /* @__PURE__ */ Y("<option> </option>"), $i = /* @__PURE__ */ Y("<button>Unified diff</button>"), ea = /* @__PURE__ */ Y("<button>Markdown preview</button>"), ta = /* @__PURE__ */ Y("<p> </p>"), na = /* @__PURE__ */ Y("<blockquote aria-label=\"Selected quote\"> </blockquote>"), ra = /* @__PURE__ */ Y("<nav aria-label=\"Review controls\"><label>File <select aria-label=\"File\"></select></label> <label>Side <select></select></label> <button>Source</button> <!> <!> <button>Inspect revisions</button></nav> <!> <main><section aria-label=\"Reviewed content\"><!> <form><div class=\"range\"><label>Start line <input type=\"number\" min=\"1\"/></label> <label>End line <input type=\"number\" min=\"1\"/></label> <button type=\"button\">Select lines</button></div> <!> <label for=\"comment\"> </label> <textarea id=\"comment\" rows=\"4\" placeholder=\"Explain what should change…\" maxlength=\"32768\"></textarea> <button> </button> <button type=\"button\">Cancel draft</button> <small>Ctrl+S in the comment records it. Save feedback writes JSON. [ and ] switch files.</small></form></section> <!></main>", 1), ia = /* @__PURE__ */ Y("<p class=\"loading\"> </p>"), aa = /* @__PURE__ */ Y("<header><h1>Review</h1> <!></header> <div class=\"status\" role=\"status\" aria-live=\"polite\"> </div> <!>", 1);
function oa(e, t) {
	Ue(t, !0);
	let n = /* @__PURE__ */ F(null), r = /* @__PURE__ */ F(null), i = /* @__PURE__ */ F(0), a = /* @__PURE__ */ F(""), o = /* @__PURE__ */ F("source"), s = /* @__PURE__ */ F("new"), c = /* @__PURE__ */ F(null), l = /* @__PURE__ */ F(1), u = /* @__PURE__ */ F(1), d = /* @__PURE__ */ F(""), f = /* @__PURE__ */ F(null), p = /* @__PURE__ */ F(""), h = /* @__PURE__ */ F(!1), g = /* @__PURE__ */ F(void 0), _ = 0, v = /* @__PURE__ */ N(() => q(n)?.files[q(i)]), y = /* @__PURE__ */ N(() => q(v)?.snapshots.find((e) => e.id === q(a)) ?? q(v)?.snapshots.at(-1)), b = /* @__PURE__ */ N(() => Mi(q(y)?.text ?? "")), x = /* @__PURE__ */ N(() => q(r)?.disk.find((e) => e.file_id === q(v)?.id)), S = /* @__PURE__ */ N(() => q(n)?.previews.find((e) => e.snapshot_id === q(y)?.id)?.html), C = /* @__PURE__ */ N(() => q(o) === "preview" || q(o) === "revisions"), w = /* @__PURE__ */ N(() => q(d) !== "" || q(f) !== null), ee = /* @__PURE__ */ N(() => q(c) && {
		snapshotId: q(c).snapshot_id,
		first: q(l),
		last: q(u)
	}), te = /* @__PURE__ */ N(() => {
		let e = q(c), t = e && q(v)?.snapshots.find((t) => t.id === e.snapshot_id);
		return e && t ? ji(t.text, e.start_byte, e.end_byte) : "";
	});
	function ne(e) {
		return e instanceof Error ? e.message : String(e);
	}
	async function re() {
		try {
			I(n, await Si.content(), !0), se(0);
		} catch (e) {
			I(p, ne(e), !0);
		}
	}
	async function T() {
		let e = ++_;
		try {
			let t = await Si.refresh();
			e === _ && I(r, t, !0);
		} catch (e) {
			I(p, ne(e), !0);
		}
	}
	async function ie(e) {
		I(h, !0);
		let t = ++_;
		try {
			let n = await e();
			return t === _ && I(r, n, !0), !0;
		} catch (e) {
			return await T(), I(p, ne(e), !0), !1;
		} finally {
			I(h, !1);
		}
	}
	function ae() {
		return !q(w) || confirm("Discard this unrecorded comment draft?");
	}
	function oe() {
		I(d, ""), I(f, null);
	}
	function se(e) {
		if (!q(n)) return;
		let t = q(n).files[e];
		I(i, e, !0), I(a, t.snapshots[t.snapshots.length - 1].id, !0), I(o, t.diff ? "diff" : "source", !0), me(), oe();
	}
	function ce(e) {
		ae() && se(e);
	}
	function le(e, t, n) {
		if (q(f)) {
			I(p, "Finish or cancel editing before choosing another target.");
			return;
		}
		n && q(c)?.snapshot_id === e.id ? (I(l, Math.min(q(l), t), !0), I(u, Math.max(q(u), t), !0)) : I(l, I(u, t, !0), !0), I(a, e.id, !0), I(c, {
			snapshot_id: e.id,
			...Ni(Mi(e.text), q(l), q(u))
		}, !0), I(p, `${e.side} lines ${q(l)}–${q(u)} selected`);
	}
	function ue() {
		if (q(y) && !q(f)) try {
			I(c, {
				snapshot_id: q(y).id,
				...Ni(q(b), q(l), q(u))
			}, !0), I(p, "");
		} catch (e) {
			I(c, null), I(p, ne(e), !0);
		}
	}
	function de(e) {
		let t = q(v)?.snapshots.find((t) => t.id === e.snapshot_id);
		q(f) || q(C) || !t || (I(a, t.id, !0), I(c, e, !0), ((e) => {
			var t = m(e, 2);
			I(l, t[0], !0), I(u, t[1], !0);
		})(Pi(Mi(t.text), e.start_byte, e.end_byte)), I(p, "Passage selected. Write a comment below."));
	}
	function fe(e) {
		q(f) || q(C) || (I(c, null), I(p, e, !0));
	}
	async function pe() {
		if (q(C) || !q(v) || !q(d).trim()) return;
		let [e, t, n, r] = [
			q(v).id,
			q(f),
			q(c),
			q(d)
		], i;
		if (t) i = () => Si.editComment(t, r);
		else if (n) i = () => Si.addComment(e, n, r);
		else return;
		await ie(i) && (oe(), I(p, "Comment recorded. Save feedback to write it to disk."));
	}
	function me() {
		I(c, null), I(l, I(u, 1), !0);
	}
	function E() {
		oe(), I(c, null);
	}
	function he(e, t) {
		if (!q(n) || !ae()) return;
		let r = e.target;
		I(i, q(n).files.findIndex((e) => e.id === r.file_id), !0), I(a, r.snapshot_id, !0), I(o, "source"), I(c, {
			snapshot_id: r.snapshot_id,
			start_byte: r.start_byte,
			end_byte: r.end_byte
		}, !0), I(l, r.start_line, !0), I(u, r.end_line, !0), I(f, t ? e.id : null, !0), I(d, t ? e.body : "", !0), I(p, `Original ${r.side} lines ${q(l)}–${q(u)}`), ir().then(() => {
			document.getElementById(`line-${q(l)}`)?.scrollIntoView({ block: "center" }), t && q(g)?.focus();
		});
	}
	async function ge(e) {
		confirm("Delete this comment?") && await ie(() => Si.deleteComment(e.id)) && (q(f) === e.id && oe(), I(p, "Comment deleted. Save to write feedback."));
	}
	async function _e() {
		if (q(w)) {
			I(p, "Record or cancel the comment draft before saving feedback."), q(g)?.focus();
			return;
		}
		await ie(Si.save) && I(p, `Saved ${q(r)?.last_saved}`);
	}
	async function ve() {
		await T(), I(o, q(o) === "revisions" ? "source" : "revisions", !0);
	}
	function ye(e) {
		if (e.ctrlKey && e.key === "s") {
			e.preventDefault(), !q(h) && q(r) && (e.target === q(g) ? pe() : _e());
			return;
		}
		let t = e.target;
		if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || e.ctrlKey || e.metaKey || e.altKey || !q(n)) return;
		let a = q(n).files.length;
		e.key === "c" ? (e.preventDefault(), q(g)?.focus()) : e.key === "]" ? ce((q(i) + 1) % a) : e.key === "[" && ce((q(i) + a - 1) % a);
	}
	function be(e) {
		(q(r)?.dirty || q(w)) && e.preventDefault();
	}
	hi(() => {
		re(), T();
		let e = setInterval(() => {
			q(h) || T();
		}, 2500);
		return () => clearInterval(e);
	});
	var xe = aa();
	mr("keydown", Xt, ye), mr("beforeunload", Xt, be);
	var D = an(xe), Se = B(R(D), 2), O = (e) => {
		var t = Zi(), n = an(t), i = B(R(n)), a = z(i, !0), o = B(i, 2), s = (e) => {
			X(e, Yi());
		}, c = (e) => {
			X(e, Xi());
		};
		Q(o, (e) => {
			q(r).dirty ? e(s) : q(r).last_saved && e(c, 1);
		}), A(n);
		var l = B(n, 2);
		V(() => {
			Z(a, q(r).output), l.disabled = q(h);
		}), J("click", l, _e), X(e, t);
	};
	Q(Se, (e) => {
		q(r) && e(O);
	}), A(D);
	var k = B(D, 2), Ce = z(k, !0), Te = B(k, 2), Ee = (e) => {
		var t = ra(), p = an(t), m = R(p), _ = B(R(m));
		Lr(_, 23, () => q(n).files, (e) => e.id, (e, t, n) => {
			var r = Qi(), i = z(r, !0), a = {};
			V(() => {
				Z(i, q(t).path), a !== (a = q(n)) && (r.value = (r.__value = a) ?? "");
			}), X(e, r);
		}), A(_);
		var w;
		Xr(_), A(m);
		var ne = B(m, 2), re = B(R(ne));
		Lr(re, 21, () => q(v).snapshots, (e) => e.id, (e, t) => {
			var n = Qi(), r = z(n), i = {};
			V((e) => {
				Z(r, `${q(t).side ?? ""} · ${e ?? ""}`), i !== (i = q(t).id) && (n.value = (n.__value = i) ?? "");
			}, [() => q(t).revision.slice(0, 16)]), X(e, n);
		}), A(re), Xr(re), A(ne);
		var T = B(ne, 2), ie = B(T, 2), ae = (e) => {
			var t = $i();
			V(() => $(t, "aria-pressed", q(o) === "diff")), J("click", t, () => I(o, "diff")), X(e, t);
		};
		Q(ie, (e) => {
			q(v).diff && e(ae);
		});
		var oe = B(ie, 2), se = (e) => {
			var t = ea();
			V(() => $(t, "aria-pressed", q(o) === "preview")), J("click", t, () => I(o, "preview")), X(e, t);
		};
		Q(oe, (e) => {
			q(S) !== void 0 && e(se);
		});
		var _e = B(oe, 2);
		A(p);
		var ye = B(p, 2), be = (e) => {
			var t = ta();
			let n;
			var r = z(t);
			V(() => {
				n = Kr(t, 1, "revision-status", null, n, { changed: q(x).status !== "unchanged" }), Z(r, `${q(x).status ?? ""}: ${q(x).message ?? ""}`);
			}), X(e, t);
		};
		Q(ye, (e) => {
			q(x) && e(be);
		});
		var xe = B(ye, 2), D = R(xe), Se = R(D);
		{
			let e = /* @__PURE__ */ N(() => q(S) ?? "");
			Ji(Se, {
				get file() {
					return q(v);
				},
				get snapshot() {
					return q(y);
				},
				get lines() {
					return q(b);
				},
				get mode() {
					return q(o);
				},
				get disk() {
					return q(x);
				},
				get preview() {
					return q(e);
				},
				get highlight() {
					return q(ee);
				},
				onselectline: le,
				onselecttext: de,
				onselecterror: fe,
				get contextSide() {
					return q(s);
				},
				set contextSide(e) {
					I(s, e, !0);
				}
			});
		}
		var O = B(Se, 2), k = R(O), Ce = R(k), Te = B(R(Ce));
		ri(Te), A(Ce);
		var Ee = B(Ce, 2), De = B(R(Ee));
		ri(De), A(Ee);
		var Oe = B(Ee, 2);
		A(k);
		var ke = B(k, 2), Ae = (e) => {
			var t = na(), n = z(t, !0);
			V(() => Z(n, q(te) || "(empty file)")), X(e, t);
		};
		Q(ke, (e) => {
			q(c) && e(Ae);
		});
		var je = B(ke, 2), Me = z(je, !0), Ne = B(je, 2);
		et(Ne), di(Ne, (e) => I(g, e), () => q(g));
		var Pe = B(Ne, 2), Fe = z(Pe, !0), Ie = B(Pe, 2);
		we(2), A(O), A(D), Di(B(D, 2), {
			get comments() {
				return q(r).comments;
			},
			get busy() {
				return q(h);
			},
			get lastSaved() {
				return q(r).last_saved;
			},
			onrevisit: (e) => he(e, !1),
			onedit: (e) => he(e, !0),
			ondelete: ge
		}), A(xe), V((e) => {
			w !== (w = q(i)) && (_.value = (_.__value = w) ?? "", Yr(_, w)), re.disabled = q(f) !== null, $(T, "aria-pressed", q(o) === "source"), $(_e, "aria-pressed", q(o) === "revisions"), $(Te, "max", q(b).length), Te.disabled = q(f) !== null || q(C), $(De, "max", q(b).length), De.disabled = q(f) !== null || q(C), Oe.disabled = q(f) !== null || q(C), Z(Me, q(f) ? "Edit comment" : "Comment"), Ne.disabled = q(h) || q(C), Pe.disabled = e, Z(Fe, q(f) ? "Update comment" : "Add comment"), Ie.disabled = q(h);
		}, [() => q(h) || q(C) || !q(d).trim() || !q(c) && !q(f)]), J("change", _, (e) => {
			ce(Number(e.currentTarget.value)), e.currentTarget.value = String(q(i));
		}), J("change", re, me), Zr(re, () => q(a), (e) => I(a, e)), J("click", T, () => I(o, "source")), J("click", _e, ve), mr("submit", O, (e) => {
			e.preventDefault(), pe();
		}), J("change", Te, ue), si(Te, () => q(l), (e) => I(l, e)), J("change", De, ue), si(De, () => q(u), (e) => I(u, e)), J("click", Oe, ue), si(Ne, () => q(d), (e) => I(d, e)), J("click", Ie, E), X(e, t);
	}, De = (e) => {
		var t = ia(), n = z(t, !0);
		V(() => Z(n, q(p) || "Loading the local review session…")), X(e, t);
	};
	Q(Te, (e) => {
		q(r) && q(n) && q(v) && q(y) ? e(Ee) : e(De, -1);
	}), V(() => Z(Ce, q(p) || "Select source text or line numbers, write a comment, then save feedback.")), X(e, xe), We();
}
hr(["click", "change"]);
//#endregion
//#region src/main.ts
var sa = document.getElementById("app");
if (!sa) throw Error("The page has no #app element");
Or(oa, { target: sa });
//#endregion

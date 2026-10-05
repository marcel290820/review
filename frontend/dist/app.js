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
var m = 1024, h = 2048, g = 4096, _ = 8192, v = 16384, y = 32768, b = 1 << 25, x = 65536, S = 1 << 19, ee = 1 << 20, te = 1 << 25, ne = 1 << 21, C = 1 << 22, re = 1 << 23, w = Symbol("$state"), ie = Symbol("component"), ae = Symbol(""), oe = Symbol("attributes"), se = Symbol("class"), ce = Symbol("style"), le = Symbol("text"), ue = Symbol("form reset"), de = new class extends Error {
	name = "StaleReactionError";
	message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
}(), fe = !!globalThis.document?.contentType && /* @__PURE__ */ globalThis.document.contentType.includes("xml"), pe = {}, T = Symbol("uninitialized"), me = "http://www.w3.org/1999/xhtml", he = "http://www.w3.org/2000/svg", ge = "http://www.w3.org/1998/Math/MathML";
function _e() {
	console.warn("https://svelte.dev/e/derived_inert");
}
function ve(e) {
	console.warn("https://svelte.dev/e/hydration_mismatch");
}
function ye() {
	console.warn("https://svelte.dev/e/select_multiple_invalid_value");
}
function be() {
	console.warn("https://svelte.dev/e/svelte_boundary_reset_noop");
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/hydration.js
var E = !1;
function xe(e) {
	E = e;
}
var D;
function O(e) {
	if (e === null) throw ve(), pe;
	return D = e;
}
function Se() {
	return O(/* @__PURE__ */ en(D));
}
function k(e) {
	if (E) {
		if (/* @__PURE__ */ en(D) !== null) throw ve(), pe;
		D = e;
	}
}
function Ce(e = 1) {
	if (E) {
		for (var t = e, n = D; t--;) n = /* @__PURE__ */ en(n);
		D = n;
	}
}
function we(e = !0) {
	for (var t = 0, n = D;;) {
		if (n.nodeType === 8) {
			var r = n.data;
			if (r === "]") {
				if (t === 0) return n;
				--t;
			} else (r === "[" || r === "[!" || r[0] === "[" && !isNaN(Number(r.slice(1)))) && (t += 1);
		}
		var i = /* @__PURE__ */ en(n);
		e && n.remove(), n = i;
	}
}
function Te(e) {
	if (!e || e.nodeType !== 8) throw ve(), pe;
	return e.data;
}
//#endregion
//#region node_modules/svelte/src/internal/client/reactivity/equality.js
function Ee(e) {
	return e === this.v;
}
function De(e, t) {
	return e == e ? e !== t || typeof e == "object" && !!e || typeof e == "function" : t == t;
}
function Oe(e) {
	return !De(e, this.v);
}
function ke(e) {
	throw Error("https://svelte.dev/e/lifecycle_outside_component");
}
//#endregion
//#region node_modules/svelte/src/internal/client/errors.js
function Ae() {
	throw Error("https://svelte.dev/e/async_derived_orphan");
}
function je(e, t, n) {
	throw Error("https://svelte.dev/e/each_key_duplicate");
}
function Me(e) {
	throw Error("https://svelte.dev/e/effect_in_teardown");
}
function Ne() {
	throw Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function Pe(e) {
	throw Error("https://svelte.dev/e/effect_orphan");
}
function Fe() {
	throw Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function Ie() {
	throw Error("https://svelte.dev/e/state_descriptors_fixed");
}
function Le() {
	throw Error("https://svelte.dev/e/state_prototype_fixed");
}
function Re() {
	throw Error("https://svelte.dev/e/state_unsafe_mutation");
}
function ze() {
	throw Error("https://svelte.dev/e/svelte_boundary_reset_onerror");
}
//#endregion
//#region node_modules/svelte/src/internal/client/context.js
var A = null;
function Be(e) {
	A = e;
}
function Ve(e, t = !1, n) {
	A = {
		p: A,
		i: !1,
		c: null,
		e: null,
		s: e,
		x: null,
		r: W,
		l: null
	};
}
function He(e) {
	var t = A, n = t.e;
	if (n !== null) {
		t.e = null;
		for (var r of n) hn(r);
	}
	return e !== void 0 && (t.x = e), t.i = !0, A = t.p, Ue(e);
}
function Ue(e = {}) {
	return i(e, ie, { value: !0 }), e;
}
function We() {
	return !0;
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/task.js
var Ge = [];
function Ke() {
	var e = Ge;
	Ge = [], f(e);
}
function qe(e) {
	if (Ge.length === 0 && !xt) {
		var t = Ge;
		queueMicrotask(() => {
			t === Ge && Ke();
		});
	}
	Ge.push(e);
}
function Je() {
	for (; Ge.length > 0;) Ke();
}
//#endregion
//#region node_modules/svelte/src/internal/client/reactivity/status.js
var Ye = ~(h | g | m);
function j(e, t) {
	e.f = e.f & Ye | t;
}
function Xe(e) {
	e.f & 512 || e.deps === null ? j(e, m) : j(e, g);
}
//#endregion
//#region node_modules/svelte/src/internal/client/reactivity/utils.js
function Ze(e, t, n) {
	e.f & 2048 ? t.add(e) : e.f & 4096 && n.add(e), j(e, m);
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/elements/misc.js
function Qe(e) {
	E && /* @__PURE__ */ I(e) !== null && nn(e);
}
var $e = !1;
function et() {
	$e || ($e = !0, document.addEventListener("reset", (e) => {
		Promise.resolve().then(() => {
			if (!e.defaultPrevented) for (let t of e.target.elements) t[ue]?.();
		});
	}, { capture: !0 }));
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/elements/bindings/shared.js
function tt(e) {
	var t = U, n = W;
	In(null), Ln(null);
	try {
		return e();
	} finally {
		In(t), Ln(n);
	}
}
function nt(e, t, n, r = n) {
	e.addEventListener(t, () => tt(n));
	let i = e[ue];
	e[ue] = i ? () => {
		i(), r(!0);
	} : () => r(!0), et();
}
//#endregion
//#region node_modules/svelte/src/internal/client/reactivity/async.js
function rt(e, t, n, r) {
	let i = We() ? st : dt;
	var a = e.filter((e) => !e.settled), o = t.map(i);
	if (n.length === 0 && a.length === 0) {
		r(o);
		return;
	}
	var s = W, c = it(), l = a.length === 1 ? a[0].promise : a.length > 1 ? Promise.all(a.map((e) => e.promise)) : null;
	function u(e) {
		if (!(s.f & 16384)) {
			c();
			try {
				r([...o, ...e]);
			} catch (e) {
				cn(e, s);
			}
			at();
		}
	}
	var d = ot();
	if (n.length === 0) {
		l.then(() => u([])).finally(d);
		return;
	}
	function f() {
		Promise.all(n.map((e) => /* @__PURE__ */ lt(e))).then(u).catch((e) => cn(e, s)).finally(d);
	}
	l ? l.then(() => {
		c(), f(), at();
	}) : f();
}
function it() {
	var e = W, t = U, n = A, r = M;
	return function(i = !0) {
		Ln(e), In(t), Be(n), i && !(e.f & 16384) && (r?.activate(), r?.apply());
	};
}
function at(e = !0) {
	Ln(null), In(null), Be(null), e && M?.deactivate();
}
function ot() {
	var e = W, t = e.b, n = M, r = !!t?.is_rendered();
	return t?.update_pending_count(1, n), n.increment(r, e), () => {
		t?.update_pending_count(-1, n), n.decrement(r, e);
	};
}
/*#__NO_SIDE_EFFECTS__*/
function st(e) {
	var t = 2 | h;
	return W !== null && (W.f |= S), {
		ctx: A,
		deps: null,
		effects: null,
		equals: Ee,
		f: t,
		fn: e,
		reactions: null,
		rv: 0,
		v: T,
		wv: 0,
		parent: W,
		ac: null
	};
}
var ct = Symbol("obsolete");
/*#__NO_SIDE_EFFECTS__*/
function lt(e, t, n) {
	let r = W;
	r === null && Ae();
	var i = void 0, a = Rt(T), o = !U, s = /* @__PURE__ */ new Set();
	return vn(() => {
		var t = W, n = p();
		i = n.promise;
		try {
			Promise.resolve(e()).then(n.resolve, (e) => {
				e !== de && n.reject(e);
			}).finally(at);
		} catch (e) {
			n.reject(e), at();
		}
		var c = M;
		if (o) {
			if (t.f & 32768) var l = ot();
			if (r.b?.is_rendered()) c.async_deriveds.get(t)?.reject(ct);
			else for (let e of s.values()) e.reject(ct);
			s.add(n), c.async_deriveds.set(t, n);
		}
		let u = (e, t = void 0) => {
			l?.(), s.delete(n), t !== ct && (c.activate(), t ? (a.f |= re, Ht(a, t)) : (a.f & 8388608 && (a.f ^= re), Ht(a, e)), c.deactivate());
		};
		n.promise.then(u, (e) => u(null, e || "unknown"));
	}), pn(() => {
		for (let e of s) e.reject(ct);
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
function ut(e) {
	let t = /* @__PURE__ */ st(e);
	return zn(t), t;
}
/*#__NO_SIDE_EFFECTS__*/
function dt(e) {
	let t = /* @__PURE__ */ st(e);
	return t.equals = Oe, t;
}
function ft(e) {
	var t = e.effects;
	if (t !== null) {
		e.effects = null;
		for (var n = 0; n < t.length; n += 1) H(t[n]);
	}
}
function pt(e) {
	var t, n = W, r = e.parent;
	if (!Nn && r !== null && e.v !== T && r.f & 24576) return _e(), e.v;
	Ln(r);
	try {
		ft(e), t = Yn(e);
	} finally {
		Ln(n);
	}
	return t;
}
function mt(e) {
	var t = pt(e);
	if (!e.equals(t) && (e.wv = Kn(), (!M?.is_fork || e.deps === null) && (M === null ? e.v = t : (M.capture(e, t, !0), vt?.capture(e, t, !0)), e.deps === null))) {
		j(e, m);
		return;
	}
	Nn || (yt === null ? Xe(e) : (fn() || M?.is_fork) && yt.set(e, t));
}
function ht(e) {
	if (e.effects !== null) for (let t of e.effects) (t.teardown || t.ac) && (t.teardown?.(), t.ac !== null && tt(() => {
		t.ac.abort(de), t.ac = null;
	}), t.fn !== null && (t.teardown = d), Qn(t, 0), Sn(t));
}
function gt(e) {
	if (e.effects !== null) for (let t of e.effects) t.teardown && t.fn !== null && $n(t);
}
//#endregion
//#region node_modules/svelte/src/internal/client/reactivity/batch.js
var _t = null, M = null, vt = null, yt = null, bt = null, xt = !1, St = !1, Ct = null, wt = null, Tt = 0, Et = 1, Dt = class e {
	id = Et++;
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
		_t === null ? _t = this : (_t.#n = this, this.#t = _t), _t = this;
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
			for (var r of n.d) j(r, h), t(r);
			for (r of n.m) j(r, g), t(r);
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
		for (let e of this.#u) this.#d.delete(e), j(e, h), this.schedule(e);
		for (let e of this.#d) j(e, g), this.schedule(e);
		this.apply();
		for (var t = Ct = [], n = [], r = wt = []; this.#c.length > 0;) {
			Tt++ > 1e3 && (this.#S(), kt());
			for (let e of this.#g()) try {
				this.#v(e, t, n);
			} catch (t) {
				throw Pt(e), this.#h() || this.discard(), t;
			}
		}
		if (M = null, r.length > 0) {
			var i = e.ensure();
			for (let e of r) i.schedule(e);
		}
		if (Ct = null, wt = null, this.#h()) {
			this.#x(n), this.#x(t);
			for (let [e, t] of this.#f) Nt(e, t);
			r.length > 0 && M.#_();
			return;
		}
		let a = this.#y();
		if (a) {
			this.#x(n), this.#x(t), a.#b(this);
			return;
		}
		this.#u.clear(), this.#d.clear();
		for (let e of this.#r) e(this);
		this.#r.clear(), vt = this, jt(n), jt(t), vt = null, this.#s?.resolve();
		var o = M;
		if (this.#a === 0 && (this.#c.length === 0 || o !== null) && this.#S(), this.#c.length > 0) {
			if (o !== null) {
				for (let e of this.#c) o.#c.push(e);
				this.#c = [];
			} else o = this;
		}
		o !== null && (It.clear(), o.#_());
	}
	#v(e, t, n) {
		e.f ^= m;
		for (var r = e.first; r !== null;) {
			var i = r.f, a = !!(i & 96);
			if (!(a && i & 1024 || i & 8192 || this.#f.has(r)) && r.fn !== null) {
				a ? r.f ^= m : i & 4 ? t.push(r) : qn(r) && (i & 16 && this.#d.add(r), $n(r));
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
					r & 4194320 && !this.async_deriveds.has(i) && (this.#d.delete(i), j(i, h), this.schedule(i));
				}
			}
		};
		for (let e of this.current.keys()) t(e);
		this.oncommit(() => e.discard()), e.#S(), M = this, this.#_();
	}
	#x(e) {
		for (var t = 0; t < e.length; t += 1) Ze(e[t], this.#u, this.#d);
	}
	capture(e, t, n = !1) {
		e.v !== T && !this.previous.has(e) && this.previous.set(e, e.v), e.f & 8388608 || (this.current.set(e, [t, n]), yt?.set(e, t)), this.is_fork || (e.v = t);
	}
	activate() {
		M = this;
	}
	deactivate() {
		M = null, yt = null;
	}
	flush() {
		try {
			St = !0, M = this, this.#_();
		} finally {
			Tt = 0, bt = null, Ct = null, wt = null, St = !1, M = null, yt = null, It.clear();
		}
	}
	discard() {
		for (let e of this.#i) e(this);
		this.#i.clear();
		for (let e of this.async_deriveds.values()) e.reject(ct);
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
		this.#m || (this.#m = !0, qe(() => {
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
		if (M === null) {
			let t = M = new e();
			!St && !xt && qe(() => {
				t.#e || t.flush();
			});
		}
		return M;
	}
	apply() {
		yt = null;
	}
	schedule(e) {
		if (bt = e, e.b?.is_pending && e.f & 16777228 && !(e.f & 32768)) {
			e.b.defer_effect(e);
			return;
		}
		this.#c.push(e);
	}
	#S() {
		if (this.linked) {
			var e = this.#t, t = this.#n;
			e === null || (e.#n = t), t === null ? _t = e : t.#t = e, this.linked = !1;
		}
	}
};
function Ot(e) {
	var t = xt;
	xt = !0;
	try {
		var n;
		for (e && (M !== null && !M.is_fork && M.flush(), n = e());;) {
			if (Je(), M === null) return n;
			M.flush();
		}
	} finally {
		xt = t;
	}
}
function kt() {
	try {
		Fe();
	} catch (e) {
		cn(e, bt);
	}
}
var At = null;
function jt(e) {
	var t = e.length;
	if (t !== 0) {
		for (var n = 0; n < t;) {
			var r = e[n++];
			if (!(r.f & 24576) && qn(r) && (At = /* @__PURE__ */ new Set(), $n(r), r.deps === null && r.first === null && r.nodes === null && r.teardown === null && r.ac === null && Tn(r), At?.size > 0)) {
				It.clear();
				for (let e of At) {
					if (e.f & 24576) continue;
					let t = [e], n = e.parent;
					for (; n !== null;) At.has(n) && (At.delete(n), t.push(n)), n = n.parent;
					for (let e = t.length - 1; e >= 0; e--) {
						let n = t[e];
						n.f & 24576 || $n(n);
					}
				}
				At.clear();
			}
		}
		At = null;
	}
}
function Mt(e) {
	M.schedule(e);
}
function Nt(e, t) {
	if (!(e.f & 32 && e.f & 1024)) {
		e.f & 2048 ? t.d.push(e) : e.f & 4096 && t.m.push(e), j(e, m);
		for (var n = e.first; n !== null;) Nt(n, t), n = n.next;
	}
}
function Pt(e) {
	j(e, m);
	for (var t = e.first; t !== null;) Pt(t), t = t.next;
}
//#endregion
//#region node_modules/svelte/src/internal/client/reactivity/sources.js
var Ft = /* @__PURE__ */ new Set(), It = /* @__PURE__ */ new Map(), Lt = !1;
function Rt(e, t) {
	return {
		f: 0,
		v: e,
		reactions: null,
		equals: Ee,
		rv: 0,
		wv: 0
	};
}
/*#__NO_SIDE_EFFECTS__*/
function N(e, t) {
	let n = Rt(e, t);
	return zn(n), n;
}
/*#__NO_SIDE_EFFECTS__*/
function zt(e, t = !1, n = !0) {
	let r = Rt(e);
	return t || (r.equals = Oe), r;
}
function P(e, t, n = !1) {
	return U !== null && (!Fn || U.f & 131072) && We() && U.f & 4325394 && (Rn === null || !Rn.has(e)) && Re(), Ht(e, n ? Kt(t) : t, wt);
}
var Bt = null, Vt = 0;
function Ht(e, t, n = null) {
	if (!e.equals(t)) {
		Nn ? It.set(e, t) : It.has(e) || It.set(e, e.v);
		var r = Dt.ensure();
		if (r.capture(e, t), e.f & 2) {
			let t = e;
			e.f & 2048 && pt(t), yt === null && Xe(t);
		}
		e.wv = Kn(), Bt = null, Vt = 0, Gt(e, h, n), Bt = null, We() && W !== null && W.f & 1024 && !(W.f & 96) && (Bn === null ? Vn([e]) : Bn.push(e)), !r.is_fork && Ft.size > 0 && !Lt && Ut();
	}
	return t;
}
function Ut() {
	Lt = !1;
	for (let e of Ft) {
		e.f & 1024 && j(e, g);
		let t;
		try {
			t = qn(e);
		} catch {
			t = !0;
		}
		t && $n(e);
	}
	Ft.clear();
}
function Wt(e) {
	P(e, e.v + 1);
}
function Gt(e, t, n) {
	var r = e.reactions;
	if (r !== null) {
		var i = We(), a = r.length;
		if (Vt += a, Vt > 1e5 && Bt === null && (Bt = /* @__PURE__ */ new Set()), Bt !== null) {
			if (Bt.has(e)) return;
			Bt.add(e);
		}
		for (var o = 0; o < a; o++) {
			var s = r[o], c = s.f;
			if (i || s !== W) {
				var l = (c & h) === 0;
				if (l && j(s, t), c & 131072) Ft.add(s);
				else if (c & 2) {
					var u = s;
					yt?.delete(u), Gt(u, g, n);
				} else if (l) {
					var d = s;
					c & 16 && At !== null && At.add(d), n === null ? Mt(d) : n.push(d);
				}
			}
		}
	}
}
function Kt(t) {
	if (typeof t != "object" || !t || w in t || ie in t) return t;
	let n = l(t);
	if (n !== s && n !== c) return t;
	var r = /* @__PURE__ */ new Map(), i = e(t), o = /* @__PURE__ */ N(0), u = null, d = Wn, f = (e) => {
		if (Wn === d) return e();
		var t = U, n = Wn;
		In(null), Gn(d);
		var r = e();
		return In(t), Gn(n), r;
	};
	return i && r.set("length", /* @__PURE__ */ N(t.length, u)), new Proxy(t, {
		defineProperty(e, t, n) {
			(!("value" in n) || n.configurable === !1 || n.enumerable === !1 || n.writable === !1) && Ie();
			var i = r.get(t);
			return i === void 0 ? f(() => {
				var e = /* @__PURE__ */ N(n.value, u);
				return r.set(t, e), e;
			}) : P(i, n.value, !0), !0;
		},
		deleteProperty(e, t) {
			var n = r.get(t);
			if (n === void 0) {
				if (t in e) {
					let e = f(() => /* @__PURE__ */ N(T, u));
					r.set(t, e), Wt(o);
				}
			} else P(n, T), Wt(o);
			return !0;
		},
		get(e, n, i) {
			if (n === w) return t;
			var o = r.get(n), s = n in e;
			if (o === void 0 && (!s || a(e, n)?.writable) && (o = f(() => /* @__PURE__ */ N(Kt(s ? e[n] : T), u)), r.set(n, o)), o !== void 0) {
				var c = q(o);
				return c === T ? void 0 : c;
			}
			return Reflect.get(e, n, i);
		},
		getOwnPropertyDescriptor(e, t) {
			this.has?.(e, t);
			var n = Reflect.getOwnPropertyDescriptor(e, t), i = r.get(t);
			if (i !== void 0) {
				var a = q(i);
				if (a === T) return;
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
			if (t === w) return !0;
			var n = r.get(t), i = n !== void 0 && n.v !== T || Reflect.has(e, t);
			return (n !== void 0 || W !== null && (!i || a(e, t)?.writable)) && (n === void 0 && (n = f(() => /* @__PURE__ */ N(i ? Kt(e[t]) : T, u)), r.set(t, n)), q(n) === T) ? !1 : i;
		},
		set(e, t, n, s) {
			var c = r.get(t), l = t in e;
			if (i && t === "length") for (var d = n; d < c.v; d += 1) {
				var p = r.get(d + "");
				p === void 0 ? d in e && (p = f(() => /* @__PURE__ */ N(T, u)), r.set(d + "", p)) : P(p, T);
			}
			if (c === void 0) (!l || a(e, t)?.writable) && (c = f(() => /* @__PURE__ */ N(void 0, u)), P(c, Kt(n)), r.set(t, c));
			else {
				l = c.v !== T;
				var m = f(() => Kt(n));
				P(c, m);
			}
			var h = Reflect.getOwnPropertyDescriptor(e, t);
			if (h?.set && h.set.call(s, n), !l) {
				if (i && typeof t == "string") {
					var g = r.get("length"), _ = Number(t);
					Number.isInteger(_) && _ >= g.v && P(g, _ + 1);
				}
				Wt(o);
			}
			return !0;
		},
		ownKeys(e) {
			q(o);
			var t = Reflect.ownKeys(e).filter((e) => {
				var t = r.get(e);
				return t === void 0 || t.v !== T;
			});
			for (var [n, i] of r) i.v !== T && !(n in e) && t.push(n);
			return t;
		},
		setPrototypeOf() {
			Le();
		}
	});
}
function qt(e) {
	try {
		if (typeof e == "object" && e && w in e) return e[w];
	} catch {}
	return e;
}
function Jt(e, t) {
	return Object.is(qt(e), qt(t));
}
var Yt, Xt, Zt, Qt;
function $t() {
	if (Yt === void 0) {
		Yt = window, Xt = /Firefox/.test(navigator.userAgent);
		var e = Element.prototype, t = Node.prototype, n = Text.prototype;
		Zt = a(t, "firstChild").get, Qt = a(t, "nextSibling").get, u(e) && (e[se] = void 0, e[oe] = null, e[ce] = void 0, e.__e = void 0), u(n) && (n[le] = void 0);
	}
}
function F(e = "") {
	return document.createTextNode(e);
}
/*@__NO_SIDE_EFFECTS__*/
function I(e) {
	return Zt.call(e);
}
/*@__NO_SIDE_EFFECTS__*/
function en(e) {
	return Qt.call(e);
}
function L(e, t) {
	if (!E) return /* @__PURE__ */ I(e);
	var n = /* @__PURE__ */ I(D);
	if (n === null) n = D.appendChild(F());
	else if (t && n.nodeType !== 3) {
		var r = F();
		return n?.before(r), O(r), r;
	}
	return t && on(n), O(n), n;
}
function tn(e, t = !1) {
	if (!E) {
		var n = /* @__PURE__ */ I(e);
		return n instanceof Comment && n.data === "" ? /* @__PURE__ */ en(n) : n;
	}
	if (t) {
		if (D?.nodeType !== 3) {
			var r = F();
			return D?.before(r), O(r), r;
		}
		on(D);
	}
	return D;
}
function R(e, t = !1) {
	if (!E) return /* @__PURE__ */ I(e);
	var n = L(e, t);
	return k(e), n;
}
function z(e, t = 1, n = !1) {
	let r = E ? D : e;
	for (var i; t--;) i = r, r = /* @__PURE__ */ en(r);
	if (!E) return r;
	if (n) {
		if (r?.nodeType !== 3) {
			var a = F();
			return r === null ? i?.after(a) : r.before(a), O(a), a;
		}
		on(r);
	}
	return O(r), r;
}
function nn(e) {
	e.textContent = "";
}
function rn() {
	return !1;
}
function an(e, t, n) {
	return t == null || t === "http://www.w3.org/1999/xhtml" ? n ? document.createElement(e, { is: n }) : document.createElement(e) : n ? document.createElementNS(t, e, { is: n }) : document.createElementNS(t, e);
}
function on(e) {
	if (e.nodeValue.length < 65536) return;
	let t = e.nextSibling;
	for (; t !== null && t.nodeType === 3;) t.remove(), e.nodeValue += t.nodeValue, t = e.nextSibling;
}
function sn(e) {
	var t = W;
	if (t === null) return U.f |= re, e;
	if (!(t.f & 32768) && !(t.f & 4)) throw e;
	cn(e, t);
}
function cn(e, t) {
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
function ln(e) {
	W === null && (U === null && Pe(e), Ne()), Nn && Me(e);
}
function un(e, t) {
	var n = t.last;
	n === null ? t.last = t.first = e : (n.next = e, e.prev = n, t.last = e);
}
function dn(e, t) {
	var n = W;
	n !== null && n.f & 8192 && (e |= _);
	var r = {
		ctx: A,
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
	M?.register_created_effect(r);
	var i = r;
	if (e & 4) Ct === null ? Dt.ensure().schedule(r) : Ct.push(r);
	else if (t !== null) {
		try {
			$n(r);
		} catch (e) {
			throw H(r), e;
		}
		i.deps === null && i.teardown === null && i.nodes === null && i.first === i.last && !(i.f & 524288) && (i = i.first, e & 16 && e & 65536 && i !== null && (i.f |= x));
	}
	if (i !== null && (i.parent = n, n !== null && un(i, n), U !== null && U.f & 2 && !(e & 64))) {
		var a = U;
		(a.effects ??= []).push(i);
	}
	return r;
}
function fn() {
	return U !== null && !Fn;
}
function pn(e) {
	let t = dn(8, null);
	return j(t, m), t.teardown = e, t;
}
function mn(e) {
	ln("$effect");
	var t = W.f;
	if (!U && t & 32 && A !== null && !A.i) {
		var n = A;
		(n.e ??= []).push(e);
	} else return hn(e);
}
function hn(e) {
	return dn(4 | ee, e);
}
function gn(e) {
	Dt.ensure();
	let t = dn(64 | S, e);
	return (e = {}) => new Promise((n) => {
		e.outro ? En(t, () => {
			H(t), n(void 0);
		}) : (H(t), n(void 0));
	});
}
function _n(e) {
	return dn(4, e);
}
function vn(e) {
	return dn(C | S, e);
}
function yn(e, t = 0) {
	return dn(8 | t, e);
}
function B(e, t = [], n = [], r = []) {
	rt(r, t, n, (t) => {
		dn(8, () => {
			e(...t.map(q));
		});
	});
}
function bn(e, t = 0) {
	return dn(16 | t, e);
}
function V(e) {
	return dn(32 | S, e);
}
function xn(e) {
	var t = e.teardown;
	if (t !== null) {
		let n = Nn, r = U;
		Pn(!0), In(null);
		try {
			t.call(null);
		} catch (t) {
			cn(t, e.parent);
		} finally {
			Pn(n), In(r);
		}
	}
}
function Sn(e, t = !1) {
	var n = e.first;
	for (e.first = e.last = null; n !== null;) {
		let e = n.ac;
		e !== null && tt(() => {
			e.abort(de);
		});
		var r = n.next;
		n.f & 64 ? n.parent = null : H(n, t), n = r;
	}
}
function Cn(e) {
	for (var t = e.first; t !== null;) {
		var n = t.next;
		t.f & 32 || H(t), t = n;
	}
}
function H(e, t = !0) {
	var n = !1;
	(t || e.f & 262144) && e.nodes !== null && e.nodes.end !== null && (wn(e.nodes.start, e.nodes.end), n = !0), e.f |= b, Sn(e, t && !n), Qn(e, 0);
	var r = e.nodes && e.nodes.t;
	if (r !== null) for (let e of r) e.stop();
	xn(e), e.f ^= b, e.f |= v;
	var i = e.parent;
	i !== null && i.first !== null && Tn(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function wn(e, t) {
	for (; e !== null;) {
		var n = e === t ? null : /* @__PURE__ */ en(e);
		e.remove(), e = n;
	}
}
function Tn(e) {
	var t = e.parent, n = e.prev, r = e.next;
	n !== null && (n.next = r), r !== null && (r.prev = n), t !== null && (t.first === e && (t.first = r), t.last === e && (t.last = n));
}
function En(e, t, n = !0) {
	var r = [];
	e.f |= 256, Dn(e, r, !0);
	var i = () => {
		n && H(e), t && t();
	}, a = r.length;
	if (a > 0) {
		var o = () => --a || i();
		for (var s of r) s.out(o);
	} else i();
}
function Dn(e, t, n) {
	if (!(e.f & 8192)) {
		e.f ^= _;
		var r = e.nodes && e.nodes.t;
		if (r !== null) for (let e of r) (e.is_global || n) && t.push(e);
		for (var i = e.first; i !== null;) {
			var a = i.next;
			if (!(i.f & 64)) {
				var o = !!(i.f & 65536) || !!(i.f & 32) && !!(e.f & 16);
				Dn(i, t, o ? n : !1);
			}
			i = a;
		}
	}
}
function On(e) {
	e.f &= -257, kn(e, !0);
}
function kn(e, t) {
	if (!(e.f & 256) && e.f & 8192) {
		e.f ^= _, e.f & 1024 || (j(e, h), Dt.ensure().schedule(e));
		for (var n = e.first; n !== null;) {
			var r = n.next, i = !!(n.f & 65536) || !!(n.f & 32);
			kn(n, i ? t : !1), n = r;
		}
		var a = e.nodes && e.nodes.t;
		if (a !== null) for (let e of a) (e.is_global || t) && e.in();
	}
}
function An(e, t) {
	if (e.nodes) for (var n = e.nodes.start, r = e.nodes.end; n !== null;) {
		var i = n === r ? null : /* @__PURE__ */ en(n);
		t.append(n), n = i;
	}
}
//#endregion
//#region node_modules/svelte/src/internal/client/legacy.js
var jn = null, Mn = !1, Nn = !1;
function Pn(e) {
	Nn = e;
}
var U = null, Fn = !1;
function In(e) {
	U = e;
}
var W = null;
function Ln(e) {
	W = e;
}
var Rn = null;
function zn(e) {
	U !== null && (U.f & 2097152 || U.f & 2) && (Rn ??= /* @__PURE__ */ new Set()).add(e);
}
var G = null, K = 0, Bn = null;
function Vn(e) {
	Bn = e;
}
var Hn = 1, Un = 0, Wn = Un;
function Gn(e) {
	Wn = e;
}
function Kn() {
	return ++Hn;
}
function qn(e) {
	var t = e.f;
	if (t & 2048) return !0;
	if (t & 4096) {
		for (var n = e.deps, r = n.length, i = 0; i < r; i++) {
			var a = n[i];
			if (qn(a) && mt(a), a.wv > e.wv) return !0;
		}
		t & 512 && yt === null && j(e, m);
	}
	return !1;
}
function Jn(e, t, n = !0) {
	var r = e.reactions;
	if (r !== null && !(Rn !== null && Rn.has(e))) for (var i = 0; i < r.length; i++) {
		var a = r[i];
		a.f & 2 ? Jn(a, t, !1) : t === a && (n ? j(a, h) : a.f & 1024 && j(a, g), Mt(a));
	}
}
function Yn(e) {
	var t = G, n = K, r = Bn, i = U, a = Rn, o = A, s = Fn, c = Wn, l = e.f;
	G = null, K = 0, Bn = null, U = l & 96 ? null : e, Rn = null, Be(e.ctx), Fn = !1, Wn = ++Un, e.ac !== null && (tt(() => {
		e.ac.abort(de);
	}), e.ac = null);
	try {
		e.f |= ne;
		var u = e.fn, d = u();
		e.f |= y;
		var f = Xn(e);
		if (We() && Bn !== null && !Fn && f !== null && !(e.f & 6146)) for (var p = 0; p < Bn.length; p++) Jn(Bn[p], e);
		if (i !== null && i !== e) {
			if (Un++, i.deps !== null) for (let e = 0; e < n; e += 1) i.deps[e].rv = Un;
			if (t !== null) for (let e of t) e.rv = Un;
			Bn !== null && (r === null ? r = Bn : r.push(...Bn));
		}
		return e.f & 8388608 && (e.f ^= re), d;
	} catch (t) {
		return Xn(e), sn(t);
	} finally {
		e.f ^= ne, G = t, K = n, Bn = r, U = i, Rn = a, Be(o), Fn = s, Wn = c;
	}
}
function Xn(e) {
	var t = e.deps, n = M?.is_fork;
	if (G !== null) {
		var r;
		if (n || Qn(e, K), t !== null && K > 0) for (t.length = K + G.length, r = 0; r < G.length; r++) t[K + r] = G[r];
		else e.deps = t = G;
		if (fn() && e.f & 512) for (r = K; r < t.length; r++) (t[r].reactions ??= []).push(e);
	} else !n && t !== null && K < t.length && (Qn(e, K), t.length = K);
	return t;
}
function Zn(e, r) {
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
		s.f & 512 && (s.f ^= 512), s.v !== T && Xe(s), s.ac !== null && tt(() => {
			s.ac.abort(de), s.ac = null, j(s, h);
		}), ht(s), Qn(s, 0);
	}
}
function Qn(e, t) {
	var n = e.deps;
	if (n !== null) for (var r = t; r < n.length; r++) Zn(e, n[r]);
}
function $n(e) {
	var t = e.f;
	if (!(t & 16384)) {
		j(e, m);
		var n = W, r = Mn;
		W = e, Mn = !(t & 96);
		try {
			t & 16777232 ? Cn(e) : Sn(e), xn(e);
			var i = Yn(e);
			e.teardown = typeof i == "function" ? i : null, e.wv = Hn;
		} finally {
			Mn = r, W = n;
		}
	}
}
async function er() {
	await Promise.resolve(), Ot();
}
function q(e) {
	var t = !!(e.f & 2);
	if (jn?.add(e), U !== null && !Fn && !(W !== null && W.f & 16384) && (Rn === null || !Rn.has(e))) {
		var r = U.deps;
		if (U.f & 2097152) e.rv < Un && (e.rv = Un, G === null && r !== null && r[K] === e ? K++ : G === null ? G = [e] : G.push(e));
		else {
			U.deps ??= [], n.call(U.deps, e) || U.deps.push(e);
			var i = e.reactions;
			i === null ? e.reactions = [U] : n.call(i, U) || i.push(U);
		}
	}
	if (Nn && It.has(e)) return It.get(e);
	if (t) {
		var a = e;
		if (Nn) {
			var o = a.v;
			return (!(a.f & 1024) && a.reactions !== null || nr(a)) && (o = pt(a)), It.set(a, o), o;
		}
		var s = !(a.f & 512) && !Fn && U !== null && (Mn || !!(U.f & 512)), c = (a.f & y) === 0;
		qn(a) && (s && (a.f |= 512), mt(a)), s && !c && (gt(a), tr(a));
	}
	if (yt?.has(e)) return yt.get(e);
	if (e.f & 8388608) throw e.v;
	return e.v;
}
function tr(e) {
	if (e.f |= 512, e.deps !== null) for (let t of e.deps) (t.reactions ??= []).push(e), t.f & 2 && !(t.f & 512) && (gt(t), tr(t));
}
function nr(e) {
	if (e.v === T) return !0;
	if (e.deps === null) return !1;
	for (let t of e.deps) if (It.has(t) || t.f & 2 && nr(t)) return !0;
	return !1;
}
function rr(e) {
	var t = Fn;
	try {
		return Fn = !0, e();
	} finally {
		Fn = t;
	}
}
[.../* @__PURE__ */ "allowfullscreen.async.autofocus.autoplay.checked.controls.default.disabled.formnovalidate.indeterminate.inert.ismap.loop.multiple.muted.nomodule.novalidate.open.playsinline.readonly.required.reversed.seamless.selected.webkitdirectory.defer.disablepictureinpicture.disableremoteplayback".split(".")];
var ir = ["touchstart", "touchmove"];
function ar(e) {
	return ir.includes(e);
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/elements/events.js
var or = Symbol("events"), sr = /* @__PURE__ */ new Set(), cr = /* @__PURE__ */ new Set();
function lr(e, t, n, r = {}) {
	function i(e) {
		if (r.capture || mr.call(t, e), !e.cancelBubble) return tt(() => n?.call(this, e));
	}
	return e.startsWith("pointer") || e.startsWith("touch") || e === "wheel" ? (i.__removed = !1, qe(() => {
		i.__removed || t.addEventListener(e, i, r);
	})) : t.addEventListener(e, i, r), i;
}
function ur(e, t, n, r, i) {
	var a = {
		capture: r,
		passive: i
	}, o = lr(e, t, n, a);
	(t === document.body || t === window || t === document || t instanceof HTMLMediaElement) && pn(() => {
		o.__removed = !0, t.removeEventListener(e, o, a);
	});
}
function J(e, t, n) {
	(t[or] ??= {})[e] = n;
}
function dr(e) {
	for (var t = 0; t < e.length; t++) sr.add(e[t]);
	for (var n of cr) n(e);
}
var fr = null, pr = !1;
function mr(e) {
	var t = this, n = t.ownerDocument, r = e.type, a = e.composedPath?.() || [], o = a[0] || e.target;
	fr = e, pr || (pr = !0, setTimeout(() => {
		pr = !1, fr = null;
	}));
	var s = 0, c = fr === e && e[or];
	if (c) {
		var l = a.indexOf(c);
		if (l !== -1 && (t === document || t === window)) {
			e[or] = t;
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
		In(null), Ln(null);
		try {
			for (var p, m = []; o !== null && o !== t;) {
				try {
					var h = o[or]?.[r];
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
			e[or] = t, delete e.currentTarget, In(d), Ln(f);
		}
	}
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/reconciler.js
var hr = globalThis?.window?.trustedTypes && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", { createHTML: (e) => e });
function gr(e) {
	return hr?.createHTML(e) ?? e;
}
function _r(e) {
	var t = an("template");
	return t.innerHTML = gr(e.replaceAll("<!>", "<!---->")), t.content;
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/template.js
function vr(e, t) {
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
		if (E) return vr(D, null), D;
		i === void 0 && (i = _r(a ? e : "<!>" + e), n || (i = /* @__PURE__ */ I(i)));
		var t = r || Xt ? document.importNode(i, !0) : i.cloneNode(!0);
		if (n) {
			var o = /* @__PURE__ */ I(t), s = t.lastChild;
			vr(o, s);
		} else vr(t, t);
		return t;
	};
}
function yr() {
	if (E) return vr(D, null), D;
	var e = document.createDocumentFragment(), t = document.createComment(""), n = F();
	return e.append(t, n), vr(t, n), e;
}
function X(e, t) {
	if (E) {
		var n = W;
		(!(n.f & 32768) || n.nodes.end === null) && (n.nodes.end = D), Se();
		return;
	}
	e !== null && e.before(t);
}
//#endregion
//#region node_modules/svelte/src/reactivity/create-subscriber.js
function br(e) {
	let t = 0, n = Rt(0), r;
	return () => {
		fn() && (q(n), yn(() => (t === 0 && (r = rr(() => e(() => Wt(n)))), t += 1, () => {
			qe(() => {
				--t, t === 0 && (r?.(), r = void 0, Wt(n));
			});
		})));
	};
}
//#endregion
//#region node_modules/svelte/src/internal/client/dom/blocks/boundary.js
var xr = x | S;
function Sr(e, t, n, r) {
	new Cr(e, t, n, r);
}
var Cr = class {
	parent;
	is_pending = !1;
	transform_error;
	#e;
	#t = E ? D : null;
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
	#h = br(() => (this.#m = Rt(this.#l), () => {
		this.#m = null;
	}));
	constructor(e, t, n, r) {
		this.#e = e, this.#n = t, this.#r = (e) => {
			var t = W;
			t.b = this, t.f |= 128, n(e);
		}, this.parent = W.b, this.transform_error = r ?? this.parent?.transform_error ?? ((e) => e), this.#i = bn(() => {
			if (E) {
				let e = this.#t;
				Se();
				let t = e.data === "[!";
				if (e.data.startsWith("[?")) {
					let t = JSON.parse(e.data.slice(2));
					this.#_(t);
				} else t ? this.#y() : this.#g();
			} else this.#b();
		}, xr), E && (this.#e = D);
	}
	#g() {
		try {
			this.#a = V(() => this.#r(this.#e));
		} catch (e) {
			this.error(e);
		}
	}
	#_(e) {
		let t = this.#n.failed, { reset: n, invoke_onerror: r } = this.#v(e);
		qe(r), t && (this.#s = V(() => {
			t(this.#e, () => e, () => n);
		}));
	}
	#v(e) {
		var t = !1, n = !1;
		let r = () => {
			if (t) {
				be();
				return;
			}
			t = !0, n && ze(), this.#s !== null && En(this.#s, () => {
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
					cn(e, this.#i && this.#i.parent);
				}
			}
		};
	}
	#y() {
		let e = this.#n.pending;
		e && (this.is_pending = !0, this.#o = V(() => e(this.#e)), qe(() => {
			var e = this.#c = document.createDocumentFragment(), t = F(), n = !1;
			if (e.append(t), this.#a = this.#S(() => {
				try {
					return V(() => this.#r(t));
				} catch (e) {
					try {
						this.error(e), n = !0;
					} catch (e) {
						cn(e, this.#i.parent);
					}
					return null;
				}
			}), this.#a === null) {
				this.#c = null, n && this.#x(M);
				return;
			}
			this.#u === 0 && (this.#e.before(e), this.#c = null, En(this.#o, () => {
				this.#o = null;
			}), this.#x(M));
		}));
	}
	#b() {
		try {
			if (this.is_pending = this.has_pending_snippet(), this.#u = 0, this.#l = 0, this.#a = V(() => {
				this.#r(this.#e);
			}), this.#u > 0) {
				var e = this.#c = document.createDocumentFragment();
				An(this.#a, e);
				let t = this.#n.pending;
				this.#o = V(() => t(this.#e));
			} else this.#x(M);
		} catch (e) {
			this.error(e);
		}
	}
	#x(e) {
		this.is_pending = !1, e.transfer_effects(this.#f, this.#p);
	}
	defer_effect(e) {
		Ze(e, this.#f, this.#p);
	}
	is_rendered() {
		return !this.is_pending && (!this.parent || this.parent.is_rendered());
	}
	has_pending_snippet() {
		return !!this.#n.pending;
	}
	#S(e) {
		var t = W, n = U, r = A;
		Ln(this.#i), In(this.#i), Be(this.#i.ctx);
		try {
			return Dt.ensure(), e();
		} finally {
			Ln(t), In(n), Be(r);
		}
	}
	#C(e, t) {
		if (!this.has_pending_snippet()) {
			this.parent && this.parent.#C(e, t);
			return;
		}
		this.#u += e, this.#u === 0 && (this.#x(t), this.#o && En(this.#o, () => {
			this.#o = null;
		}), this.#c &&= (this.#e.before(this.#c), null));
	}
	update_pending_count(e, t) {
		this.#C(e, t), this.#l += e, !(!this.#m || this.#d) && (this.#d = !0, qe(() => {
			this.#d = !1, this.#m && Ht(this.#m, this.#l);
		}));
	}
	get_effect_pending() {
		return this.#h(), q(this.#m);
	}
	error(e) {
		if (!this.#n.onerror && !this.#n.failed) throw e;
		M?.is_fork ? (this.#a && M.skip_effect(this.#a), this.#o && M.skip_effect(this.#o), this.#s && M.skip_effect(this.#s), M.oncommit(() => {
			this.#w(e);
		})) : this.#w(e);
	}
	#w(e) {
		this.#a &&= (H(this.#a), null), this.#o &&= (H(this.#o), null), this.#s &&= (H(this.#s), null), E && (O(this.#t), Ce(), O(we()));
		let t = this.#n.failed, n = (e) => {
			let { reset: n, invoke_onerror: r } = this.#v(e);
			r(), t && (this.#s = this.#S(() => {
				try {
					return V(() => {
						var r = W;
						r.b = this, r.f |= 128, t(this.#e, () => e, () => n);
					});
				} catch (e) {
					return cn(e, this.#i.parent), null;
				}
			}));
		};
		qe(() => {
			var t;
			try {
				t = this.transform_error(e);
			} catch (e) {
				cn(e, this.#i && this.#i.parent);
				return;
			}
			typeof t == "object" && t && typeof t.then == "function" ? t.then(n, (e) => cn(e, this.#i && this.#i.parent)) : n(t);
		});
	}
};
function Z(e, t) {
	var n = t == null ? "" : typeof t == "object" ? `${t}` : t;
	n !== (e[le] ??= e.nodeValue) && (e[le] = n, e.nodeValue = `${n}`);
}
function wr(e, t) {
	return Er(e, t);
}
var Tr = /* @__PURE__ */ new Map();
function Er(e, { target: t, anchor: n, props: i = {}, events: a, context: o, intro: s = !0, transformError: c }) {
	$t();
	var l = void 0, u = gn(() => {
		var s = n ?? t.appendChild(F());
		Sr(s, { pending: () => {} }, (t) => {
			Ve({});
			var n = A;
			if (o && (n.c = o), a && (i.$$events = a), E && vr(t, null), l = e(t, i) || Ue(), E && (W.nodes.end = D, D === null || D.nodeType !== 8 || D.data !== "]")) throw ve(), pe;
			He();
		}, c);
		var u = /* @__PURE__ */ new Set(), d = (e) => {
			for (var n = 0; n < e.length; n++) {
				var r = e[n];
				if (!u.has(r)) {
					u.add(r);
					var i = ar(r);
					for (let e of [t, document]) {
						var a = Tr.get(e);
						a === void 0 && (a = /* @__PURE__ */ new Map(), Tr.set(e, a));
						var o = a.get(r);
						o === void 0 ? (e.addEventListener(r, mr, { passive: i }), a.set(r, 1)) : a.set(r, o + 1);
					}
				}
			}
		};
		return d(r(sr)), cr.add(d), () => {
			for (var e of u) for (let n of [t, document]) {
				var r = Tr.get(n), i = r.get(e);
				--i == 0 ? (n.removeEventListener(e, mr), r.delete(e), r.size === 0 && Tr.delete(n)) : r.set(e, i);
			}
			cr.delete(d), s !== n && s.parentNode?.removeChild(s);
		};
	});
	return Dr.set(l, u), l;
}
var Dr = /* @__PURE__ */ new WeakMap(), Or = class {
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
			if (n) On(n), this.#r.delete(t);
			else {
				var r = this.#n.get(t);
				r && (On(r.effect), this.#t.set(t, r.effect), this.#n.delete(t), r.fragment.lastChild.remove(), this.anchor.before(r.fragment), n = r.effect);
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
						An(r, t), t.append(F()), this.#n.set(e, {
							effect: r,
							fragment: t
						});
					} else H(r);
					this.#r.delete(e), this.#t.delete(e);
				};
				this.#i || !n ? (this.#r.add(e), En(r, i, !1)) : i();
			}
		}
	};
	#o = (e) => {
		this.#e.delete(e);
		let t = Array.from(this.#e.values());
		for (let [e, n] of this.#n) t.includes(e) || (H(n.effect), this.#n.delete(e));
	};
	ensure(e, t) {
		var n = M, r = rn();
		if (t && !this.#t.has(e) && !this.#n.has(e)) {
			if (r) {
				var i = document.createDocumentFragment(), a = F();
				i.append(a), this.#n.set(e, {
					effect: V(() => t(a)),
					fragment: i
				});
			} else this.#t.set(e, V(() => t(this.anchor)));
		}
		if (this.#e.set(n, e), r) {
			for (let [t, r] of this.#t) t === e ? n.unskip_effect(r) : n.skip_effect(r);
			for (let [t, r] of this.#n) t === e ? n.unskip_effect(r.effect) : n.skip_effect(r.effect);
			n.oncommit(this.#a), n.ondiscard(this.#o);
		} else E && (this.anchor = D), this.#a(n);
	}
};
//#endregion
//#region node_modules/svelte/src/internal/client/dom/blocks/if.js
function Q(e, t, n = !1) {
	var r;
	E && (r = D, Se());
	var i = new Or(e), a = n ? x : 0;
	function o(e, t) {
		if (E) {
			var n = Te(r);
			if (e !== parseInt(n.substring(1))) {
				var a = we();
				O(a), i.anchor = a, xe(!1), i.ensure(e, t), xe(!0);
				return;
			}
		}
		i.ensure(e, t);
	}
	bn(() => {
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
		En(n, () => {
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
			nn(d), d.append(u), e.items.clear();
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
		r?.has(a) ? (a.f |= te, An(a, document.createDocumentFragment())) : H(t[i], n);
	}
}
var Mr;
function Nr(t, n, i, a, o, s = null) {
	var c = t, l = /* @__PURE__ */ new Map();
	if (n & 4) {
		var u = t;
		c = E ? O(/* @__PURE__ */ I(u)) : u.appendChild(F());
	}
	E && Se();
	var d = null, f = /* @__PURE__ */ dt(() => {
		var t = i();
		return e(t) ? t : t == null ? [] : r(t);
	}), p, m = /* @__PURE__ */ new Map(), h = !0;
	function g(e) {
		v.effect.f & 16384 || (v.pending.delete(e), v.fallback = d, Fr(v, p, c, n, a), d !== null && (p.length === 0 ? d.f & 33554432 ? (d.f ^= te, Lr(d, null, c)) : On(d) : En(d, () => {
			d = null;
		})));
	}
	function _(e) {
		v.pending.delete(e);
	}
	var v = {
		effect: bn(() => {
			p = q(f);
			var e = p.length;
			let t = !1;
			E && Te(c) === "[!" != (e === 0) && (c = we(), O(c), xe(!1), t = !0);
			for (var r = /* @__PURE__ */ new Set(), u = M, v = rn(), y = 0; y < e; y += 1) {
				E && D.nodeType === 8 && D.data === "]" && (c = D, t = !0, xe(!1));
				var b = p[y], x = a(b, y), S = h ? null : l.get(x);
				S ? (S.v && Ht(S.v, b), S.i && Ht(S.i, y), v && u.unskip_effect(S.e)) : (S = Ir(l, h ? c : Mr ??= F(), b, x, y, o, n, i), h || (S.e.f |= te), l.set(x, S)), r.add(x);
			}
			if (e === 0 && s && !d && (h ? d = V(() => s(c)) : (d = V(() => s(Mr ??= F())), d.f |= te)), e > r.size && je("", "", ""), E && e > 0 && O(we()), !h) {
				if (m.set(u, r), v) {
					for (let [e, t] of l) r.has(e) || u.skip_effect(t.e);
					u.oncommit(g), u.ondiscard(_);
				} else g(u);
			}
			t && xe(!0), q(f);
		}),
		flags: n,
		items: l,
		pending: m,
		outrogroups: null,
		fallback: d
	};
	h = !1, E && (c = D);
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
		if (_.f & 8192 && (On(_), o && (_.nodes?.a?.unfix(), (f ??= /* @__PURE__ */ new Set()).delete(_))), _.f & 33554432) {
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
		var C = ne.length;
		if (C > 0) {
			var re = i & 4 && s === 0 ? n : null;
			if (o) {
				for (v = 0; v < C; v += 1) ne[v].nodes?.a?.measure();
				for (v = 0; v < C; v += 1) ne[v].nodes?.a?.fix();
			}
			Ar(e, ne, re);
		}
	}
	o && qe(() => {
		if (f !== void 0) for (_ of f) _.nodes?.a?.apply();
	});
}
function Ir(e, t, n, r, i, a, o, s) {
	var c = o & 1 ? o & 16 ? Rt(n) : /* @__PURE__ */ zt(n, !1, !1) : null, l = o & 2 ? Rt(i) : null;
	return {
		v: c,
		i: l,
		e: V(() => (a(t, c ?? n, l ?? i, s), () => {
			e.delete(r);
		}))
	};
}
function Lr(e, t, n) {
	if (e.nodes) for (var r = e.nodes.start, i = e.nodes.end, a = t && !(t.f & 33554432) ? t.nodes.start : n; r !== null;) {
		var o = /* @__PURE__ */ en(r);
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
		E && (o = O(/* @__PURE__ */ I(c)));
	}
	B(() => {
		var e = W;
		if (s === (s = t() ?? "")) {
			E && Se();
			return;
		}
		if (n && !E) {
			e.nodes = null, c.innerHTML = s, s !== "" && vr(/* @__PURE__ */ I(c), c.lastChild);
			return;
		}
		if (e.nodes !== null && (wn(e.nodes.start, e.nodes.end), e.nodes = null), s !== "") {
			if (E) {
				for (var a = D.data, l = Se(), u = l; l !== null && (l.nodeType !== 8 || l.data !== "");) u = l, l = /* @__PURE__ */ en(l);
				if (l === null) throw ve(), pe;
				vr(D, u), o = O(l);
				return;
			}
			var d = an(r ? "svg" : i ? "math" : "template", r ? he : i ? ge : void 0);
			d.innerHTML = s;
			var f = r || i ? d : d.content;
			if (vr(/* @__PURE__ */ I(f), f.lastChild), r || i) for (; /* @__PURE__ */ I(f);) o.before(/* @__PURE__ */ I(f));
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
	var o = e[se];
	if (E || o !== n || o === void 0) {
		var s = Vr(n, r, a);
		(!E || s !== e.getAttribute("class")) && (s == null ? e.removeAttribute("class") : t ? e.className = s : e.setAttribute("class", s)), e[se] = n;
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
			Ur(c, i ? a.includes(l) : Jt(l, r));
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
		if (!e(n)) return ye();
		for (var i of t.options) i.selected = n.includes(Jr(i));
		return;
	}
	for (i of t.options) if (Jt(Jr(i), n)) {
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
	}), pn(() => {
		t.disconnect();
	});
}
function qr(e, t, n = t) {
	var r = /* @__PURE__ */ new WeakSet(), i = !0;
	nt(e, "change", (t) => {
		var i = t ? "[selected]" : ":checked", a;
		if (e.multiple) a = [].map.call(e.querySelectorAll(i), Jr);
		else {
			var o = e.querySelector(i) ?? e.querySelector("option:not([disabled])");
			a = o && Jr(o);
		}
		n(a), e.__value = a, M !== null && r.add(M);
	}), _n(() => {
		var a = t();
		if (e === document.activeElement) {
			var o = M;
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
var Xr = Symbol("is custom element"), Zr = Symbol("is html"), Qr = fe ? "link" : "LINK";
function $r(e) {
	if (E) {
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
		e[ue] = n, qe(n), et();
	}
}
function $(e, t, n, r) {
	var i = ei(e);
	E && (i[t] = e.getAttribute(t), t === "src" || t === "srcset" || t === "href" && e.nodeName === Qr) || i[t] !== (i[t] = n) && (t === "loading" && (e[ae] = n), n == null ? e.removeAttribute(t) : typeof n != "string" && ni(e).has(t) ? e[t] = n : e.setAttribute(t, n));
}
function ei(e) {
	return e[oe] ??= {
		[Xr]: e.nodeName.includes("-"),
		[Zr]: e.namespaceURI === me
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
	nt(e, "input", async (i) => {
		var a = i ? e.defaultValue : e.value;
		if (a = ii(e) ? ai(a) : a, n(a), M !== null && r.add(M), await er(), a !== (a = t())) {
			var o = e.selectionStart, s = e.selectionEnd, c = e.value.length;
			if (e.value = a ?? "", s !== null) {
				var l = e.value.length;
				o === s && s === c && l > c ? (e.selectionStart = l, e.selectionEnd = l) : (e.selectionStart = o, e.selectionEnd = Math.min(s, l));
			}
		}
	}), (E && e.defaultValue !== e.value || rr(t) == null && e.value) && (n(ii(e) ? ai(e.value) : e.value), M !== null && r.add(M)), yn(() => {
		var n = t();
		if (e === document.activeElement) {
			var i = M;
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
	return e === t || e?.[w] === t;
}
function si(e = Ue(), t, n, r) {
	var i = A.r, a = W;
	return _n(() => {
		var o, s;
		return yn(() => {
			o = s, s = r?.() || [], rr(() => {
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
	A === null && ke("onMount"), mn(() => {
		let t = rr(e);
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
var fi = /* @__PURE__ */ Y("<div class=\"destination\">Feedback: <code> </code><span class=\"badge\"> </span></div> <button>Save feedback</button>", 1), pi = /* @__PURE__ */ Y("<option> </option>"), mi = /* @__PURE__ */ Y("<button>Unified diff</button>"), hi = /* @__PURE__ */ Y("<button>Markdown preview</button>"), gi = /* @__PURE__ */ Y("<p class=\"hint\">Preview is read-only. Use Source to select a precise comment target.</p> <article class=\"markdown\"></article>", 1), _i = /* @__PURE__ */ Y("<div><code class=\"revision-gutter\"> </code><span> </span></div>"), vi = /* @__PURE__ */ Y("<pre> </pre>"), yi = /* @__PURE__ */ Y("<p> </p>"), bi = /* @__PURE__ */ Y("<p class=\"hint\">Disk revision is read-only. Existing comments remain on the original snapshot.</p> <!>", 1), xi = /* @__PURE__ */ Y("<button> </button>"), Si = /* @__PURE__ */ Y("<span></span>"), Ci = /* @__PURE__ */ Y("<span> </span>"), wi = /* @__PURE__ */ Y("<div><div class=\"diff-gutter\"></div> <!></div>"), Ti = /* @__PURE__ */ Y("<p>No textual changes (empty files or mode-only change). Choose Source to comment.</p>"), Ei = /* @__PURE__ */ Y("<label class=\"hint\">Context target side <select><option>new</option><option>old</option></select></label> <!> <!>", 1), Di = /* @__PURE__ */ Y("<div><button class=\"line-number\"> </button> <span> </span></div>"), Oi = /* @__PURE__ */ Y("<blockquote aria-label=\"Selected quote\"> </blockquote>"), ki = /* @__PURE__ */ Y("<p class=\"hint\">Select a passage or click a line number to add the first comment.</p>"), Ai = /* @__PURE__ */ Y("<article class=\"comment\"><button class=\"comment-target\"> </button> <blockquote> </blockquote><p> </p> <button>Edit</button> <button>Delete</button></article>"), ji = /* @__PURE__ */ Y("<p class=\"hint\">Last save: <code> </code></p>"), Mi = /* @__PURE__ */ Y("<nav aria-label=\"Review controls\"><label>File <select aria-label=\"File\"></select></label> <label>Side <select></select></label> <button>Source</button> <!> <!> <button>Inspect revisions</button></nav> <p> </p> <main><section aria-label=\"Reviewed content\"><div class=\"content\" role=\"region\" aria-label=\"Source content\" tabindex=\"0\"><!></div> <form><div class=\"range\"><label>Start line <input type=\"number\" min=\"1\"/></label> <label>End line <input type=\"number\" min=\"1\"/></label> <button type=\"button\">Select lines</button></div> <!> <label for=\"comment\"> </label> <textarea id=\"comment\" rows=\"4\" placeholder=\"Explain what should change…\" maxlength=\"32768\"></textarea> <button> </button> <button type=\"button\">Cancel draft</button> <small>Ctrl+S in the comment records it. Save feedback writes JSON. [ and ] switch files.</small></form></section> <aside aria-label=\"Comments\"><h2>Comments <span class=\"badge\"> </span></h2> <!> <!> <!></aside></main>", 1), Ni = /* @__PURE__ */ Y("<p class=\"loading\"> </p>"), Pi = /* @__PURE__ */ Y("<header><h1>Review</h1> <!></header> <div class=\"status\" role=\"status\" aria-live=\"polite\"> </div> <!>", 1);
function Fi(e, t) {
	Ve(t, !0);
	let n = /* @__PURE__ */ N(null), r = /* @__PURE__ */ N(0), i = /* @__PURE__ */ N(""), a = /* @__PURE__ */ N("source"), o = /* @__PURE__ */ N("new"), s = /* @__PURE__ */ N(null), c = /* @__PURE__ */ N(1), l = /* @__PURE__ */ N(1), u = /* @__PURE__ */ N(""), d = /* @__PURE__ */ N(null), f = /* @__PURE__ */ N(0), p = /* @__PURE__ */ N(""), m = /* @__PURE__ */ N(!1), h = /* @__PURE__ */ N(void 0), g = 0, _ = new URLSearchParams(location.hash.slice(1)), v = _.get("token") || sessionStorage.getItem("review-token") || "";
	_.has("token") && (sessionStorage.setItem("review-token", v), history.replaceState(null, "", location.pathname));
	let y = /* @__PURE__ */ ut(() => q(n)?.feedback.files[q(r)]), b = /* @__PURE__ */ ut(() => q(y)?.snapshots.find((e) => e.id === q(i)) || q(y)?.snapshots.at(-1)), x = /* @__PURE__ */ ut(() => q(n)?.revisions.find((e) => e.file_id === q(y)?.id)), S = /* @__PURE__ */ ut(() => li(q(b)?.text || "")), ee = /* @__PURE__ */ ut(() => new Map(q(y)?.snapshots.map((e) => [e.id, li(e.text)]))), te = /* @__PURE__ */ ut(() => q(n)?.previews.find((e) => e.snapshot_id === q(b)?.id)?.html || ""), ne = /* @__PURE__ */ ut(() => {
		if (!q(s) || !q(y)) return "";
		let e = q(s), t = q(y).snapshots.find((t) => t.id === e.snapshot_id);
		return t ? new TextDecoder().decode(new TextEncoder().encode(t.text).slice(e.start_byte, e.end_byte)) : "";
	});
	async function C(e, t = "GET", n) {
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
	async function re() {
		let e = ++g;
		try {
			let t = await C("/api/state");
			if (e !== g) return;
			P(n, t, !0), q(i) || (P(i, t.feedback.files[0].snapshots.at(-1).id, !0), P(a, t.feedback.files[0].diff ? "diff" : "source", !0));
		} catch (e) {
			P(p, String(e), !0);
		}
	}
	async function w(e, t, r) {
		P(m, !0);
		let i = ++g;
		try {
			let a = await C(e, t, r);
			return i === g && P(n, a, !0), !0;
		} catch (e) {
			return await re(), P(p, String(e), !0), P(f, q(n)?.revision || 0, !0), !1;
		} finally {
			P(m, !1);
		}
	}
	function ie(e) {
		(!q(u) && !q(d) || confirm("Discard this unrecorded comment draft?")) && (P(r, e, !0), P(i, q(n).feedback.files[e].snapshots.at(-1).id, !0), P(a, q(n).feedback.files[e].diff ? "diff" : "source", !0), P(s, null), P(d, null), P(u, ""), P(c, P(l, 1), !0));
	}
	function ae(e, t, r = !1) {
		if (q(d)) {
			P(p, "Finish or cancel editing before choosing another target.");
			return;
		}
		!r || q(s)?.snapshot_id !== e.id ? P(c, P(l, t, !0), !0) : (P(c, Math.min(q(c), t), !0), P(l, Math.max(q(l), t), !0)), P(i, e.id, !0), P(s, {
			snapshot_id: e.id,
			...ui(e.text, q(c), q(l))
		}, !0), P(f, q(n).revision, !0), P(p, `${e.side} lines ${q(c)}–${q(l)} selected`);
	}
	function oe() {
		if (q(b) && !q(d)) try {
			P(s, {
				snapshot_id: q(b).id,
				...ui(q(b).text, q(c), q(l))
			}, !0), P(f, q(n).revision, !0), P(p, "");
		} catch (e) {
			P(s, null), P(p, String(e), !0);
		}
	}
	function se() {
		if (q(d) || q(a) === "current" || q(a) === "preview") return;
		let e = window.getSelection();
		if (!e || e.isCollapsed || !e.anchorNode || !e.focusNode) return;
		let t = di(e.anchorNode, e.anchorOffset), r = di(e.focusNode, e.focusOffset);
		if (!t || !r) {
			P(p, "Select source text without the line-number controls, or use line ranges.");
			return;
		}
		if (t.snapshot_id !== r.snapshot_id) {
			P(p, "Select one diff side, or switch to its full Source view.");
			return;
		}
		let o = q(y).snapshots.find((e) => e.id === t.snapshot_id);
		P(i, o.id, !0), P(s, {
			snapshot_id: o.id,
			start_byte: Math.min(t.byte, r.byte),
			end_byte: Math.max(t.byte, r.byte)
		}, !0), P(c, li(o.text).findIndex((e) => e.end > q(s).start_byte) + 1), P(l, li(o.text).findIndex((e) => e.end >= q(s).end_byte) + 1), P(f, q(n).revision, !0), P(p, "Passage selected. Write a comment below.");
	}
	async function ce() {
		q(a) !== "current" && q(a) !== "preview" && q(y) && (q(s) || q(d)) && q(u).trim() && await w(q(d) ? `/api/comments/${q(d)}` : "/api/comments", q(d) ? "PUT" : "POST", q(d) ? {
			body: q(u),
			expected_revision: q(f)
		} : {
			file_id: q(y).id,
			...q(s),
			body: q(u),
			expected_revision: q(f)
		}) && (P(u, ""), P(d, null), P(p, "Comment recorded. Save feedback to write it to disk."));
	}
	function le(e, t = !1) {
		(!q(u) && !q(d) || confirm("Discard this unrecorded comment draft?")) && (P(r, q(n).feedback.files.findIndex((t) => t.id === e.target.file_id), !0), P(i, e.target.snapshot_id, !0), P(a, "source"), P(s, {
			snapshot_id: q(i),
			start_byte: e.target.start_byte,
			end_byte: e.target.end_byte
		}, !0), P(c, e.target.start_line, !0), P(l, e.target.end_line, !0), P(d, t ? e.id : null, !0), P(u, t ? e.body : "", !0), P(f, q(n).revision, !0), P(p, `Original ${e.target.side} lines ${q(c)}–${q(l)}`), setTimeout(() => {
			document.getElementById(`line-${q(c)}`)?.scrollIntoView({ block: "center" }), t && q(h)?.focus();
		}, 0));
	}
	async function ue(e) {
		confirm("Delete this comment?") && await w(`/api/comments/${e.id}`, "DELETE", { expected_revision: q(n).revision }) && (q(d) === e.id && (P(u, ""), P(d, null)), P(p, "Comment deleted. Save to write feedback."));
	}
	async function de() {
		if (q(u) || q(d)) {
			P(p, "Record or cancel the comment draft before saving feedback."), q(h)?.focus();
			return;
		}
		await w("/api/save", "POST", { expected_revision: q(n).revision }) && P(p, `Saved ${q(n).last_saved}`);
	}
	function fe(e) {
		return q(y)?.snapshots.find((t) => t.side === (e.kind === "delete" ? "old" : e.kind === "add" ? "new" : q(o)));
	}
	function pe(e, t) {
		return (t?.side === "old" ? e.old_line : e.new_line) || 1;
	}
	function T(e) {
		if (e.ctrlKey && e.key === "s") {
			e.preventDefault(), !q(m) && q(n) && (e.target === q(h) ? ce() : de());
			return;
		}
		e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement || (e.key === "c" && q(h)?.focus(), e.key === "]" && q(n) && ie((q(r) + 1) % q(n).feedback.files.length), e.key === "[" && q(n) && ie((q(r) + q(n).feedback.files.length - 1) % q(n).feedback.files.length));
	}
	ci(() => {
		re();
		let e = setInterval(() => {
			q(m) || re();
		}, 2500), t = (e) => {
			(q(n)?.dirty || q(u) || q(d)) && (e.preventDefault(), e.returnValue = "");
		};
		return window.addEventListener("beforeunload", t), window.addEventListener("keydown", T), () => {
			clearInterval(e), window.removeEventListener("beforeunload", t), window.removeEventListener("keydown", T);
		};
	});
	var me = Pi(), he = tn(me), ge = z(L(he), 2), _e = (e) => {
		var t = fi(), r = tn(t), i = z(L(r)), a = R(i, !0), o = R(z(i), !0);
		k(r);
		var s = z(r, 2);
		B(() => {
			Z(a, q(n).output), Z(o, q(n).dirty ? "Unsaved" : "Saved"), s.disabled = q(m);
		}), J("click", s, de), X(e, t);
	};
	Q(ge, (e) => {
		q(n) && e(_e);
	}), k(he);
	var ve = z(he, 2), ye = R(ve, !0), be = z(ve, 2), E = (e) => {
		var t = Mi(), f = tn(t), p = L(f), g = z(L(p));
		Nr(g, 21, () => q(n).feedback.files, kr, (e, t, n) => {
			var r = pi(), i = R(r, !0);
			r.value = r.__value = n, B(() => Z(i, q(t).path)), X(e, r);
		}), k(g);
		var _;
		Kr(g), k(p);
		var v = z(p, 2), C = z(L(v));
		Nr(C, 21, () => q(y).snapshots, kr, (e, t) => {
			var n = pi(), r = R(n), i = {};
			B((e) => {
				Z(r, `${q(t).side ?? ""} · ${e ?? ""}`), i !== (i = q(t).id) && (n.value = (n.__value = i) ?? "");
			}, [() => q(t).revision.slice(0, 16)]), X(e, n);
		}), k(C), Kr(C), k(v);
		var w = z(v, 2), de = z(w, 2), T = (e) => {
			var t = mi();
			B(() => $(t, "aria-pressed", q(a) === "diff")), J("click", t, () => P(a, "diff")), X(e, t);
		};
		Q(de, (e) => {
			q(y).diff && e(T);
		});
		var me = z(de, 2), he = (e) => {
			var t = hi();
			B(() => $(t, "aria-pressed", q(a) === "preview")), J("click", t, () => P(a, "preview")), X(e, t);
		};
		Q(me, (e) => {
			q(te) && e(he);
		});
		var ge = z(me, 2);
		k(f);
		var _e = z(f, 2);
		let ve;
		var ye = R(_e), be = z(_e, 2), E = L(be), xe = L(E), D = L(xe), O = (e) => {
			var t = gi(), n = z(tn(t), 2);
			zr(n, () => q(te), !0), k(n), X(e, t);
		}, Se = (e) => {
			var t = bi(), n = z(tn(t), 2), r = (e) => {
				var t = yr(), n = tn(t), r = (e) => {
					var t = yr();
					Nr(tn(t), 17, () => q(x).diff, kr, (e, t) => {
						var n = _i(), r = L(n), i = R(r), a = R(z(r));
						k(n), B(() => {
							Hr(n, 1, `source-row ${q(t).kind ?? ""}`), Z(i, `${q(t).old_line ?? "" ?? ""} → ${q(t).new_line ?? "" ?? ""}`), Z(a, `${q(t).kind === "delete" ? "−" : q(t).kind === "add" ? "+" : " "} ${q(t).text ?? ""}`);
						}), X(e, n);
					}), X(e, t);
				}, i = (e) => {
					var t = vi(), n = R(t, !0);
					B(() => Z(n, q(x).text)), X(e, t);
				};
				Q(n, (e) => {
					q(x).diff.length ? e(r) : e(i, -1);
				}), X(e, t);
			}, i = (e) => {
				var t = yi(), n = R(t, !0);
				B(() => Z(n, q(x)?.message)), X(e, t);
			};
			Q(n, (e) => {
				q(x)?.text !== null && q(x)?.text !== void 0 ? e(r) : e(i, -1);
			}), X(e, t);
		}, we = (e) => {
			var t = Ei(), n = tn(t), r = z(L(n)), i = L(r);
			i.value = i.__value = "new";
			var a = z(i);
			a.value = a.__value = "old", k(r), Kr(r), k(n);
			var s = z(n, 2);
			Nr(s, 17, () => q(y).diff, kr, (e, t) => {
				let n = /* @__PURE__ */ ut(() => fe(q(t))), r = /* @__PURE__ */ ut(() => pe(q(t), q(n)));
				var i = wi(), a = L(i);
				Nr(a, 21, () => q(y).snapshots, kr, (e, n) => {
					let r = /* @__PURE__ */ ut(() => q(n).side === "old" ? q(t).old_line : q(t).new_line);
					var i = yr(), a = tn(i), o = (e) => {
						var t = xi(), i = R(t);
						B(() => {
							$(t, "aria-label", `Select ${q(n).side ?? ""} line ${q(r) ?? ""}`), Z(i, `${q(n).side === "old" ? "−" : "+"}${q(r) ?? ""}`);
						}), J("click", t, (e) => ae(q(n), q(r), e.shiftKey)), X(e, t);
					}, s = (e) => {
						X(e, Si());
					};
					Q(a, (e) => {
						q(r) ? e(o) : e(s, -1);
					}), X(e, i);
				}), k(a);
				var o = z(a, 2), s = (e) => {
					var i = Ci(), a = R(i, !0);
					B((e) => {
						$(i, "data-start", e), $(i, "data-snapshot", q(n).id), Z(a, q(t).text);
					}, [() => q(ee).get(q(n).id)[q(r) - 1].start]), X(e, i);
				}, c = (e) => {
					var n = Ci(), r = R(n, !0);
					B(() => Z(r, q(t).text)), X(e, n);
				};
				Q(o, (e) => {
					q(n) && (q(t).old_line || q(t).new_line) ? e(s) : e(c, -1);
				}), k(i), B(() => Hr(i, 1, `source-row ${q(t).kind ?? ""}`)), X(e, i);
			});
			var c = z(s, 2), l = (e) => {
				X(e, Ti());
			};
			Q(c, (e) => {
				q(y).diff.length || e(l);
			}), qr(r, () => q(o), (e) => P(o, e)), X(e, t);
		}, Te = (e) => {
			var t = yr();
			Nr(tn(t), 17, () => q(S), kr, (e, t) => {
				var n = Di();
				let r;
				var i = L(n), a = R(i, !0), o = z(i, 2), u = R(o, !0);
				k(n), B(() => {
					$(n, "id", `line-${q(t).number ?? ""}`), r = Hr(n, 1, "source-row", null, r, { selected: q(s)?.snapshot_id === q(b).id && q(t).number >= q(c) && q(t).number <= q(l) }), $(i, "aria-label", `Select line ${q(t).number ?? ""}`), Z(a, q(t).number), $(o, "data-start", q(t).start), $(o, "data-snapshot", q(b).id), Z(u, q(t).text);
				}), J("click", i, (e) => ae(q(b), q(t).number, e.shiftKey)), X(e, n);
			}), X(e, t);
		};
		Q(D, (e) => {
			q(a) === "preview" ? e(O) : q(a) === "current" ? e(Se, 1) : q(a) === "diff" && q(y).diff ? e(we, 2) : e(Te, -1);
		}), k(xe);
		var Ee = z(xe, 2), De = L(Ee), Oe = L(De), ke = z(L(Oe));
		$r(ke), k(Oe);
		var Ae = z(Oe, 2), je = z(L(Ae));
		$r(je), k(Ae);
		var Me = z(Ae, 2);
		k(De);
		var Ne = z(De, 2), Pe = (e) => {
			var t = Oi(), n = R(t, !0);
			B(() => Z(n, q(ne) || "(empty file)")), X(e, t);
		};
		Q(Ne, (e) => {
			q(s) && e(Pe);
		});
		var Fe = z(Ne, 2), Ie = R(Fe, !0), Le = z(Fe, 2);
		Qe(Le), si(Le, (e) => P(h, e), () => q(h));
		var Re = z(Le, 2), ze = R(Re, !0), A = z(Re, 2);
		Ce(2), k(Ee), k(E);
		var Be = z(E, 2), Ve = L(Be), He = R(z(L(Ve)), !0);
		k(Ve);
		var Ue = z(Ve, 2), We = (e) => {
			X(e, ki());
		};
		Q(Ue, (e) => {
			q(n).feedback.comments.length || e(We);
		});
		var Ge = z(Ue, 2);
		Nr(Ge, 17, () => q(n).feedback.comments, (e) => e.id, (e, t) => {
			var n = Ai(), r = L(n), i = R(r), a = z(r, 2), o = R(a, !0), s = z(a), c = R(s, !0), l = z(s, 2), u = z(l, 2);
			k(n), B(() => {
				Z(i, `${q(t).target.path ?? ""} · ${q(t).target.side ?? ""} L${q(t).target.start_line ?? ""}–${q(t).target.end_line ?? ""}`), Z(o, q(t).target.quote || "(empty file)"), Z(c, q(t).body), l.disabled = q(m), u.disabled = q(m);
			}), J("click", r, () => le(q(t))), J("click", l, () => le(q(t), !0)), J("click", u, () => ue(q(t))), X(e, n);
		});
		var Ke = z(Ge, 2), qe = (e) => {
			var t = ji(), r = R(z(L(t)), !0);
			k(t), B(() => Z(r, q(n).last_saved)), X(e, t);
		};
		Q(Ke, (e) => {
			q(n).last_saved && e(qe);
		}), k(Be), k(be), B((e) => {
			_ !== (_ = q(r)) && (g.value = (g.__value = _) ?? "", Gr(g, _)), C.disabled = !!q(d), $(w, "aria-pressed", q(a) === "source"), $(ge, "aria-pressed", q(a) === "current"), ve = Hr(_e, 1, "revision-status", null, ve, { changed: q(x)?.state !== "unchanged" }), Z(ye, `${q(x)?.state ?? ""}: ${q(x)?.message ?? ""}`), $(ke, "max", q(S).length), ke.disabled = !!q(d) || q(a) === "current" || q(a) === "preview", $(je, "max", q(S).length), je.disabled = !!q(d) || q(a) === "current" || q(a) === "preview", Me.disabled = !!q(d) || q(a) === "current" || q(a) === "preview", Z(Ie, q(d) ? "Edit comment" : "Comment"), Le.disabled = q(m) || q(a) === "current" || q(a) === "preview", Re.disabled = e, Z(ze, q(d) ? "Update comment" : "Add comment"), A.disabled = q(m), Z(He, q(n).feedback.comments.length);
		}, [() => q(m) || q(a) === "current" || q(a) === "preview" || !q(u).trim() || !q(s) && !q(d)]), J("change", g, (e) => {
			ie(Number(e.currentTarget.value)), e.currentTarget.value = String(q(r));
		}), J("change", C, () => {
			P(s, null), P(c, P(l, 1), !0);
		}), qr(C, () => q(i), (e) => P(i, e)), J("click", w, () => P(a, "source")), J("click", ge, async () => {
			await re(), P(a, q(a) === "current" ? "source" : "current", !0);
		}), J("mouseup", xe, se), J("keyup", xe, () => se()), ur("submit", Ee, (e) => {
			e.preventDefault(), ce();
		}), J("change", ke, oe), ri(ke, () => q(c), (e) => P(c, e)), J("change", je, oe), ri(je, () => q(l), (e) => P(l, e)), J("click", Me, oe), ri(Le, () => q(u), (e) => P(u, e)), J("click", A, () => {
			P(u, ""), P(d, null), P(s, null);
		}), X(e, t);
	}, xe = (e) => {
		var t = Ni(), n = R(t, !0);
		B(() => Z(n, q(p) || "Loading the local review session…")), X(e, t);
	};
	Q(be, (e) => {
		q(n) && q(y) && q(b) ? e(E) : e(xe, -1);
	}), B(() => Z(ye, q(p) || "Select source text or line numbers, write a comment, then save feedback.")), X(e, me), He();
}
//#endregion
//#region src/main.ts
dr([
	"click",
	"change",
	"mouseup",
	"keyup"
]), wr(Fi, { target: document.getElementById("app") });
//#endregion

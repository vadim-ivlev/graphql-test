
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
	'use strict';

	function noop() {}

	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	function run_all(fns) {
		fns.forEach(run);
	}

	function is_function(thing) {
		return typeof thing === 'function';
	}

	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}

	function append(target, node) {
		target.appendChild(node);
	}

	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	function detach(node) {
		node.parentNode.removeChild(node);
	}

	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	function element(name) {
		return document.createElement(name);
	}

	function text(data) {
		return document.createTextNode(data);
	}

	function space() {
		return text(' ');
	}

	function empty() {
		return text('');
	}

	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	function prevent_default(fn) {
		return function(event) {
			event.preventDefault();
			return fn.call(this, event);
		};
	}

	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else node.setAttribute(attribute, value);
	}

	function children(element) {
		return Array.from(element.childNodes);
	}

	function set_data(text, data) {
		data = '' + data;
		if (text.data !== data) text.data = data;
	}

	function set_style(node, key, value) {
		node.style.setProperty(key, value);
	}

	function toggle_class(element, name, toggle) {
		element.classList[toggle ? 'add' : 'remove'](name);
	}

	function custom_event(type, detail) {
		const e = document.createEvent('CustomEvent');
		e.initCustomEvent(type, false, false, detail);
		return e;
	}

	let current_component;

	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error(`Function called outside component initialization`);
		return current_component;
	}

	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	function afterUpdate(fn) {
		get_current_component().$$.after_render.push(fn);
	}

	function createEventDispatcher() {
		const component = current_component;

		return (type, detail) => {
			const callbacks = component.$$.callbacks[type];

			if (callbacks) {
				// TODO are there situations where events could be dispatched
				// in a server (non-DOM) environment?
				const event = custom_event(type, detail);
				callbacks.slice().forEach(fn => {
					fn.call(component, event);
				});
			}
		};
	}

	// TODO figure out if we still want to support
	// shorthand events, or if we want to implement
	// a real bubbling mechanism
	function bubble(component, event) {
		const callbacks = component.$$.callbacks[event.type];

		if (callbacks) {
			callbacks.slice().forEach(fn => fn(event));
		}
	}

	const dirty_components = [];

	const resolved_promise = Promise.resolve();
	let update_scheduled = false;
	const binding_callbacks = [];
	const render_callbacks = [];
	const flush_callbacks = [];

	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	function add_binding_callback(fn) {
		binding_callbacks.push(fn);
	}

	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	function add_flush_callback(fn) {
		flush_callbacks.push(fn);
	}

	function flush() {
		const seen_callbacks = new Set();

		do {
			// first, call beforeUpdate functions
			// and update components
			while (dirty_components.length) {
				const component = dirty_components.shift();
				set_current_component(component);
				update(component.$$);
			}

			while (binding_callbacks.length) binding_callbacks.shift()();

			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			while (render_callbacks.length) {
				const callback = render_callbacks.pop();
				if (!seen_callbacks.has(callback)) {
					callback();

					// ...so guard against infinite loops
					seen_callbacks.add(callback);
				}
			}
		} while (dirty_components.length);

		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}

		update_scheduled = false;
	}

	function update($$) {
		if ($$.fragment) {
			$$.update($$.dirty);
			run_all($$.before_render);
			$$.fragment.p($$.dirty, $$.ctx);
			$$.dirty = null;

			$$.after_render.forEach(add_render_callback);
		}
	}

	let outros;

	function group_outros() {
		outros = {
			remaining: 0,
			callbacks: []
		};
	}

	function check_outros() {
		if (!outros.remaining) {
			run_all(outros.callbacks);
		}
	}

	function on_outro(callback) {
		outros.callbacks.push(callback);
	}

	function destroy_block(block, lookup) {
		block.d(1);
		lookup.delete(block.key);
	}

	function outro_and_destroy_block(block, lookup) {
		on_outro(() => {
			destroy_block(block, lookup);
		});

		block.o(1);
	}

	function update_keyed_each(old_blocks, changed, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
		let o = old_blocks.length;
		let n = list.length;

		let i = o;
		const old_indexes = {};
		while (i--) old_indexes[old_blocks[i].key] = i;

		const new_blocks = [];
		const new_lookup = new Map();
		const deltas = new Map();

		i = n;
		while (i--) {
			const child_ctx = get_context(ctx, list, i);
			const key = get_key(child_ctx);
			let block = lookup.get(key);

			if (!block) {
				block = create_each_block(key, child_ctx);
				block.c();
			} else if (dynamic) {
				block.p(changed, child_ctx);
			}

			new_lookup.set(key, new_blocks[i] = block);

			if (key in old_indexes) deltas.set(key, Math.abs(i - old_indexes[key]));
		}

		const will_move = new Set();
		const did_move = new Set();

		function insert(block) {
			if (block.i) block.i(1);
			block.m(node, next);
			lookup.set(block.key, block);
			next = block.first;
			n--;
		}

		while (o && n) {
			const new_block = new_blocks[n - 1];
			const old_block = old_blocks[o - 1];
			const new_key = new_block.key;
			const old_key = old_block.key;

			if (new_block === old_block) {
				// do nothing
				next = new_block.first;
				o--;
				n--;
			}

			else if (!new_lookup.has(old_key)) {
				// remove old block
				destroy(old_block, lookup);
				o--;
			}

			else if (!lookup.has(new_key) || will_move.has(new_key)) {
				insert(new_block);
			}

			else if (did_move.has(old_key)) {
				o--;

			} else if (deltas.get(new_key) > deltas.get(old_key)) {
				did_move.add(new_key);
				insert(new_block);

			} else {
				will_move.add(old_key);
				o--;
			}
		}

		while (o--) {
			const old_block = old_blocks[o];
			if (!new_lookup.has(old_block.key)) destroy(old_block, lookup);
		}

		while (n) insert(new_blocks[n - 1]);

		return new_blocks;
	}

	function bind(component, name, callback) {
		if (component.$$.props.indexOf(name) === -1) return;
		component.$$.bound[name] = callback;
		callback(component.$$.ctx[name]);
	}

	function mount_component(component, target, anchor) {
		const { fragment, on_mount, on_destroy, after_render } = component.$$;

		fragment.m(target, anchor);

		// onMount happens after the initial afterUpdate. Because
		// afterUpdate callbacks happen in reverse order (inner first)
		// we schedule onMount callbacks before afterUpdate callbacks
		add_render_callback(() => {
			const new_on_destroy = on_mount.map(run).filter(is_function);
			if (on_destroy) {
				on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});

		after_render.forEach(add_render_callback);
	}

	function destroy(component, detaching) {
		if (component.$$) {
			run_all(component.$$.on_destroy);
			component.$$.fragment.d(detaching);

			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			component.$$.on_destroy = component.$$.fragment = null;
			component.$$.ctx = {};
		}
	}

	function make_dirty(component, key) {
		if (!component.$$.dirty) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty = blank_object();
		}
		component.$$.dirty[key] = true;
	}

	function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
		const parent_component = current_component;
		set_current_component(component);

		const props = options.props || {};

		const $$ = component.$$ = {
			fragment: null,
			ctx: null,

			// state
			props: prop_names,
			update: noop,
			not_equal: not_equal$$1,
			bound: blank_object(),

			// lifecycle
			on_mount: [],
			on_destroy: [],
			before_render: [],
			after_render: [],
			context: new Map(parent_component ? parent_component.$$.context : []),

			// everything else
			callbacks: blank_object(),
			dirty: null
		};

		let ready = false;

		$$.ctx = instance
			? instance(component, props, (key, value) => {
				if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
					if ($$.bound[key]) $$.bound[key](value);
					if (ready) make_dirty(component, key);
				}
			})
			: props;

		$$.update();
		ready = true;
		run_all($$.before_render);
		$$.fragment = create_fragment($$.ctx);

		if (options.target) {
			if (options.hydrate) {
				$$.fragment.l(children(options.target));
			} else {
				$$.fragment.c();
			}

			if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
			mount_component(component, options.target, options.anchor);
			flush();
		}

		set_current_component(parent_component);
	}

	class SvelteComponent {
		$destroy() {
			destroy(this, true);
			this.$destroy = noop;
		}

		$on(type, callback) {
			const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
			callbacks.push(callback);

			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		$set() {
			// overridden by instance, if it has props
		}
	}

	class SvelteComponentDev extends SvelteComponent {
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error(`'target' is a required option`);
			}

			super();
		}

		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn(`Component was already destroyed`); // eslint-disable-line no-console
			};
		}
	}

	const queryString = `
query IntrospectionQuery {
    __schema {
      queryType {
        ...FullType
      }
      mutationType {
        ...FullType
      }
      subscriptionType {
        name
      }
      types {
        ...FullType
      }
      directives {
        name
        description
        locations
        args {
          ...InputValue
        }
      }
    }
  }
  
  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args {
        ...InputValue
      }
      type {
        ...TypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: true) {
      name
      description
      isDeprecated
      deprecationReason
    }
    possibleTypes {
      ...TypeRef
    }
  }
  
  fragment InputValue on __InputValue {
    name
    description
    type {
      ...TypeRef
    }
    defaultValue
  }
  
  fragment TypeRef on __Type {
    kind
    name
    description
    ofType {
      kind
      name
      description
      ofType {
        kind
        name
        description
        ofType {
          kind
          name
          description
          ofType {
            kind
            name
            description
            ofType {
              kind
              name
              description
              ofType {
                kind
                name
                description
                ofType {
                  kind
                  name
                  description
                }
              }
            }
          }
        }
      }
    }
  }
  

`;

	/* src/JsonView.svelte generated by Svelte v3.4.0 */

	const file = "src/JsonView.svelte";

	function create_fragment(ctx) {
		var div;

		return {
			c: function create() {
				div = element("div");
				div.className = "self svelte-1rj0q3e";
				add_location(div, file, 23, 0, 262);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				add_binding_callback(() => ctx.div_binding(div, null));
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.div_binding(null, div);
					ctx.div_binding(div, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				ctx.div_binding(null, div);
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let { json } = $$props;

	let elem;

		function div_binding($$node, check) {
			elem = $$node;
			$$invalidate('elem', elem);
		}

		$$self.$set = $$props => {
			if ('json' in $$props) $$invalidate('json', json = $$props.json);
		};

		$$self.$$.update = ($$dirty = { elem: 1, json: 1 }) => {
			if ($$dirty.elem || $$dirty.json) { try {
	                window.$(elem).jsonViewer(json, { collapsed: true, rootCollapsable: false });
	            } catch (error) {} }
		};

		return { json, elem, div_binding };
	}

	class JsonView extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, ["json"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.json === undefined && !('json' in props)) {
				console.warn("<JsonView> was created without expected prop 'json'");
			}
		}

		get json() {
			throw new Error("<JsonView>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set json(value) {
			throw new Error("<JsonView>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/schemer/schemer.svelte generated by Svelte v3.4.0 */

	const file$1 = "src/schemer/schemer.svelte";

	// (60:4) {#if Object.entries(scheme).length != 0 }
	function create_if_block_1(ctx) {
		var a, t0_value = ctx.visible?'Hide':'Show', t0, t1, dispose;

		return {
			c: function create() {
				a = element("a");
				t0 = text(t0_value);
				t1 = text(" scheme");
				a.href = true;
				add_location(a, file$1, 60, 4, 1564);
				dispose = listen(a, "click", prevent_default(ctx.click_handler));
			},

			m: function mount(target, anchor) {
				insert(target, a, anchor);
				append(a, t0);
				append(a, t1);
			},

			p: function update(changed, ctx) {
				if ((changed.visible) && t0_value !== (t0_value = ctx.visible?'Hide':'Show')) {
					set_data(t0, t0_value);
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(a);
				}

				dispose();
			}
		};
	}

	// (64:2) {#if visible}
	function create_if_block(ctx) {
		var current;

		var jsonview = new JsonView({
			props: { json: ctx.scheme },
			$$inline: true
		});

		return {
			c: function create() {
				jsonview.$$.fragment.c();
			},

			m: function mount(target, anchor) {
				mount_component(jsonview, target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var jsonview_changes = {};
				if (changed.scheme) jsonview_changes.json = ctx.scheme;
				jsonview.$set(jsonview_changes);
			},

			i: function intro(local) {
				if (current) return;
				jsonview.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				jsonview.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				jsonview.$destroy(detaching);
			}
		};
	}

	function create_fragment$1(ctx) {
		var div, form, input0, input0_id_value, t0, label, t1, label_for_value, t2, input1, input1_id_value, input1_name_value, t3, input2, t4, t5, current, dispose;

		var if_block0 = (Object.entries(ctx.scheme).length != 0) && create_if_block_1(ctx);

		var if_block1 = (ctx.visible) && create_if_block(ctx);

		return {
			c: function create() {
				div = element("div");
				form = element("form");
				input0 = element("input");
				t0 = space();
				label = element("label");
				t1 = text("GraphQL url");
				t2 = space();
				input1 = element("input");
				t3 = space();
				input2 = element("input");
				t4 = space();
				if (if_block0) if_block0.c();
				t5 = space();
				if (if_block1) if_block1.c();
				input0.className = "post svelte-i19gg6";
				attr(input0, "type", "text");
				input0.id = input0_id_value = "id-" + ctx.parentid + "-inp-method";
				input0.value = "POST";
				add_location(input0, file$1, 54, 4, 1069);
				label.htmlFor = label_for_value = "id-" + ctx.parentid + "-inp-url";
				add_location(label, file$1, 55, 4, 1175);
				input1.className = "text svelte-i19gg6";
				attr(input1, "type", "text");
				input1.id = input1_id_value = "id-" + ctx.parentid + "-inp-url";
				input1.name = input1_name_value = "id-" + ctx.parentid + "-inp-url";
				add_location(input1, file$1, 56, 4, 1234);
				attr(input2, "type", "button");
				input2.value = "refresh";
				input2.className = "svelte-i19gg6";
				add_location(input2, file$1, 58, 4, 1453);
				add_location(form, file$1, 53, 2, 1058);
				div.className = "self svelte-i19gg6";
				add_location(div, file$1, 52, 0, 1037);

				dispose = [
					listen(input1, "input", ctx.input1_input_handler),
					listen(input1, "change", ctx.change_handler),
					listen(input2, "click", ctx.getScheme)
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, form);
				append(form, input0);
				add_binding_callback(() => ctx.input0_binding(input0, null));
				append(form, t0);
				append(form, label);
				append(label, t1);
				append(form, t2);
				append(form, input1);

				input1.value = ctx.url;

				add_binding_callback(() => ctx.input1_binding(input1, null));
				append(form, t3);
				append(form, input2);
				append(form, t4);
				if (if_block0) if_block0.m(form, null);
				append(div, t5);
				if (if_block1) if_block1.m(div, null);
				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.input0_binding(null, input0);
					ctx.input0_binding(input0, null);
				}

				if ((!current || changed.parentid) && input0_id_value !== (input0_id_value = "id-" + ctx.parentid + "-inp-method")) {
					input0.id = input0_id_value;
				}

				if ((!current || changed.parentid) && label_for_value !== (label_for_value = "id-" + ctx.parentid + "-inp-url")) {
					label.htmlFor = label_for_value;
				}

				if (changed.url && (input1.value !== ctx.url)) input1.value = ctx.url;
				if (changed.items) {
					ctx.input1_binding(null, input1);
					ctx.input1_binding(input1, null);
				}

				if ((!current || changed.parentid) && input1_id_value !== (input1_id_value = "id-" + ctx.parentid + "-inp-url")) {
					input1.id = input1_id_value;
				}

				if ((!current || changed.parentid) && input1_name_value !== (input1_name_value = "id-" + ctx.parentid + "-inp-url")) {
					input1.name = input1_name_value;
				}

				if (Object.entries(ctx.scheme).length != 0) {
					if (if_block0) {
						if_block0.p(changed, ctx);
					} else {
						if_block0 = create_if_block_1(ctx);
						if_block0.c();
						if_block0.m(form, null);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (ctx.visible) {
					if (if_block1) {
						if_block1.p(changed, ctx);
						if_block1.i(1);
					} else {
						if_block1 = create_if_block(ctx);
						if_block1.c();
						if_block1.i(1);
						if_block1.m(div, null);
					}
				} else if (if_block1) {
					group_outros();
					on_outro(() => {
						if_block1.d(1);
						if_block1 = null;
					});

					if_block1.o(1);
					check_outros();
				}
			},

			i: function intro(local) {
				if (current) return;
				if (if_block1) if_block1.i();
				current = true;
			},

			o: function outro(local) {
				if (if_block1) if_block1.o();
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				ctx.input0_binding(null, input0);
				ctx.input1_binding(null, input1);
				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				run_all(dispose);
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		

	let { url = "http://localhost:7700/graphql", scheme = {}, parentid ='', refreshScheme = getScheme } = $$props;

	let visible = false;
	let urlElement; 
	let methodElement; 

	async function getScheme() {
	    $$invalidate('scheme', scheme = {});    
	    // scheme =  await $.ajax({ url: inputUrl.value, type: "POST", data: { query:queryString, variables: '{}'},});
	    let resp = await fetch(urlElement.value, { method: methodElement.value, body: JSON.stringify({ query: queryString, variables: "{}" }) });
	    $$invalidate('scheme', scheme = await resp.json());
	}

	// function clearScheme() {
	//     scheme = {}     
	// }


	onMount(async () => {
	    // getScheme()
	});

		function change_handler(event) {
			bubble($$self, event);
		}

		function input0_binding($$node, check) {
			methodElement = $$node;
			$$invalidate('methodElement', methodElement);
		}

		function input1_input_handler() {
			url = this.value;
			$$invalidate('url', url);
		}

		function input1_binding($$node, check) {
			urlElement = $$node;
			$$invalidate('urlElement', urlElement);
		}

		function click_handler(e) {visible = ! visible; $$invalidate('visible', visible);}

		$$self.$set = $$props => {
			if ('url' in $$props) $$invalidate('url', url = $$props.url);
			if ('scheme' in $$props) $$invalidate('scheme', scheme = $$props.scheme);
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
			if ('refreshScheme' in $$props) $$invalidate('refreshScheme', refreshScheme = $$props.refreshScheme);
		};

		return {
			url,
			scheme,
			parentid,
			refreshScheme,
			visible,
			urlElement,
			methodElement,
			getScheme,
			change_handler,
			input0_binding,
			input1_input_handler,
			input1_binding,
			click_handler
		};
	}

	class Schemer extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, ["url", "scheme", "parentid", "refreshScheme"]);
		}

		get url() {
			throw new Error("<Schemer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set url(value) {
			throw new Error("<Schemer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get scheme() {
			throw new Error("<Schemer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set scheme(value) {
			throw new Error("<Schemer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get parentid() {
			throw new Error("<Schemer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set parentid(value) {
			throw new Error("<Schemer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get refreshScheme() {
			throw new Error("<Schemer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set refreshScheme(value) {
			throw new Error("<Schemer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/Argument.svelte generated by Svelte v3.4.0 */

	const file$2 = "src/Argument.svelte";

	function create_fragment$2(ctx) {
		var div, input0, input0_id_value, input0_disabled_value, t0, span0, t1_value = ctx.node.name, t1, span0_class_value, t2, input1, input1_id_value, input1_name_value, input1_disabled_value, input1_placeholder_value, t3, span2, t4, t5, span1, t6_value = ctx.node.type.kind=='NON_NULL'?' !':'', t6, span2_class_value, t7, br, span3, t8_value = ctx.node.description, t8, span3_class_value, dispose;

		return {
			c: function create() {
				div = element("div");
				input0 = element("input");
				t0 = space();
				span0 = element("span");
				t1 = text(t1_value);
				t2 = space();
				input1 = element("input");
				t3 = space();
				span2 = element("span");
				t4 = text(ctx.graphqlType);
				t5 = space();
				span1 = element("span");
				t6 = text(t6_value);
				t7 = space();
				br = element("br");
				span3 = element("span");
				t8 = text(t8_value);
				input0.id = input0_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-checkbox";
				attr(input0, "type", "checkbox");
				input0.disabled = input0_disabled_value = ctx.node.type.kind=='NON_NULL';
				input0.className = "svelte-17mekll";
				add_location(input0, file$2, 94, 4, 1778);
				span0.className = span0_class_value = "argname " + (ctx.checked?'':'disabled') + " svelte-17mekll";
				add_location(span0, file$2, 95, 4, 1944);
				input1.id = input1_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-input";
				input1.className = "input svelte-17mekll";
				input1.name = input1_name_value = ctx.node.name;
				input1.disabled = input1_disabled_value = !ctx.checked;
				input1.placeholder = input1_placeholder_value = ctx.value==''?'':null;
				add_location(input1, file$2, 96, 4, 2013);
				span1.className = "exclamation svelte-17mekll";
				add_location(span1, file$2, 98, 4, 2262);
				span2.className = span2_class_value = "oftype " + (ctx.checked?'':'disabled') + " svelte-17mekll";
				add_location(span2, file$2, 97, 4, 2199);
				add_location(br, file$2, 101, 4, 2354);
				span3.className = span3_class_value = "description " + (ctx.checked?'':'disabled') + " svelte-17mekll";
				add_location(span3, file$2, 101, 8, 2358);
				div.className = "field svelte-17mekll";
				add_location(div, file$2, 93, 0, 1751);

				dispose = [
					listen(input0, "change", ctx.input0_change_handler),
					listen(input0, "change", ctx.change_handler),
					listen(input1, "input", ctx.input1_input_handler),
					listen(input1, "change", ctx.change_handler_1)
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, input0);

				input0.checked = ctx.checked;

				add_binding_callback(() => ctx.input0_binding(input0, null));
				append(div, t0);
				append(div, span0);
				append(span0, t1);
				append(div, t2);
				append(div, input1);

				input1.value = ctx.value;

				add_binding_callback(() => ctx.input1_binding(input1, null));
				append(div, t3);
				append(div, span2);
				append(span2, t4);
				append(span2, t5);
				append(span2, span1);
				append(span1, t6);
				append(div, t7);
				append(div, br);
				append(div, span3);
				append(span3, t8);
			},

			p: function update(changed, ctx) {
				if (changed.checked) input0.checked = ctx.checked;
				if (changed.items) {
					ctx.input0_binding(null, input0);
					ctx.input0_binding(input0, null);
				}

				if ((changed.parentid || changed.node) && input0_id_value !== (input0_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-checkbox")) {
					input0.id = input0_id_value;
				}

				if ((changed.node) && input0_disabled_value !== (input0_disabled_value = ctx.node.type.kind=='NON_NULL')) {
					input0.disabled = input0_disabled_value;
				}

				if ((changed.node) && t1_value !== (t1_value = ctx.node.name)) {
					set_data(t1, t1_value);
				}

				if ((changed.checked) && span0_class_value !== (span0_class_value = "argname " + (ctx.checked?'':'disabled') + " svelte-17mekll")) {
					span0.className = span0_class_value;
				}

				if (changed.value && (input1.value !== ctx.value)) input1.value = ctx.value;
				if (changed.items) {
					ctx.input1_binding(null, input1);
					ctx.input1_binding(input1, null);
				}

				if ((changed.parentid || changed.node) && input1_id_value !== (input1_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-input")) {
					input1.id = input1_id_value;
				}

				if ((changed.node) && input1_name_value !== (input1_name_value = ctx.node.name)) {
					input1.name = input1_name_value;
				}

				if ((changed.checked) && input1_disabled_value !== (input1_disabled_value = !ctx.checked)) {
					input1.disabled = input1_disabled_value;
				}

				if ((changed.value) && input1_placeholder_value !== (input1_placeholder_value = ctx.value==''?'':null)) {
					input1.placeholder = input1_placeholder_value;
				}

				if ((changed.node) && t6_value !== (t6_value = ctx.node.type.kind=='NON_NULL'?' !':'')) {
					set_data(t6, t6_value);
				}

				if ((changed.checked) && span2_class_value !== (span2_class_value = "oftype " + (ctx.checked?'':'disabled') + " svelte-17mekll")) {
					span2.className = span2_class_value;
				}

				if ((changed.node) && t8_value !== (t8_value = ctx.node.description)) {
					set_data(t8, t8_value);
				}

				if ((changed.checked) && span3_class_value !== (span3_class_value = "description " + (ctx.checked?'':'disabled') + " svelte-17mekll")) {
					span3.className = span3_class_value;
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				ctx.input0_binding(null, input0);
				ctx.input1_binding(null, input1);
				run_all(dispose);
			}
		};
	}

	function instance$2($$self, $$props, $$invalidate) {
		// P R O P S
	let { parentid = '', node = {}, getText = function() {
	    if (!checkboxElement.checked) return ''
	    let value = inputElement.value;
	    if (inputType == 'text'){
	      value = `"${value.replace(/"/g,'\\"')}"`; 
	    }
	   return `${node.name}: ${value}`
	} } = $$props;

	// if (node.checked === undefined)     node.checked = true
	// if (node.graphqlType === undefined) node.graphqlType = node.type.name || node.type.ofType.name
	// if (node.value === undefined)       node.value = node.defaultValue ||  (node.graphqlType=='Int'? 0 : node.name.replace(/_/g,' '))

	let checked = true;
	let graphqlType = node.type.name || node.type.ofType.name;
	let value = node.defaultValue ||  (graphqlType=='Int'? 0 : node.name.replace(/_/g,' '));



	let checkboxElement;
	let inputElement;
	let inputType = graphqlType=='Int'?'number':'text';



	onMount(async () => {
	    inputElement.setAttribute('type', inputType);
	});

		function change_handler(event) {
			bubble($$self, event);
		}

		function change_handler_1(event) {
			bubble($$self, event);
		}

		function input0_change_handler() {
			checked = this.checked;
			$$invalidate('checked', checked);
		}

		function input0_binding($$node, check) {
			checkboxElement = $$node;
			$$invalidate('checkboxElement', checkboxElement);
		}

		function input1_input_handler() {
			value = this.value;
			$$invalidate('value', value);
		}

		function input1_binding($$node, check) {
			inputElement = $$node;
			$$invalidate('inputElement', inputElement);
		}

		$$self.$set = $$props => {
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
			if ('node' in $$props) $$invalidate('node', node = $$props.node);
			if ('getText' in $$props) $$invalidate('getText', getText = $$props.getText);
		};

		return {
			parentid,
			node,
			getText,
			checked,
			graphqlType,
			value,
			checkboxElement,
			inputElement,
			change_handler,
			change_handler_1,
			input0_change_handler,
			input0_binding,
			input1_input_handler,
			input1_binding
		};
	}

	class Argument extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$2, create_fragment$2, safe_not_equal, ["parentid", "node", "getText"]);
		}

		get parentid() {
			throw new Error("<Argument>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set parentid(value) {
			throw new Error("<Argument>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get node() {
			throw new Error("<Argument>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set node(value) {
			throw new Error("<Argument>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get getText() {
			throw new Error("<Argument>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set getText(value) {
			throw new Error("<Argument>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/TypeField.svelte generated by Svelte v3.4.0 */

	const file$3 = "src/TypeField.svelte";

	// (47:4) {#if showCheckbox}
	function create_if_block$1(ctx) {
		var input, input_id_value, dispose;

		return {
			c: function create() {
				input = element("input");
				attr(input, "type", "checkbox");
				input.checked = true;
				input.id = input_id_value = "" + ctx.parentid + "-" + ctx.fieldName;
				input.className = "svelte-1y7pqhv";
				add_location(input, file$3, 47, 8, 846);
				dispose = listen(input, "change", ctx.change_handler);
			},

			m: function mount(target, anchor) {
				insert(target, input, anchor);
				add_binding_callback(() => ctx.input_binding(input, null));
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.input_binding(null, input);
					ctx.input_binding(input, null);
				}

				if ((changed.parentid) && input_id_value !== (input_id_value = "" + ctx.parentid + "-" + ctx.fieldName)) {
					input.id = input_id_value;
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(input);
				}

				ctx.input_binding(null, input);
				dispose();
			}
		};
	}

	function create_fragment$3(ctx) {
		var div, t0, span0, t1, t2, updating_getText, t3, br, span1, t4_value = ctx.node.description, t4, current;

		var if_block = (ctx.showCheckbox) && create_if_block$1(ctx);

		function type_getText_binding(value) {
			ctx.type_getText_binding.call(null, value);
			updating_getText = true;
			add_flush_callback(() => updating_getText = false);
		}

		let type_props = {
			scheme: ctx.scheme,
			typeName: ctx.typeName,
			parentid: "" + ctx.parentid + "-" + ctx.fieldName + "-type"
		};
		if (ctx.getTypeText !== void 0) {
			type_props.getText = ctx.getTypeText;
		}
		var type = new Type({ props: type_props, $$inline: true });

		add_binding_callback(() => bind(type, 'getText', type_getText_binding));
		type.$on("change", ctx.change_handler_1);

		return {
			c: function create() {
				div = element("div");
				if (if_block) if_block.c();
				t0 = space();
				span0 = element("span");
				t1 = text(ctx.fieldName);
				t2 = space();
				type.$$.fragment.c();
				t3 = space();
				br = element("br");
				span1 = element("span");
				t4 = text(t4_value);
				span0.className = "field-name svelte-1y7pqhv";
				add_location(span0, file$3, 49, 4, 959);
				br.className = "svelte-1y7pqhv";
				add_location(br, file$3, 51, 4, 1134);
				span1.className = "field-description svelte-1y7pqhv";
				add_location(span1, file$3, 51, 8, 1138);
				div.className = "field svelte-1y7pqhv";
				add_location(div, file$3, 45, 0, 793);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				if (if_block) if_block.m(div, null);
				append(div, t0);
				append(div, span0);
				append(span0, t1);
				append(div, t2);
				mount_component(type, div, null);
				append(div, t3);
				append(div, br);
				append(div, span1);
				append(span1, t4);
				current = true;
			},

			p: function update(changed, ctx) {
				if (ctx.showCheckbox) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block$1(ctx);
						if_block.c();
						if_block.m(div, t0);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				var type_changes = {};
				if (changed.scheme) type_changes.scheme = ctx.scheme;
				if (changed.typeName) type_changes.typeName = ctx.typeName;
				if (changed.parentid || changed.fieldName) type_changes.parentid = "" + ctx.parentid + "-" + ctx.fieldName + "-type";
				if (!updating_getText && changed.getTypeText) {
					type_changes.getText = ctx.getTypeText;
				}
				type.$set(type_changes);

				if ((!current || changed.node) && t4_value !== (t4_value = ctx.node.description)) {
					set_data(t4, t4_value);
				}
			},

			i: function intro(local) {
				if (current) return;
				type.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				type.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				if (if_block) if_block.d();

				type.$destroy();
			}
		};
	}

	function instance$3($$self, $$props, $$invalidate) {
		let { parentid = '', scheme, node, showCheckbox = true, getText = function(e){
	    if (! checkboxElement) return ''
	    if (checkboxElement.checked == false) return ''
	    let value = fieldName + getTypeText();
	    return value
	} } = $$props;


	let fieldName = node.name;
	let typeName = node.type.kind == "LIST" ? node.type.ofType.name : node.type.name;
	let getTypeText;
	let checkboxElement;

		function change_handler(event) {
			bubble($$self, event);
		}

		function change_handler_1(event) {
			bubble($$self, event);
		}

		function input_binding($$node, check) {
			checkboxElement = $$node;
			$$invalidate('checkboxElement', checkboxElement);
		}

		function type_getText_binding(value) {
			getTypeText = value;
			$$invalidate('getTypeText', getTypeText);
		}

		$$self.$set = $$props => {
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
			if ('scheme' in $$props) $$invalidate('scheme', scheme = $$props.scheme);
			if ('node' in $$props) $$invalidate('node', node = $$props.node);
			if ('showCheckbox' in $$props) $$invalidate('showCheckbox', showCheckbox = $$props.showCheckbox);
			if ('getText' in $$props) $$invalidate('getText', getText = $$props.getText);
		};

		return {
			parentid,
			scheme,
			node,
			showCheckbox,
			getText,
			fieldName,
			typeName,
			getTypeText,
			checkboxElement,
			change_handler,
			change_handler_1,
			input_binding,
			type_getText_binding
		};
	}

	class TypeField extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$3, create_fragment$3, safe_not_equal, ["parentid", "scheme", "node", "showCheckbox", "getText"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.scheme === undefined && !('scheme' in props)) {
				console.warn("<TypeField> was created without expected prop 'scheme'");
			}
			if (ctx.node === undefined && !('node' in props)) {
				console.warn("<TypeField> was created without expected prop 'node'");
			}
		}

		get parentid() {
			throw new Error("<TypeField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set parentid(value) {
			throw new Error("<TypeField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get scheme() {
			throw new Error("<TypeField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set scheme(value) {
			throw new Error("<TypeField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get node() {
			throw new Error("<TypeField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set node(value) {
			throw new Error("<TypeField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get showCheckbox() {
			throw new Error("<TypeField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set showCheckbox(value) {
			throw new Error("<TypeField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get getText() {
			throw new Error("<TypeField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set getText(value) {
			throw new Error("<TypeField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/Type.svelte generated by Svelte v3.4.0 */

	const file$4 = "src/Type.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.f = list[i];
		child_ctx.ind = i;
		return child_ctx;
	}

	// (105:0) {#if node}
	function create_if_block$2(ctx) {
		var div, current_block_type_index, if_block, current;

		var if_block_creators = [
			create_if_block_1$1,
			create_else_block
		];

		var if_blocks = [];

		function select_block_type(ctx) {
			if (ctx.node.kind=="SCALAR") return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c: function create() {
				div = element("div");
				if_block.c();
				div.className = "self svelte-s94tpu";
				add_location(div, file$4, 105, 0, 1879);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				if_blocks[current_block_type_index].m(div, null);
				current = true;
			},

			p: function update(changed, ctx) {
				var previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);
				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(changed, ctx);
				} else {
					group_outros();
					on_outro(() => {
						if_blocks[previous_block_index].d(1);
						if_blocks[previous_block_index] = null;
					});
					if_block.o(1);
					check_outros();

					if_block = if_blocks[current_block_type_index];
					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					}
					if_block.i(1);
					if_block.m(div, null);
				}
			},

			i: function intro(local) {
				if (current) return;
				if (if_block) if_block.i();
				current = true;
			},

			o: function outro(local) {
				if (if_block) if_block.o();
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				if_blocks[current_block_type_index].d();
			}
		};
	}

	// (109:4) {:else}
	function create_else_block(ctx) {
		var a, t0, a_class_value, t1, div, span, t2_value = ctx.node.description, t2, t3, current, dispose;

		var if_block = (ctx.node.fields) && create_if_block_2(ctx);

		return {
			c: function create() {
				a = element("a");
				t0 = text(ctx.typeName);
				t1 = space();
				div = element("div");
				span = element("span");
				t2 = text(t2_value);
				t3 = space();
				if (if_block) if_block.c();
				a.className = a_class_value = "" + (ctx.vis?'opened':'closed') + " svelte-s94tpu";
				a.href = true;
				add_location(a, file$4, 109, 8, 2001);
				span.className = "description svelte-s94tpu";
				add_location(span, file$4, 111, 16, 2183);
				div.className = "frame svelte-s94tpu";
				set_style(div, "display", (ctx.vis?'block':'none'));
				add_location(div, file$4, 110, 12, 2110);
				dispose = listen(a, "click", prevent_default(ctx.click_handler));
			},

			m: function mount(target, anchor) {
				insert(target, a, anchor);
				append(a, t0);
				insert(target, t1, anchor);
				insert(target, div, anchor);
				append(div, span);
				append(span, t2);
				append(div, t3);
				if (if_block) if_block.m(div, null);
				current = true;
			},

			p: function update(changed, ctx) {
				if (!current || changed.typeName) {
					set_data(t0, ctx.typeName);
				}

				if ((!current || changed.vis) && a_class_value !== (a_class_value = "" + (ctx.vis?'opened':'closed') + " svelte-s94tpu")) {
					a.className = a_class_value;
				}

				if (ctx.node.fields) {
					if (if_block) {
						if_block.p(changed, ctx);
						if_block.i(1);
					} else {
						if_block = create_if_block_2(ctx);
						if_block.c();
						if_block.i(1);
						if_block.m(div, null);
					}
				} else if (if_block) {
					group_outros();
					on_outro(() => {
						if_block.d(1);
						if_block = null;
					});

					if_block.o(1);
					check_outros();
				}

				if (!current || changed.vis) {
					set_style(div, "display", (ctx.vis?'block':'none'));
				}
			},

			i: function intro(local) {
				if (current) return;
				if (if_block) if_block.i();
				current = true;
			},

			o: function outro(local) {
				if (if_block) if_block.o();
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(a);
					detach(t1);
					detach(div);
				}

				if (if_block) if_block.d();
				dispose();
			}
		};
	}

	// (107:4) {#if node.kind=="SCALAR"}
	function create_if_block_1$1(ctx) {
		var span, t;

		return {
			c: function create() {
				span = element("span");
				t = text(ctx.typeName);
				span.className = "scalar-type svelte-s94tpu";
				add_location(span, file$4, 107, 9, 1937);
			},

			m: function mount(target, anchor) {
				insert(target, span, anchor);
				append(span, t);
			},

			p: function update(changed, ctx) {
				if (changed.typeName) {
					set_data(t, ctx.typeName);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(span);
				}
			}
		};
	}

	// (113:16) {#if node.fields}
	function create_if_block_2(ctx) {
		var div, current;

		var each_value = ctx.node.fields;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		function outro_block(i, detaching, local) {
			if (each_blocks[i]) {
				if (detaching) {
					on_outro(() => {
						each_blocks[i].d(detaching);
						each_blocks[i] = null;
					});
				}

				each_blocks[i].o(local);
			}
		}

		return {
			c: function create() {
				div = element("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				div.className = "fieldlist svelte-s94tpu";
				add_location(div, file$4, 113, 20, 2289);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div, null);
				}

				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.showCheckbox || changed.scheme || changed.node || changed.parentid || changed.typeName || changed.fieldFunctions) {
					each_value = ctx.node.fields;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
							each_blocks[i].i(1);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							each_blocks[i].i(1);
							each_blocks[i].m(div, null);
						}
					}

					group_outros();
					for (; i < each_blocks.length; i += 1) outro_block(i, 1, 1);
					check_outros();
				}
			},

			i: function intro(local) {
				if (current) return;
				for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

				current = true;
			},

			o: function outro(local) {
				each_blocks = each_blocks.filter(Boolean);
				for (let i = 0; i < each_blocks.length; i += 1) outro_block(i, 0);

				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_each(each_blocks, detaching);
			}
		};
	}

	// (115:20) {#each node.fields as f,ind}
	function create_each_block(ctx) {
		var updating_getText, current;

		function typefield_getText_binding(value) {
			ctx.typefield_getText_binding.call(null, value, ctx);
			updating_getText = true;
			add_flush_callback(() => updating_getText = false);
		}

		let typefield_props = {
			showCheckbox: ctx.showCheckbox,
			scheme: ctx.scheme,
			node: ctx.f,
			parentid: "" + ctx.parentid + "-" + ctx.typeName
		};
		if (ctx.fieldFunctions[ctx.f.name] !== void 0) {
			typefield_props.getText = ctx.fieldFunctions[ctx.f.name];
		}
		var typefield = new TypeField({ props: typefield_props, $$inline: true });

		add_binding_callback(() => bind(typefield, 'getText', typefield_getText_binding));
		typefield.$on("change", ctx.change_handler);

		return {
			c: function create() {
				typefield.$$.fragment.c();
			},

			m: function mount(target, anchor) {
				mount_component(typefield, target, anchor);
				current = true;
			},

			p: function update(changed, new_ctx) {
				ctx = new_ctx;
				var typefield_changes = {};
				if (changed.showCheckbox) typefield_changes.showCheckbox = ctx.showCheckbox;
				if (changed.scheme) typefield_changes.scheme = ctx.scheme;
				if (changed.node) typefield_changes.node = ctx.f;
				if (changed.parentid || changed.typeName) typefield_changes.parentid = "" + ctx.parentid + "-" + ctx.typeName;
				if (!updating_getText && changed.fieldFunctions || changed.node) {
					typefield_changes.getText = ctx.fieldFunctions[ctx.f.name];
				}
				typefield.$set(typefield_changes);
			},

			i: function intro(local) {
				if (current) return;
				typefield.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				typefield.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				typefield.$destroy(detaching);
			}
		};
	}

	function create_fragment$4(ctx) {
		var if_block_anchor, current;

		var if_block = (ctx.node) && create_if_block$2(ctx);

		return {
			c: function create() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				if (ctx.node) {
					if (if_block) {
						if_block.p(changed, ctx);
						if_block.i(1);
					} else {
						if_block = create_if_block$2(ctx);
						if_block.c();
						if_block.i(1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();
					on_outro(() => {
						if_block.d(1);
						if_block = null;
					});

					if_block.o(1);
					check_outros();
				}
			},

			i: function intro(local) {
				if (current) return;
				if (if_block) if_block.i();
				current = true;
			},

			o: function outro(local) {
				if (if_block) if_block.o();
				current = false;
			},

			d: function destroy(detaching) {
				if (if_block) if_block.d(detaching);

				if (detaching) {
					detach(if_block_anchor);
				}
			}
		};
	}

	function getNode(scheme, typeName){
	if (scheme && scheme.data && scheme.data.__schema){
	    let nodes = scheme.data.__schema.types.filter(t =>  t.name == typeName );
	    if (nodes.length > 0) {
	        return nodes[0]
	    }
	    return null
	} 
	return null
	}

	function instance$4($$self, $$props, $$invalidate) {
		


	// P R O P S
	let { parentid = '', scheme = {}, typeName = '', showCheckbox = true, getText = function () {
	    let a =[];
	    let p = '  ';

	    for (let key in fieldFunctions) {
	        let v = fieldFunctions[key]();
	        if (v) a.push( p + v );
	    }

	    if (a.length > 0) 
	        return '{\n' +a.join('\n') + '\n'+p+'}'
	    
	    return ''
	} } = $$props;

	let fieldFunctions = {};
	let node = getNode(scheme, typeName);
	let vis = false;

		function change_handler(event) {
			bubble($$self, event);
		}

		function click_handler(e) {
			const $$result = vis = !vis;
			$$invalidate('vis', vis);
			return $$result;
		}

		function typefield_getText_binding(value, { f }) {
			fieldFunctions[f.name] = value;
			$$invalidate('fieldFunctions', fieldFunctions);
		}

		$$self.$set = $$props => {
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
			if ('scheme' in $$props) $$invalidate('scheme', scheme = $$props.scheme);
			if ('typeName' in $$props) $$invalidate('typeName', typeName = $$props.typeName);
			if ('showCheckbox' in $$props) $$invalidate('showCheckbox', showCheckbox = $$props.showCheckbox);
			if ('getText' in $$props) $$invalidate('getText', getText = $$props.getText);
		};

		return {
			parentid,
			scheme,
			typeName,
			showCheckbox,
			getText,
			fieldFunctions,
			node,
			vis,
			change_handler,
			click_handler,
			typefield_getText_binding
		};
	}

	class Type extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$4, create_fragment$4, safe_not_equal, ["parentid", "scheme", "typeName", "showCheckbox", "getText"]);
		}

		get parentid() {
			throw new Error("<Type>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set parentid(value) {
			throw new Error("<Type>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get scheme() {
			throw new Error("<Type>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set scheme(value) {
			throw new Error("<Type>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get typeName() {
			throw new Error("<Type>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set typeName(value) {
			throw new Error("<Type>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get showCheckbox() {
			throw new Error("<Type>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set showCheckbox(value) {
			throw new Error("<Type>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get getText() {
			throw new Error("<Type>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set getText(value) {
			throw new Error("<Type>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/Func.svelte generated by Svelte v3.4.0 */

	const file$5 = "src/Func.svelte";

	function get_each_context$1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.arg = list[i];
		child_ctx.each_value = list;
		child_ctx.index = i;
		return child_ctx;
	}

	// (299:16) {#if node.args}
	function create_if_block$3(ctx) {
		var div0, t_1, div1, each_blocks = [], each_1_lookup = new Map(), current;

		var each_value = ctx.node.args;

		const get_key = ctx => ctx.arg.name;

		for (var i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$1(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
		}

		return {
			c: function create() {
				div0 = element("div");
				div0.textContent = "ARGUMENTS";
				t_1 = space();
				div1 = element("div");

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].c();
				div0.className = "header svelte-aqn2fq";
				add_location(div0, file$5, 299, 16, 6188);
				div1.className = "fieldlist svelte-aqn2fq";
				add_location(div1, file$5, 300, 16, 6241);
			},

			m: function mount(target, anchor) {
				insert(target, div0, anchor);
				insert(target, t_1, anchor);
				insert(target, div1, anchor);

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].m(div1, null);

				current = true;
			},

			p: function update(changed, ctx) {
				const each_value = ctx.node.args;

				group_outros();
				each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, div1, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
				check_outros();
			},

			i: function intro(local) {
				if (current) return;
				for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

				current = true;
			},

			o: function outro(local) {
				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].o();

				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div0);
					detach(t_1);
					detach(div1);
				}

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].d();
			}
		};
	}

	// (302:20) {#each node.args as arg, index (arg.name)}
	function create_each_block$1(key_1, ctx) {
		var first, updating_getText, current;

		function argument_getText_binding(value) {
			ctx.argument_getText_binding.call(null, value, ctx);
			updating_getText = true;
			add_flush_callback(() => updating_getText = false);
		}

		let argument_props = {
			node: ctx.arg,
			parentid: "" + ctx.parentid + "-" + ctx.node.name + "-argument"
		};
		if (ctx.arg.getText !== void 0) {
			argument_props.getText = ctx.arg.getText;
		}
		var argument = new Argument({ props: argument_props, $$inline: true });

		add_binding_callback(() => bind(argument, 'getText', argument_getText_binding));
		argument.$on("change", ctx.argsChangeHandler);

		return {
			key: key_1,

			first: null,

			c: function create() {
				first = empty();
				argument.$$.fragment.c();
				this.first = first;
			},

			m: function mount(target, anchor) {
				insert(target, first, anchor);
				mount_component(argument, target, anchor);
				current = true;
			},

			p: function update(changed, new_ctx) {
				ctx = new_ctx;
				var argument_changes = {};
				if (changed.node) argument_changes.node = ctx.arg;
				if (changed.parentid || changed.node) argument_changes.parentid = "" + ctx.parentid + "-" + ctx.node.name + "-argument";
				if (!updating_getText && changed.node) {
					argument_changes.getText = ctx.arg.getText;
				}
				argument.$set(argument_changes);
			},

			i: function intro(local) {
				if (current) return;
				argument.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				argument.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(first);
				}

				argument.$destroy(detaching);
			}
		};
	}

	function create_fragment$5(ctx) {
		var div19, div0, a, t0_value = ctx.node.name, t0, t1, a_class_value, t2, span0, t3, t4, span1, t5_value = ctx.node.description, t5, t6, div18, div3, t7, div2, div1, t8, t9_value = ctx.node.type.kind == "LIST" ? '[...]': '', t9, t10, input0, t11, updating_getText, t12, form_1, div5, div4, t14, textarea0, textarea0_id_value, t15, div7, div6, t17, textarea1, textarea1_id_value, t18, div9, div8, t20, input1, t21, div10, input2, t22, div17, div11, t24, div14, div12, t25, span2, t26_value = ctx.response?'':null, t26, t27, div13, t28, div16, span3, t30, textarea2, textarea2_id_value, t31, div15, input3, t32, span4, t33, t34, span5, current, dispose;

		var if_block = (ctx.node.args) && create_if_block$3(ctx);

		function type_getText_binding(value) {
			ctx.type_getText_binding.call(null, value);
			updating_getText = true;
			add_flush_callback(() => updating_getText = false);
		}

		let type_props = {
			typeName: ctx.node.type.name || ctx.node.type.ofType.name,
			scheme: ctx.scheme,
			parentid: "" + ctx.parentid + "-" + ctx.node.name
		};
		if (ctx.getTypeText !== void 0) {
			type_props.getText = ctx.getTypeText;
		}
		var type = new Type({ props: type_props, $$inline: true });

		add_binding_callback(() => bind(type, 'getText', type_getText_binding));
		type.$on("change", ctx.typeChangeHandler);

		return {
			c: function create() {
				div19 = element("div");
				div0 = element("div");
				a = element("a");
				t0 = text(t0_value);
				t1 = text("(...)");
				t2 = space();
				span0 = element("span");
				t3 = text(ctx.testResult);
				t4 = space();
				span1 = element("span");
				t5 = text(t5_value);
				t6 = space();
				div18 = element("div");
				div3 = element("div");
				if (if_block) if_block.c();
				t7 = space();
				div2 = element("div");
				div1 = element("div");
				t8 = text("RETURNS ");
				t9 = text(t9_value);
				t10 = space();
				input0 = element("input");
				t11 = space();
				type.$$.fragment.c();
				t12 = space();
				form_1 = element("form");
				div5 = element("div");
				div4 = element("div");
				div4.textContent = "QUERY";
				t14 = space();
				textarea0 = element("textarea");
				t15 = space();
				div7 = element("div");
				div6 = element("div");
				div6.textContent = "VARIABLES";
				t17 = space();
				textarea1 = element("textarea");
				t18 = space();
				div9 = element("div");
				div8 = element("div");
				div8.textContent = "FILE";
				t20 = space();
				input1 = element("input");
				t21 = space();
				div10 = element("div");
				input2 = element("input");
				t22 = space();
				div17 = element("div");
				div11 = element("div");
				div11.textContent = "RESPONSE";
				t24 = space();
				div14 = element("div");
				div12 = element("div");
				t25 = text("response = ");
				span2 = element("span");
				t26 = text(t26_value);
				t27 = space();
				div13 = element("div");
				t28 = space();
				div16 = element("div");
				span3 = element("span");
				span3.textContent = "TEST";
				t30 = space();
				textarea2 = element("textarea");
				t31 = space();
				div15 = element("div");
				input3 = element("input");
				t32 = space();
				span4 = element("span");
				t33 = text(ctx.testResult);
				t34 = space();
				span5 = element("span");
				a.className = a_class_value = "name " + (ctx.vis?'opened':'closed') + " svelte-aqn2fq";
				a.href = true;
				add_location(a, file$5, 291, 8, 5789);
				span0.className = "test-result svelte-aqn2fq";
				add_location(span0, file$5, 292, 8, 5907);
				span1.className = "description svelte-aqn2fq";
				add_location(span1, file$5, 293, 8, 5962);
				div0.className = "outer svelte-aqn2fq";
				add_location(div0, file$5, 290, 4, 5761);
				attr(input0, "type", "button");
				input0.value = "getText";
				add_location(input0, file$5, 310, 20, 6707);
				div1.className = "header svelte-aqn2fq";
				add_location(div1, file$5, 309, 20, 6617);
				add_location(div2, file$5, 308, 16, 6591);
				div3.className = "form-area svelte-aqn2fq";
				add_location(div3, file$5, 296, 8, 6094);
				div4.className = "header svelte-aqn2fq";
				add_location(div4, file$5, 319, 16, 7131);
				textarea0.id = textarea0_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-query";
				textarea0.name = "query";
				textarea0.className = "query svelte-aqn2fq";
				textarea0.value = ctx.request;
				add_location(textarea0, file$5, 320, 16, 7180);
				add_location(div5, file$5, 318, 12, 7109);
				div6.className = "header svelte-aqn2fq";
				add_location(div6, file$5, 323, 16, 7336);
				textarea1.id = textarea1_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-variables";
				textarea1.name = "variables";
				textarea1.className = "variables svelte-aqn2fq";
				add_location(textarea1, file$5, 324, 16, 7389);
				add_location(div7, file$5, 322, 12, 7314);
				div8.className = "header svelte-aqn2fq";
				add_location(div8, file$5, 327, 16, 7570);
				attr(input1, "type", "file");
				input1.name = "input-file";
				add_location(input1, file$5, 328, 16, 7617);
				add_location(div9, file$5, 326, 12, 7548);
				attr(input2, "type", "submit");
				input2.value = "TEST";
				input2.className = "svelte-aqn2fq";
				add_location(input2, file$5, 331, 16, 7724);
				div10.className = "buttons svelte-aqn2fq";
				add_location(div10, file$5, 330, 12, 7686);
				form_1.className = "svelte-aqn2fq";
				add_location(form_1, file$5, 317, 8, 7050);
				div11.className = "header svelte-aqn2fq";
				add_location(div11, file$5, 337, 12, 7845);
				span2.className = "json-literal";
				add_location(span2, file$5, 339, 32, 7952);
				add_location(div12, file$5, 339, 16, 7936);
				div13.className = "response svelte-aqn2fq";
				add_location(div13, file$5, 340, 16, 8027);
				div14.className = "response-area svelte-aqn2fq";
				add_location(div14, file$5, 338, 12, 7892);
				span3.className = "header svelte-aqn2fq";
				add_location(span3, file$5, 343, 16, 8152);
				textarea2.rows = "3";
				textarea2.id = textarea2_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-eval-text";
				textarea2.className = "eval-text svelte-aqn2fq";
				textarea2.value = "response && !response.errors";
				add_location(textarea2, file$5, 344, 16, 8201);
				attr(input3, "type", "button");
				input3.className = "try-button svelte-aqn2fq";
				input3.value = "TRY TEST";
				add_location(input3, file$5, 346, 20, 8411);
				span4.className = "eval-result svelte-aqn2fq";
				add_location(span4, file$5, 347, 20, 8509);
				span5.className = "eval-errors svelte-aqn2fq";
				add_location(span5, file$5, 348, 20, 8575);
				div15.className = "buttons2 svelte-aqn2fq";
				add_location(div15, file$5, 345, 16, 8368);
				div16.className = "eval-area svelte-aqn2fq";
				add_location(div16, file$5, 342, 12, 8112);
				div17.className = "result-panel svelte-aqn2fq";
				add_location(div17, file$5, 336, 8, 7806);
				div18.className = "root svelte-aqn2fq";
				set_style(div18, "display", (ctx.vis?'grid':'none'));
				add_location(div18, file$5, 295, 4, 6029);
				add_location(div19, file$5, 289, 0, 5751);

				dispose = [
					listen(a, "click", prevent_default(ctx.click_handler)),
					listen(input0, "click", ctx.click_handler_1),
					listen(textarea0, "change", ctx.change_handler),
					listen(textarea1, "input", ctx.textarea1_input_handler),
					listen(textarea1, "change", ctx.change_handler_1),
					listen(form_1, "submit", ctx.submitForm),
					listen(textarea2, "change", ctx.change_handler_2),
					listen(input3, "click", ctx.evaluate)
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div19, anchor);
				append(div19, div0);
				append(div0, a);
				append(a, t0);
				append(a, t1);
				append(div0, t2);
				append(div0, span0);
				append(span0, t3);
				append(div0, t4);
				append(div0, span1);
				append(span1, t5);
				append(div19, t6);
				append(div19, div18);
				append(div18, div3);
				if (if_block) if_block.m(div3, null);
				append(div3, t7);
				append(div3, div2);
				append(div2, div1);
				append(div1, t8);
				append(div1, t9);
				append(div1, t10);
				append(div1, input0);
				append(div2, t11);
				mount_component(type, div2, null);
				add_binding_callback(() => ctx.div3_binding(div3, null));
				append(div18, t12);
				append(div18, form_1);
				append(form_1, div5);
				append(div5, div4);
				append(div5, t14);
				append(div5, textarea0);
				append(form_1, t15);
				append(form_1, div7);
				append(div7, div6);
				append(div7, t17);
				append(div7, textarea1);

				textarea1.value = ctx.variables;

				append(form_1, t18);
				append(form_1, div9);
				append(div9, div8);
				append(div9, t20);
				append(div9, input1);
				append(form_1, t21);
				append(form_1, div10);
				append(div10, input2);
				add_binding_callback(() => ctx.form_1_binding(form_1, null));
				append(div18, t22);
				append(div18, div17);
				append(div17, div11);
				append(div17, t24);
				append(div17, div14);
				append(div14, div12);
				append(div12, t25);
				append(div12, span2);
				append(span2, t26);
				append(div14, t27);
				append(div14, div13);
				add_binding_callback(() => ctx.div13_binding(div13, null));
				append(div17, t28);
				append(div17, div16);
				append(div16, span3);
				append(div16, t30);
				append(div16, textarea2);
				add_binding_callback(() => ctx.textarea2_binding(textarea2, null));
				append(div16, t31);
				append(div16, div15);
				append(div15, input3);
				append(div15, t32);
				append(div15, span4);
				append(span4, t33);
				append(div15, t34);
				append(div15, span5);
				span5.innerHTML = ctx.evalErrors;
				current = true;
			},

			p: function update(changed, ctx) {
				if ((!current || changed.node) && t0_value !== (t0_value = ctx.node.name)) {
					set_data(t0, t0_value);
				}

				if ((!current || changed.vis) && a_class_value !== (a_class_value = "name " + (ctx.vis?'opened':'closed') + " svelte-aqn2fq")) {
					a.className = a_class_value;
				}

				if (!current || changed.testResult) {
					set_data(t3, ctx.testResult);
				}

				if ((!current || changed.node) && t5_value !== (t5_value = ctx.node.description)) {
					set_data(t5, t5_value);
				}

				if (ctx.node.args) {
					if (if_block) {
						if_block.p(changed, ctx);
						if_block.i(1);
					} else {
						if_block = create_if_block$3(ctx);
						if_block.c();
						if_block.i(1);
						if_block.m(div3, t7);
					}
				} else if (if_block) {
					group_outros();
					on_outro(() => {
						if_block.d(1);
						if_block = null;
					});

					if_block.o(1);
					check_outros();
				}

				if ((!current || changed.node) && t9_value !== (t9_value = ctx.node.type.kind == "LIST" ? '[...]': '')) {
					set_data(t9, t9_value);
				}

				var type_changes = {};
				if (changed.node) type_changes.typeName = ctx.node.type.name || ctx.node.type.ofType.name;
				if (changed.scheme) type_changes.scheme = ctx.scheme;
				if (changed.parentid || changed.node) type_changes.parentid = "" + ctx.parentid + "-" + ctx.node.name;
				if (!updating_getText && changed.getTypeText) {
					type_changes.getText = ctx.getTypeText;
				}
				type.$set(type_changes);

				if (changed.items) {
					ctx.div3_binding(null, div3);
					ctx.div3_binding(div3, null);
				}

				if ((!current || changed.parentid || changed.node) && textarea0_id_value !== (textarea0_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-query")) {
					textarea0.id = textarea0_id_value;
				}

				if (!current || changed.request) {
					textarea0.value = ctx.request;
				}

				if (changed.variables) textarea1.value = ctx.variables;

				if ((!current || changed.parentid || changed.node) && textarea1_id_value !== (textarea1_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-variables")) {
					textarea1.id = textarea1_id_value;
				}

				if (changed.items) {
					ctx.form_1_binding(null, form_1);
					ctx.form_1_binding(form_1, null);
				}

				if ((!current || changed.response) && t26_value !== (t26_value = ctx.response?'':null)) {
					set_data(t26, t26_value);
				}

				if (changed.items) {
					ctx.div13_binding(null, div13);
					ctx.div13_binding(div13, null);
				}
				if (changed.items) {
					ctx.textarea2_binding(null, textarea2);
					ctx.textarea2_binding(textarea2, null);
				}

				if ((!current || changed.parentid || changed.node) && textarea2_id_value !== (textarea2_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-eval-text")) {
					textarea2.id = textarea2_id_value;
				}

				if (!current || changed.testResult) {
					set_data(t33, ctx.testResult);
				}

				if (!current || changed.evalErrors) {
					span5.innerHTML = ctx.evalErrors;
				}

				if (!current || changed.vis) {
					set_style(div18, "display", (ctx.vis?'grid':'none'));
				}
			},

			i: function intro(local) {
				if (current) return;
				if (if_block) if_block.i();

				type.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				if (if_block) if_block.o();
				type.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div19);
				}

				if (if_block) if_block.d();

				type.$destroy();

				ctx.div3_binding(null, div3);
				ctx.form_1_binding(null, form_1);
				ctx.div13_binding(null, div13);
				ctx.textarea2_binding(null, textarea2);
				run_all(dispose);
			}
		};
	}

	function instance$5($$self, $$props, $$invalidate) {
		

	// P R O P S
	let { url, parentid = '', scheme = {}, node = {}, operation = "", test = submitForm } = $$props;


	let testResult ='';
	let evalErrors ='';
	let vis = false;
	// let fieldlist = ''
	// let arglist = ''
	let request; 
	let variables = '';
	let response = null;

	let responseArea;
	let evalTextarea;

	let getTypeText;


	const dispatch = createEventDispatcher();
	function dispatchEvent() {
		dispatch('change', { text: 'State changed!' });
	}

	function getArgsText() {
	    let args = [];
	    for (let arg of node.args) {
	        if (!arg.getText) continue
	        let text = arg.getText();
	        if (text) args.push(text);
	    }
	    let argsText = args.length == 0? '' : `(\n${ args.join(',\n') }\n)`;
	    return argsText
	}


	function generateQuery(){
	    let arglist = getArgsText();
	    let fieldlist =getTypeText ? getTypeText() : '';
	    $$invalidate('request', request = `${operation} {\n${node.name}${arglist}\n${fieldlist}\n}`);
	    dispatchEvent();
	}


	function argsChangeHandler() {
	    console.log("argsChangeHandler");
	    generateQuery();
	}


	function typeChangeHandler(params) {
	    console.log("typeChangeHandler");
	    generateQuery();
	}


	function submitForm(event){
	    if (event) event.preventDefault();
	    console.log("submitForm");
	    window.$(form).ajaxSubmit({
	        url: url, 
	        type: 'POST',
	        //success: function(res) {$('#result').text(JSON.stringify(res, null,'  '));}
	        success: function(res) {
	            $$invalidate('response', response = res);
	            window.$(responseArea).jsonViewer(res, {collapsed: true, rootCollapsable: false});
	            evaluate();
	            }
	    });
	    return false
	}

	function evaluate(){
	    $$invalidate('testResult', testResult = "");
	    $$invalidate('evalErrors', evalErrors = "");
	    let code = evalTextarea.value;
	    code = code.trimStart();
	    code = code.trimEnd();
	    if (code == "") {
	        $$invalidate('evalErrors', evalErrors = `<br>// Write some code to evaluate server response.<br>// For example:<br>response.errors == null`);
	        return
	    }

	    try {
	        let result = eval(code);
	        $$invalidate('testResult', testResult = result);        
	    } catch (error) {
	        console.log(error);
	        $$invalidate('evalErrors', evalErrors = error);
	    }
	}


	let form;
	let formArea;
	onMount(async () => {
	    window.$(formArea).resizable({ handles: "e" });
	    window.$(form).resizable({ handles: "e" });
	});

		function change_handler(event) {
			bubble($$self, event);
		}

		function change_handler_1(event) {
			bubble($$self, event);
		}

		function change_handler_2(event) {
			bubble($$self, event);
		}

		function click_handler(e) {
			const $$result = vis = !vis;
			$$invalidate('vis', vis);
			return $$result;
		}

		function argument_getText_binding(value, { arg }) {
			arg.getText = value;
			$$invalidate('node', node);
		}

		function click_handler_1() {
			return console.log(getTypeText());
		}

		function type_getText_binding(value) {
			getTypeText = value;
			$$invalidate('getTypeText', getTypeText);
		}

		function div3_binding($$node, check) {
			formArea = $$node;
			$$invalidate('formArea', formArea);
		}

		function textarea1_input_handler() {
			variables = this.value;
			$$invalidate('variables', variables);
		}

		function form_1_binding($$node, check) {
			form = $$node;
			$$invalidate('form', form);
		}

		function div13_binding($$node, check) {
			responseArea = $$node;
			$$invalidate('responseArea', responseArea);
		}

		function textarea2_binding($$node, check) {
			evalTextarea = $$node;
			$$invalidate('evalTextarea', evalTextarea);
		}

		$$self.$set = $$props => {
			if ('url' in $$props) $$invalidate('url', url = $$props.url);
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
			if ('scheme' in $$props) $$invalidate('scheme', scheme = $$props.scheme);
			if ('node' in $$props) $$invalidate('node', node = $$props.node);
			if ('operation' in $$props) $$invalidate('operation', operation = $$props.operation);
			if ('test' in $$props) $$invalidate('test', test = $$props.test);
		};

		$$self.$$.update = ($$dirty = { node: 1 }) => {
			if ($$dirty.node) { {
	            // console.log("node changed")
	            generateQuery();
	        } }
		};

		return {
			url,
			parentid,
			scheme,
			node,
			operation,
			test,
			testResult,
			evalErrors,
			vis,
			request,
			variables,
			response,
			responseArea,
			evalTextarea,
			getTypeText,
			argsChangeHandler,
			typeChangeHandler,
			submitForm,
			evaluate,
			form,
			formArea,
			console,
			change_handler,
			change_handler_1,
			change_handler_2,
			click_handler,
			argument_getText_binding,
			click_handler_1,
			type_getText_binding,
			div3_binding,
			textarea1_input_handler,
			form_1_binding,
			div13_binding,
			textarea2_binding
		};
	}

	class Func extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$5, create_fragment$5, safe_not_equal, ["url", "parentid", "scheme", "node", "operation", "test"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.url === undefined && !('url' in props)) {
				console.warn("<Func> was created without expected prop 'url'");
			}
		}

		get url() {
			throw new Error("<Func>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set url(value) {
			throw new Error("<Func>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get parentid() {
			throw new Error("<Func>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set parentid(value) {
			throw new Error("<Func>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get scheme() {
			throw new Error("<Func>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set scheme(value) {
			throw new Error("<Func>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get node() {
			throw new Error("<Func>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set node(value) {
			throw new Error("<Func>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get operation() {
			throw new Error("<Func>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set operation(value) {
			throw new Error("<Func>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get test() {
			throw new Error("<Func>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set test(value) {
			throw new Error("<Func>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/List.svelte generated by Svelte v3.4.0 */

	const file$6 = "src/List.svelte";

	function get_each_context$2(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.t = list[i];
		return child_ctx;
	}

	function get_each_context_1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.e = list[i];
		child_ctx.each_value_1 = list;
		child_ctx.e_index = i;
		return child_ctx;
	}

	function get_each_context_2(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.e = list[i];
		child_ctx.each_value_2 = list;
		child_ctx.e_index_1 = i;
		return child_ctx;
	}

	// (58:5) {#each queries as e}
	function create_each_block_2(ctx) {
		var div, updating_test, current;

		function func_test_binding(value) {
			ctx.func_test_binding.call(null, value, ctx);
			updating_test = true;
			add_flush_callback(() => updating_test = false);
		}

		let func_props = {
			url: ctx.url,
			node: ctx.e,
			operation: "query",
			scheme: ctx.scheme,
			parentid: "" + ctx.parentid + "-query"
		};
		if (ctx.e.test !== void 0) {
			func_props.test = ctx.e.test;
		}
		var func = new Func({ props: func_props, $$inline: true });

		add_binding_callback(() => bind(func, 'test', func_test_binding));
		func.$on("change", ctx.change_handler);

		return {
			c: function create() {
				div = element("div");
				func.$$.fragment.c();
				add_location(div, file$6, 58, 10, 1128);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				mount_component(func, div, null);
				current = true;
			},

			p: function update(changed, new_ctx) {
				ctx = new_ctx;
				var func_changes = {};
				if (changed.url) func_changes.url = ctx.url;
				if (changed.queries) func_changes.node = ctx.e;
				if (changed.scheme) func_changes.scheme = ctx.scheme;
				if (changed.parentid) func_changes.parentid = "" + ctx.parentid + "-query";
				if (!updating_test && changed.queries) {
					func_changes.test = ctx.e.test;
				}
				func.$set(func_changes);
			},

			i: function intro(local) {
				if (current) return;
				func.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				func.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				func.$destroy();
			}
		};
	}

	// (65:5) {#each mutations as e}
	function create_each_block_1(ctx) {
		var div, updating_test, current;

		function func_test_binding_1(value) {
			ctx.func_test_binding_1.call(null, value, ctx);
			updating_test = true;
			add_flush_callback(() => updating_test = false);
		}

		let func_props = {
			url: ctx.url,
			node: ctx.e,
			operation: "mutation",
			scheme: ctx.scheme,
			parentid: "" + ctx.parentid + "-mutation"
		};
		if (ctx.e.test !== void 0) {
			func_props.test = ctx.e.test;
		}
		var func = new Func({ props: func_props, $$inline: true });

		add_binding_callback(() => bind(func, 'test', func_test_binding_1));
		func.$on("change", ctx.change_handler_1);

		return {
			c: function create() {
				div = element("div");
				func.$$.fragment.c();
				add_location(div, file$6, 65, 10, 1356);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				mount_component(func, div, null);
				current = true;
			},

			p: function update(changed, new_ctx) {
				ctx = new_ctx;
				var func_changes = {};
				if (changed.url) func_changes.url = ctx.url;
				if (changed.mutations) func_changes.node = ctx.e;
				if (changed.scheme) func_changes.scheme = ctx.scheme;
				if (changed.parentid) func_changes.parentid = "" + ctx.parentid + "-mutation";
				if (!updating_test && changed.mutations) {
					func_changes.test = ctx.e.test;
				}
				func.$set(func_changes);
			},

			i: function intro(local) {
				if (current) return;
				func.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				func.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				func.$destroy();
			}
		};
	}

	// (72:5) {#each usertypes as t}
	function create_each_block$2(ctx) {
		var div, t, current;

		var type = new Type({
			props: {
			showCheckbox: false,
			typeName: ctx.t.name,
			scheme: ctx.scheme,
			parentid: "" + ctx.parentid + "-usertypes"
		},
			$$inline: true
		});

		return {
			c: function create() {
				div = element("div");
				type.$$.fragment.c();
				t = space();
				add_location(div, file$6, 72, 10, 1591);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				mount_component(type, div, null);
				append(div, t);
				current = true;
			},

			p: function update(changed, ctx) {
				var type_changes = {};
				if (changed.usertypes) type_changes.typeName = ctx.t.name;
				if (changed.scheme) type_changes.scheme = ctx.scheme;
				if (changed.parentid) type_changes.parentid = "" + ctx.parentid + "-usertypes";
				type.$set(type_changes);
			},

			i: function intro(local) {
				if (current) return;
				type.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				type.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				type.$destroy();
			}
		};
	}

	function create_fragment$6(ctx) {
		var div, h40, t1, t2, h41, t4, t5, h42, t7, current;

		var each_value_2 = ctx.queries;

		var each_blocks_2 = [];

		for (var i = 0; i < each_value_2.length; i += 1) {
			each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
		}

		function outro_block(i, detaching, local) {
			if (each_blocks_2[i]) {
				if (detaching) {
					on_outro(() => {
						each_blocks_2[i].d(detaching);
						each_blocks_2[i] = null;
					});
				}

				each_blocks_2[i].o(local);
			}
		}

		var each_value_1 = ctx.mutations;

		var each_blocks_1 = [];

		for (var i = 0; i < each_value_1.length; i += 1) {
			each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
		}

		function outro_block_1(i, detaching, local) {
			if (each_blocks_1[i]) {
				if (detaching) {
					on_outro(() => {
						each_blocks_1[i].d(detaching);
						each_blocks_1[i] = null;
					});
				}

				each_blocks_1[i].o(local);
			}
		}

		var each_value = ctx.usertypes;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
		}

		function outro_block_2(i, detaching, local) {
			if (each_blocks[i]) {
				if (detaching) {
					on_outro(() => {
						each_blocks[i].d(detaching);
						each_blocks[i] = null;
					});
				}

				each_blocks[i].o(local);
			}
		}

		return {
			c: function create() {
				div = element("div");
				h40 = element("h4");
				h40.textContent = "Queries";
				t1 = space();

				for (var i = 0; i < each_blocks_2.length; i += 1) {
					each_blocks_2[i].c();
				}

				t2 = space();
				h41 = element("h4");
				h41.textContent = "Mutations";
				t4 = space();

				for (var i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t5 = space();
				h42 = element("h4");
				h42.textContent = "User types";
				t7 = space();

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				add_location(h40, file$6, 56, 5, 1075);
				add_location(h41, file$6, 63, 5, 1299);
				add_location(h42, file$6, 70, 5, 1533);
				add_location(div, file$6, 54, 0, 996);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, h40);
				append(div, t1);

				for (var i = 0; i < each_blocks_2.length; i += 1) {
					each_blocks_2[i].m(div, null);
				}

				append(div, t2);
				append(div, h41);
				append(div, t4);

				for (var i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].m(div, null);
				}

				append(div, t5);
				append(div, h42);
				append(div, t7);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div, null);
				}

				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.url || changed.queries || changed.scheme || changed.parentid) {
					each_value_2 = ctx.queries;

					for (var i = 0; i < each_value_2.length; i += 1) {
						const child_ctx = get_each_context_2(ctx, each_value_2, i);

						if (each_blocks_2[i]) {
							each_blocks_2[i].p(changed, child_ctx);
							each_blocks_2[i].i(1);
						} else {
							each_blocks_2[i] = create_each_block_2(child_ctx);
							each_blocks_2[i].c();
							each_blocks_2[i].i(1);
							each_blocks_2[i].m(div, t2);
						}
					}

					group_outros();
					for (; i < each_blocks_2.length; i += 1) outro_block(i, 1, 1);
					check_outros();
				}

				if (changed.url || changed.mutations || changed.scheme || changed.parentid) {
					each_value_1 = ctx.mutations;

					for (var i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1(ctx, each_value_1, i);

						if (each_blocks_1[i]) {
							each_blocks_1[i].p(changed, child_ctx);
							each_blocks_1[i].i(1);
						} else {
							each_blocks_1[i] = create_each_block_1(child_ctx);
							each_blocks_1[i].c();
							each_blocks_1[i].i(1);
							each_blocks_1[i].m(div, t5);
						}
					}

					group_outros();
					for (; i < each_blocks_1.length; i += 1) outro_block_1(i, 1, 1);
					check_outros();
				}

				if (changed.usertypes || changed.scheme || changed.parentid) {
					each_value = ctx.usertypes;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$2(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
							each_blocks[i].i(1);
						} else {
							each_blocks[i] = create_each_block$2(child_ctx);
							each_blocks[i].c();
							each_blocks[i].i(1);
							each_blocks[i].m(div, null);
						}
					}

					group_outros();
					for (; i < each_blocks.length; i += 1) outro_block_2(i, 1, 1);
					check_outros();
				}
			},

			i: function intro(local) {
				if (current) return;
				for (var i = 0; i < each_value_2.length; i += 1) each_blocks_2[i].i();

				for (var i = 0; i < each_value_1.length; i += 1) each_blocks_1[i].i();

				for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

				current = true;
			},

			o: function outro(local) {
				each_blocks_2 = each_blocks_2.filter(Boolean);
				for (let i = 0; i < each_blocks_2.length; i += 1) outro_block(i, 0);

				each_blocks_1 = each_blocks_1.filter(Boolean);
				for (let i = 0; i < each_blocks_1.length; i += 1) outro_block_1(i, 0);

				each_blocks = each_blocks.filter(Boolean);
				for (let i = 0; i < each_blocks.length; i += 1) outro_block_2(i, 0);

				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_each(each_blocks_2, detaching);

				destroy_each(each_blocks_1, detaching);

				destroy_each(each_blocks, detaching);
			}
		};
	}

	function compareTypes(t1, t2) {     
	 if (t1.name > t2.name ){
	      return 1
	 } else if (t1.name < t2.name) {
	      return -1
	 } 
	 return 0
	}

	function instance$6($$self, $$props, $$invalidate) {
		

	let { scheme, url, parentid = '', doTests = function (){
	    for (let o of queries) {
	        o.test();
	    }
	    for (let o of mutations) {
	        o.test();
	    }
	} } = $$props;


	let mutations =[];
	let queries =[];
	let types=[];
	let usertypes=[];

		function change_handler(event) {
			bubble($$self, event);
		}

		function change_handler_1(event) {
			bubble($$self, event);
		}

		function func_test_binding(value, { e }) {
			e.test = value;
			$$invalidate('queries', queries), $$invalidate('scheme', scheme);
		}

		function func_test_binding_1(value, { e }) {
			e.test = value;
			$$invalidate('mutations', mutations), $$invalidate('scheme', scheme);
		}

		$$self.$set = $$props => {
			if ('scheme' in $$props) $$invalidate('scheme', scheme = $$props.scheme);
			if ('url' in $$props) $$invalidate('url', url = $$props.url);
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
			if ('doTests' in $$props) $$invalidate('doTests', doTests = $$props.doTests);
		};

		$$self.$$.update = ($$dirty = { scheme: 1 }) => {
			if ($$dirty.scheme) { {
	            // console.log("List scheme changed")
	            $$invalidate('mutations', mutations =[]);
	            $$invalidate('queries', queries =[]);
	            $$invalidate('types', types=[]);
	            $$invalidate('usertypes', usertypes=[]);
	        
	            try {
	            $$invalidate('mutations', mutations = scheme.data.__schema.mutationType.fields);
	            $$invalidate('queries', queries = scheme.data.__schema.queryType.fields);
	            $$invalidate('types', types = scheme.data.__schema.types.sort(compareTypes));
	            $$invalidate('usertypes', usertypes = scheme.data.__schema.types.filter(t => t.name[0]!='_' && t.kind == 'OBJECT' && t.name != 'Query' && t.name != 'Mutation').sort(compareTypes));
	            } catch(e){}
	        } }
		};

		return {
			scheme,
			url,
			parentid,
			doTests,
			mutations,
			queries,
			usertypes,
			change_handler,
			change_handler_1,
			func_test_binding,
			func_test_binding_1
		};
	}

	class List extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$6, create_fragment$6, safe_not_equal, ["scheme", "url", "parentid", "doTests"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.scheme === undefined && !('scheme' in props)) {
				console.warn("<List> was created without expected prop 'scheme'");
			}
			if (ctx.url === undefined && !('url' in props)) {
				console.warn("<List> was created without expected prop 'url'");
			}
		}

		get scheme() {
			throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set scheme(value) {
			throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get url() {
			throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set url(value) {
			throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get parentid() {
			throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set parentid(value) {
			throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get doTests() {
			throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set doTests(value) {
			throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/App.svelte generated by Svelte v3.4.0 */

	const file$7 = "src/App.svelte";

	function create_fragment$7(ctx) {
		var div2, div1, input, t0, updating_url, updating_scheme, t1, div0, updating_doTests, current, dispose;

		function schemer_url_binding(value) {
			ctx.schemer_url_binding.call(null, value);
			updating_url = true;
			add_flush_callback(() => updating_url = false);
		}

		function schemer_scheme_binding(value_1) {
			ctx.schemer_scheme_binding.call(null, value_1);
			updating_scheme = true;
			add_flush_callback(() => updating_scheme = false);
		}

		let schemer_props = {
			parentid: "" + ctx.parentid + "-Schemer"
		};
		if (ctx.url !== void 0) {
			schemer_props.url = ctx.url;
		}
		if (ctx.scheme !== void 0) {
			schemer_props.scheme = ctx.scheme;
		}
		var schemer = new Schemer({ props: schemer_props, $$inline: true });

		add_binding_callback(() => bind(schemer, 'url', schemer_url_binding));
		add_binding_callback(() => bind(schemer, 'scheme', schemer_scheme_binding));
		schemer.$on("change", ctx.changeHandler);

		function list_doTests_binding(value_2) {
			ctx.list_doTests_binding.call(null, value_2);
			updating_doTests = true;
			add_flush_callback(() => updating_doTests = false);
		}

		let list_props = {
			parentid: "" + ctx.parentid + "-List",
			url: ctx.url,
			scheme: ctx.scheme
		};
		if (ctx.doTests !== void 0) {
			list_props.doTests = ctx.doTests;
		}
		var list = new List({ props: list_props, $$inline: true });

		add_binding_callback(() => bind(list, 'doTests', list_doTests_binding));
		list.$on("change", ctx.changeHandler);

		return {
			c: function create() {
				div2 = element("div");
				div1 = element("div");
				input = element("input");
				t0 = space();
				schemer.$$.fragment.c();
				t1 = space();
				div0 = element("div");
				list.$$.fragment.c();
				attr(input, "type", "button");
				input.value = "do tests";
				input.className = "svelte-1nykjm2";
				add_location(input, file$7, 136, 8, 3135);
				div0.className = "main svelte-1nykjm2";
				add_location(div0, file$7, 144, 4, 3543);
				div1.className = "root svelte-1nykjm2";
				add_location(div1, file$7, 135, 0, 3107);
				div2.className = "hidden svelte-1nykjm2";
				toggle_class(div2, "visible", ctx.visible);
				add_location(div2, file$7, 134, 0, 3072);
				dispose = listen(input, "click", ctx.doAllTests);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div1);
				append(div1, input);
				append(div1, t0);
				mount_component(schemer, div1, null);
				append(div1, t1);
				append(div1, div0);
				mount_component(list, div0, null);
				current = true;
			},

			p: function update(changed, ctx) {
				var schemer_changes = {};
				if (changed.parentid) schemer_changes.parentid = "" + ctx.parentid + "-Schemer";
				if (!updating_url && changed.url) {
					schemer_changes.url = ctx.url;
				}
				if (!updating_scheme && changed.scheme) {
					schemer_changes.scheme = ctx.scheme;
				}
				schemer.$set(schemer_changes);

				var list_changes = {};
				if (changed.parentid) list_changes.parentid = "" + ctx.parentid + "-List";
				if (changed.url) list_changes.url = ctx.url;
				if (changed.scheme) list_changes.scheme = ctx.scheme;
				if (!updating_doTests && changed.doTests) {
					list_changes.doTests = ctx.doTests;
				}
				list.$set(list_changes);

				if (changed.visible) {
					toggle_class(div2, "visible", ctx.visible);
				}
			},

			i: function intro(local) {
				if (current) return;
				schemer.$$.fragment.i(local);

				list.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				schemer.$$.fragment.o(local);
				list.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div2);
				}

				schemer.$destroy();

				list.$destroy();

				dispose();
			}
		};
	}

	function getControlValuesByTagName(tag) {
	let a =[];
	let inps=document.getElementsByTagName(tag);  
	for (let inp of inps) {
	    let id = inp.getAttribute("id");
	    if (!id) continue
	    if (id[0]=='-') console.log(id); // check wrong ids
	    let type =  tag == 'textarea' ? 'textarea' :  inp.getAttribute("type");
	    let value = inp.value;
	    let checked = inp.checked;
	    a.push({ id: id, type:type, checked:checked, value:value });
	}
	return a    
	}

	function getControlValues() {
	let inputs    = getControlValuesByTagName("input");
	let textareas = getControlValuesByTagName("textarea");
	return inputs.concat(textareas)
	}

	function restoreControlValues(controls) {
	if (!controls) return
	for (let c of controls) {
	    let inp = document.getElementById(c.id);
	    if (!inp) continue
	    if (c.type == 'checkbox') {
	        inp.checked = c.checked;
	    } else {
	        inp.value = c.value;
	    }
	}
	}

	function instance$7($$self, $$props, $$invalidate) {
		


	let { parentid='tab1', visible = true } = $$props;

	let url;
	let scheme = {};
	let ignoreChanges = true;
	let doTests;

	function doAllTests() {
	    doTests();
	}


	function saveInputs() {
	    let key = parentid;
	    let controls = getControlValues();
	    let controlsStr = JSON.stringify(controls);
	    localStorage.setItem(key, controlsStr);
	    console.log("saved: ", key, controlsStr.length );
	}


	function restoreInputs() {
	    // check if scheme is empty
	    if (scheme && Object.entries(scheme).length === 0 && scheme.constructor === Object)
	        return

	    let key = parentid;
	    let controlsStr = localStorage.getItem(key);
	    if (!controlsStr) return
	    let controls = JSON.parse(controlsStr);
	    restoreControlValues(controls);
	    console.log("restored key=", key, controlsStr.length );
	}

	let delayTimeout;
	function delay(func, time=300) {
	    clearTimeout(delayTimeout);
	    $$invalidate('delayTimeout', delayTimeout = setTimeout(func, time));
	}

	function changeHandler(){
	    console.log('App changeHandler parentid=', parentid, document.readyState);
	    if (ignoreChanges) return
	    delay(()=> console.log("I was delayed from App changeYandler parentid=", parentid, document.readyState));
	}


	afterUpdate(() => {
	    console.log("afterUpdate parentid=", parentid);
	    restoreInputs();
	    // delay(restoreInputs, 500)
	});

	onMount(async () => {
	    // restoreInputs()
	    console.log("onMount parentid=", parentid);
	});

		function schemer_url_binding(value) {
			url = value;
			$$invalidate('url', url);
		}

		function schemer_scheme_binding(value_1) {
			scheme = value_1;
			$$invalidate('scheme', scheme);
		}

		function list_doTests_binding(value_2) {
			doTests = value_2;
			$$invalidate('doTests', doTests);
		}

		$$self.$set = $$props => {
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
			if ('visible' in $$props) $$invalidate('visible', visible = $$props.visible);
		};

		$$self.$$.update = ($$dirty = { scheme: 1 }) => {
			if ($$dirty.scheme) { {
	            $$invalidate('scheme', scheme);
	            console.log('App scheme changed', scheme);
	            $$invalidate('ignoreChanges', ignoreChanges= true);
	            // delay(restoreInputs, 500)
	        } }
		};

		return {
			parentid,
			visible,
			url,
			scheme,
			doTests,
			doAllTests,
			saveInputs,
			restoreInputs,
			changeHandler,
			schemer_url_binding,
			schemer_scheme_binding,
			list_doTests_binding
		};
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$7, create_fragment$7, safe_not_equal, ["parentid", "visible", "saveInputs", "restoreInputs"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.saveInputs === undefined && !('saveInputs' in props)) {
				console.warn("<App> was created without expected prop 'saveInputs'");
			}
			if (ctx.restoreInputs === undefined && !('restoreInputs' in props)) {
				console.warn("<App> was created without expected prop 'restoreInputs'");
			}
		}

		get parentid() {
			throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set parentid(value) {
			throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get visible() {
			throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set visible(value) {
			throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get saveInputs() {
			return this.$$.ctx.saveInputs;
		}

		set saveInputs(value) {
			throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get restoreInputs() {
			return this.$$.ctx.restoreInputs;
		}

		set restoreInputs(value) {
			throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/Tabs.svelte generated by Svelte v3.4.0 */

	const file$8 = "src/Tabs.svelte";

	function get_each_context$3(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.tab = list[i];
		return child_ctx;
	}

	// (123:4) {#if tabs && tabs.length > 0}
	function create_if_block$4(ctx) {
		var span, input0, t, input1, dispose;

		return {
			c: function create() {
				span = element("span");
				input0 = element("input");
				t = space();
				input1 = element("input");
				attr(input0, "type", "button");
				input0.className = "button svelte-1kku5aw";
				input0.value = "rename";
				add_location(input0, file$8, 124, 8, 2473);
				attr(input1, "type", "button");
				input1.className = "button svelte-1kku5aw";
				input1.value = "save";
				add_location(input1, file$8, 125, 8, 2554);
				span.className = "buttons svelte-1kku5aw";
				add_location(span, file$8, 123, 4, 2442);

				dispose = [
					listen(input0, "click", renameTab),
					listen(input1, "click", ctx.saveTab)
				];
			},

			m: function mount(target, anchor) {
				insert(target, span, anchor);
				append(span, input0);
				append(span, t);
				append(span, input1);
			},

			p: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(span);
				}

				run_all(dispose);
			}
		};
	}

	// (130:4) {#each tabs as tab (tab)}
	function create_each_block$3(key_1, ctx) {
		var span1, t0_value = ctx.tab, t0, t1, span0, t2, span0_data_tab_value, span1_data_tab_value, dispose;

		return {
			key: key_1,

			first: null,

			c: function create() {
				span1 = element("span");
				t0 = text(t0_value);
				t1 = space();
				span0 = element("span");
				t2 = text("x");
				span0.className = "x svelte-1kku5aw";
				span0.dataset.tab = span0_data_tab_value = ctx.tab;
				add_location(span0, file$8, 131, 12, 2785);
				span1.className = "tab svelte-1kku5aw";
				span1.dataset.tab = span1_data_tab_value = ctx.tab;
				toggle_class(span1, "active", ctx.tab == ctx.active);
				add_location(span1, file$8, 130, 8, 2684);

				dispose = [
					listen(span0, "click", ctx.deleteTab),
					listen(span1, "click", ctx.activate)
				];

				this.first = span1;
			},

			m: function mount(target, anchor) {
				insert(target, span1, anchor);
				append(span1, t0);
				append(span1, t1);
				append(span1, span0);
				append(span0, t2);
			},

			p: function update(changed, ctx) {
				if ((changed.tabs) && t0_value !== (t0_value = ctx.tab)) {
					set_data(t0, t0_value);
				}

				if ((changed.tabs) && span0_data_tab_value !== (span0_data_tab_value = ctx.tab)) {
					span0.dataset.tab = span0_data_tab_value;
				}

				if ((changed.tabs) && span1_data_tab_value !== (span1_data_tab_value = ctx.tab)) {
					span1.dataset.tab = span1_data_tab_value;
				}

				if ((changed.tabs || changed.active)) {
					toggle_class(span1, "active", ctx.tab == ctx.active);
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(span1);
				}

				run_all(dispose);
			}
		};
	}

	function create_fragment$8(ctx) {
		var div, t0, each_blocks = [], each_1_lookup = new Map(), t1, span, dispose;

		var if_block = (ctx.tabs && ctx.tabs.length > 0) && create_if_block$4(ctx);

		var each_value = ctx.tabs;

		const get_key = ctx => ctx.tab;

		for (var i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$3(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block$3(key, child_ctx));
		}

		return {
			c: function create() {
				div = element("div");
				if (if_block) if_block.c();
				t0 = space();

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].c();

				t1 = space();
				span = element("span");
				span.textContent = "+";
				span.className = "tab plus svelte-1kku5aw";
				add_location(span, file$8, 134, 4, 2878);
				div.className = "container svelte-1kku5aw";
				add_location(div, file$8, 121, 0, 2380);
				dispose = listen(span, "click", ctx.addTab);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				if (if_block) if_block.m(div, null);
				append(div, t0);

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].m(div, null);

				append(div, t1);
				append(div, span);
			},

			p: function update(changed, ctx) {
				if (ctx.tabs && ctx.tabs.length > 0) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block$4(ctx);
						if_block.c();
						if_block.m(div, t0);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				const each_value = ctx.tabs;
				each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, div, destroy_block, create_each_block$3, t1, get_each_context$3);
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				if (if_block) if_block.d();

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].d();

				dispose();
			}
		};
	}

	function getKeysFromLocalStorage() {
	return Object.keys(localStorage)
	}

	function renameTab(){

	}

	function instance$8($$self, $$props, $$invalidate) {
		let { tabs = [], active = "" } = $$props;

	const dispatch = createEventDispatcher();
	function activate(e) {
	    $$invalidate('active', active = this.getAttribute("data-tab"));
	}



	function addTab(){
	    let tabName = prompt("New tab name","");
	    if (!tabName) return
	    while (tabs.includes(tabName)){
	        tabName = prompt(`"${tabName}" already exists. Please try again.`,tabName);
	        if (!tabName) return
	    }
	    $$invalidate('tabs', tabs = [...tabs, tabName]);
	    $$invalidate('active', active = tabName);
	}

	function deleteTab(){
	    let tab = this.getAttribute("data-tab");
	    $$invalidate('tabs', tabs = tabs.filter( e => e != tab));
	    $$invalidate('active', active = tabs.length >0 ? tabs[0] : '');
	    console.log(active);
	}


	function saveTab(){
	    dispatch('save', {tab: active} );
	}

	onMount(async () => {
	    let storedTabs = getKeysFromLocalStorage();
	    $$invalidate('tabs', tabs = storedTabs.length ==0 ? ['Test endpont'] : [...tabs, ...storedTabs]);
	    $$invalidate('active', active = tabs[0]);
	});

		$$self.$set = $$props => {
			if ('tabs' in $$props) $$invalidate('tabs', tabs = $$props.tabs);
			if ('active' in $$props) $$invalidate('active', active = $$props.active);
		};

		return {
			tabs,
			active,
			activate,
			addTab,
			deleteTab,
			saveTab
		};
	}

	class Tabs extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$8, create_fragment$8, safe_not_equal, ["tabs", "active"]);
		}

		get tabs() {
			throw new Error("<Tabs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set tabs(value) {
			throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get active() {
			throw new Error("<Tabs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set active(value) {
			throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/AppTabbed.svelte generated by Svelte v3.4.0 */

	const file$9 = "src/AppTabbed.svelte";

	function get_each_context$4(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.tab = list[i];
		return child_ctx;
	}

	// (22:4) {#each tabs as tab (tab)}
	function create_each_block$4(key_1, ctx) {
		var first, updating_saveInputs, current;

		function app_saveInputs_binding(value) {
			ctx.app_saveInputs_binding.call(null, value, ctx);
			updating_saveInputs = true;
			add_flush_callback(() => updating_saveInputs = false);
		}

		let app_props = {
			parentid: ctx.tab,
			visible: ctx.tab == ctx.active
		};
		if (ctx.tabsSaveFunctions[ctx.tab] !== void 0) {
			app_props.saveInputs = ctx.tabsSaveFunctions[ctx.tab];
		}
		var app = new App({ props: app_props, $$inline: true });

		add_binding_callback(() => bind(app, 'saveInputs', app_saveInputs_binding));

		return {
			key: key_1,

			first: null,

			c: function create() {
				first = empty();
				app.$$.fragment.c();
				this.first = first;
			},

			m: function mount(target, anchor) {
				insert(target, first, anchor);
				mount_component(app, target, anchor);
				current = true;
			},

			p: function update(changed, new_ctx) {
				ctx = new_ctx;
				var app_changes = {};
				if (changed.tabs) app_changes.parentid = ctx.tab;
				if (changed.tabs || changed.active) app_changes.visible = ctx.tab == ctx.active;
				if (!updating_saveInputs && changed.tabsSaveFunctions || changed.tabs) {
					app_changes.saveInputs = ctx.tabsSaveFunctions[ctx.tab];
				}
				app.$set(app_changes);
			},

			i: function intro(local) {
				if (current) return;
				app.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				app.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(first);
				}

				app.$destroy(detaching);
			}
		};
	}

	function create_fragment$9(ctx) {
		var div, updating_tabs, updating_active, t, each_blocks = [], each_1_lookup = new Map(), current;

		function tabs_1_tabs_binding(value) {
			ctx.tabs_1_tabs_binding.call(null, value);
			updating_tabs = true;
			add_flush_callback(() => updating_tabs = false);
		}

		function tabs_1_active_binding(value_1) {
			ctx.tabs_1_active_binding.call(null, value_1);
			updating_active = true;
			add_flush_callback(() => updating_active = false);
		}

		let tabs_1_props = {};
		if (ctx.tabs !== void 0) {
			tabs_1_props.tabs = ctx.tabs;
		}
		if (ctx.active !== void 0) {
			tabs_1_props.active = ctx.active;
		}
		var tabs_1 = new Tabs({ props: tabs_1_props, $$inline: true });

		add_binding_callback(() => bind(tabs_1, 'tabs', tabs_1_tabs_binding));
		add_binding_callback(() => bind(tabs_1, 'active', tabs_1_active_binding));
		tabs_1.$on("save", ctx.saveTab);

		var each_value = ctx.tabs;

		const get_key = ctx => ctx.tab;

		for (var i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$4(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block$4(key, child_ctx));
		}

		return {
			c: function create() {
				div = element("div");
				tabs_1.$$.fragment.c();
				t = space();

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].c();
				add_location(div, file$9, 19, 0, 225);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				mount_component(tabs_1, div, null);
				append(div, t);

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].m(div, null);

				current = true;
			},

			p: function update(changed, ctx) {
				var tabs_1_changes = {};
				if (!updating_tabs && changed.tabs) {
					tabs_1_changes.tabs = ctx.tabs;
				}
				if (!updating_active && changed.active) {
					tabs_1_changes.active = ctx.active;
				}
				tabs_1.$set(tabs_1_changes);

				const each_value = ctx.tabs;

				group_outros();
				each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block$4, null, get_each_context$4);
				check_outros();
			},

			i: function intro(local) {
				if (current) return;
				tabs_1.$$.fragment.i(local);

				for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

				current = true;
			},

			o: function outro(local) {
				tabs_1.$$.fragment.o(local);

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].o();

				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				tabs_1.$destroy();

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].d();
			}
		};
	}

	function instance$9($$self, $$props, $$invalidate) {
		

	let tabs = [];
	let active = '';
	let tabsSaveFunctions = {};


	function saveTab(params) {
	    tabsSaveFunctions[active]();
	}

		function tabs_1_tabs_binding(value) {
			tabs = value;
			$$invalidate('tabs', tabs);
		}

		function tabs_1_active_binding(value_1) {
			active = value_1;
			$$invalidate('active', active);
		}

		function app_saveInputs_binding(value, { tab }) {
			tabsSaveFunctions[tab] = value;
			$$invalidate('tabsSaveFunctions', tabsSaveFunctions);
		}

		return {
			tabs,
			active,
			tabsSaveFunctions,
			saveTab,
			tabs_1_tabs_binding,
			tabs_1_active_binding,
			app_saveInputs_binding
		};
	}

	class AppTabbed extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$9, create_fragment$9, safe_not_equal, []);
		}
	}

	// import App from './App.svelte';


	var app = new AppTabbed({
		target: document.body
	});

	return app;

}());
//# sourceMappingURL=bundle.js.map

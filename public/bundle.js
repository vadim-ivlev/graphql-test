
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

	// (60:2) {#if visible}
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
		var div, form, input0, input0_id_value, t0, label, t1, label_for_value, t2, input1, input1_id_value, input1_name_value, t3, input2, t4, input3, t5, a, t6_value = ctx.visible?'Hide':'Show', t6, t7, t8, current, dispose;

		var if_block = (ctx.visible) && create_if_block(ctx);

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
				input3 = element("input");
				t5 = space();
				a = element("a");
				t6 = text(t6_value);
				t7 = text(" scheme");
				t8 = space();
				if (if_block) if_block.c();
				input0.className = "post svelte-mbsxsj";
				attr(input0, "type", "text");
				input0.id = input0_id_value = "id-" + ctx.parentid + "-inp-method";
				input0.value = "POST";
				add_location(input0, file$1, 52, 4, 1036);
				label.htmlFor = label_for_value = "id-" + ctx.parentid + "-inp-url";
				add_location(label, file$1, 53, 4, 1142);
				input1.className = "text svelte-mbsxsj";
				attr(input1, "type", "text");
				input1.id = input1_id_value = "id-" + ctx.parentid + "-inp-url";
				input1.name = input1_name_value = "id-" + ctx.parentid + "-inp-url";
				add_location(input1, file$1, 54, 4, 1201);
				attr(input2, "type", "button");
				input2.value = "reset";
				input2.className = "svelte-mbsxsj";
				add_location(input2, file$1, 55, 4, 1346);
				attr(input3, "type", "button");
				input3.value = "refresh";
				input3.className = "svelte-mbsxsj";
				add_location(input3, file$1, 56, 4, 1411);
				a.href = true;
				add_location(a, file$1, 57, 4, 1476);
				add_location(form, file$1, 51, 2, 1025);
				div.className = "self svelte-mbsxsj";
				add_location(div, file$1, 50, 0, 1004);

				dispose = [
					listen(input1, "input", ctx.input1_input_handler),
					listen(input1, "change", ctx.change_handler),
					listen(input2, "click", ctx.clearScheme),
					listen(input3, "click", ctx.getScheme),
					listen(a, "click", prevent_default(ctx.click_handler))
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
				append(form, input3);
				append(form, t5);
				append(form, a);
				append(a, t6);
				append(a, t7);
				append(div, t8);
				if (if_block) if_block.m(div, null);
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

				if ((!current || changed.visible) && t6_value !== (t6_value = ctx.visible?'Hide':'Show')) {
					set_data(t6, t6_value);
				}

				if (ctx.visible) {
					if (if_block) {
						if_block.p(changed, ctx);
						if_block.i(1);
					} else {
						if_block = create_if_block(ctx);
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

				ctx.input0_binding(null, input0);
				ctx.input1_binding(null, input1);
				if (if_block) if_block.d();
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

	function clearScheme() {
	    $$invalidate('scheme', scheme = {});     
	}


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
			clearScheme,
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
			create_if_block_1,
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
	function create_if_block_1(ctx) {
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

	// (315:16) {#if node.args}
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
				div0.className = "header svelte-1xt33sg";
				add_location(div0, file$5, 315, 16, 6377);
				div1.className = "fieldlist svelte-1xt33sg";
				add_location(div1, file$5, 316, 16, 6430);
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

	// (318:20) {#each node.args as arg, index (arg.name)}
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
		var div19, div0, t0, a, t1_value = ctx.node.name, t1, t2, a_class_value, t3, span0, t4, t5, span1, t6_value = ctx.node.description, t6, t7, div18, div3, t8, div2, div1, t9, t10_value = ctx.node.type.kind == "LIST" ? '[...]': '', t10, t11, input0, t12, updating_getText, t13, form_1, div5, div4, t15, textarea0, textarea0_id_value, t16, div7, div6, t18, textarea1, textarea1_id_value, t19, div9, div8, t21, input1, t22, div10, input2, t23, div17, div11, t25, div14, div12, t26, span2, t27_value = ctx.response?'':null, t27, t28, div13, t29, div16, span3, t31, textarea2, textarea2_id_value, t32, div15, input3, t33, span4, t34, t35, span5, current, dispose;

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
				t0 = space();
				a = element("a");
				t1 = text(t1_value);
				t2 = text("(...)");
				t3 = space();
				span0 = element("span");
				t4 = text(ctx.testResult);
				t5 = space();
				span1 = element("span");
				t6 = text(t6_value);
				t7 = space();
				div18 = element("div");
				div3 = element("div");
				if (if_block) if_block.c();
				t8 = space();
				div2 = element("div");
				div1 = element("div");
				t9 = text("RETURNS ");
				t10 = text(t10_value);
				t11 = space();
				input0 = element("input");
				t12 = space();
				type.$$.fragment.c();
				t13 = space();
				form_1 = element("form");
				div5 = element("div");
				div4 = element("div");
				div4.textContent = "QUERY";
				t15 = space();
				textarea0 = element("textarea");
				t16 = space();
				div7 = element("div");
				div6 = element("div");
				div6.textContent = "VARIABLES";
				t18 = space();
				textarea1 = element("textarea");
				t19 = space();
				div9 = element("div");
				div8 = element("div");
				div8.textContent = "FILE";
				t21 = space();
				input1 = element("input");
				t22 = space();
				div10 = element("div");
				input2 = element("input");
				t23 = space();
				div17 = element("div");
				div11 = element("div");
				div11.textContent = "RESPONSE";
				t25 = space();
				div14 = element("div");
				div12 = element("div");
				t26 = text("response = ");
				span2 = element("span");
				t27 = text(t27_value);
				t28 = space();
				div13 = element("div");
				t29 = space();
				div16 = element("div");
				span3 = element("span");
				span3.textContent = "TEST";
				t31 = space();
				textarea2 = element("textarea");
				t32 = space();
				div15 = element("div");
				input3 = element("input");
				t33 = space();
				span4 = element("span");
				t34 = text(ctx.testResult);
				t35 = space();
				span5 = element("span");
				add_location(div0, file$5, 305, 4, 5971);
				a.className = a_class_value = "name " + (ctx.vis?'opened':'closed') + " svelte-1xt33sg";
				a.href = true;
				add_location(a, file$5, 308, 4, 5997);
				span0.className = "test-result svelte-1xt33sg";
				add_location(span0, file$5, 309, 4, 6111);
				span1.className = "description svelte-1xt33sg";
				add_location(span1, file$5, 310, 4, 6162);
				attr(input0, "type", "button");
				input0.value = "getText";
				add_location(input0, file$5, 326, 20, 6896);
				div1.className = "header svelte-1xt33sg";
				add_location(div1, file$5, 325, 20, 6806);
				add_location(div2, file$5, 324, 16, 6780);
				div3.className = "form-area svelte-1xt33sg";
				add_location(div3, file$5, 312, 8, 6283);
				div4.className = "header svelte-1xt33sg";
				add_location(div4, file$5, 335, 16, 7320);
				textarea0.id = textarea0_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-query";
				textarea0.name = "query";
				textarea0.className = "query svelte-1xt33sg";
				textarea0.value = ctx.request;
				add_location(textarea0, file$5, 336, 16, 7369);
				add_location(div5, file$5, 334, 12, 7298);
				div6.className = "header svelte-1xt33sg";
				add_location(div6, file$5, 339, 16, 7525);
				textarea1.id = textarea1_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-variables";
				textarea1.name = "variables";
				textarea1.className = "variables svelte-1xt33sg";
				add_location(textarea1, file$5, 340, 16, 7578);
				add_location(div7, file$5, 338, 12, 7503);
				div8.className = "header svelte-1xt33sg";
				add_location(div8, file$5, 343, 16, 7759);
				attr(input1, "type", "file");
				input1.name = "input-file";
				add_location(input1, file$5, 344, 16, 7806);
				add_location(div9, file$5, 342, 12, 7737);
				attr(input2, "type", "submit");
				input2.value = "TEST";
				input2.className = "svelte-1xt33sg";
				add_location(input2, file$5, 347, 16, 7913);
				div10.className = "buttons svelte-1xt33sg";
				add_location(div10, file$5, 346, 12, 7875);
				form_1.className = "svelte-1xt33sg";
				add_location(form_1, file$5, 333, 8, 7239);
				div11.className = "header svelte-1xt33sg";
				add_location(div11, file$5, 353, 12, 8034);
				span2.className = "json-literal";
				add_location(span2, file$5, 355, 32, 8141);
				add_location(div12, file$5, 355, 16, 8125);
				div13.className = "response svelte-1xt33sg";
				add_location(div13, file$5, 356, 16, 8216);
				div14.className = "response-area svelte-1xt33sg";
				add_location(div14, file$5, 354, 12, 8081);
				span3.className = "header svelte-1xt33sg";
				add_location(span3, file$5, 359, 16, 8341);
				textarea2.rows = "3";
				textarea2.id = textarea2_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-eval-text";
				textarea2.className = "eval-text svelte-1xt33sg";
				textarea2.value = "response && !response.errors";
				add_location(textarea2, file$5, 360, 16, 8390);
				attr(input3, "type", "button");
				input3.className = "try-button svelte-1xt33sg";
				input3.value = "TRY TEST";
				add_location(input3, file$5, 362, 20, 8591);
				span4.className = "eval-result svelte-1xt33sg";
				add_location(span4, file$5, 363, 20, 8689);
				span5.className = "eval-errors svelte-1xt33sg";
				add_location(span5, file$5, 364, 20, 8755);
				div15.className = "buttons2 svelte-1xt33sg";
				add_location(div15, file$5, 361, 16, 8548);
				div16.className = "eval-area svelte-1xt33sg";
				add_location(div16, file$5, 358, 12, 8301);
				div17.className = "result-panel svelte-1xt33sg";
				add_location(div17, file$5, 352, 8, 7995);
				div18.className = "root svelte-1xt33sg";
				set_style(div18, "display", (ctx.vis?'grid':'none'));
				add_location(div18, file$5, 311, 4, 6218);
				add_location(div19, file$5, 304, 0, 5961);

				dispose = [
					listen(a, "click", prevent_default(ctx.click_handler)),
					listen(input0, "click", ctx.click_handler_1),
					listen(textarea0, "change", ctx.change_handler),
					listen(textarea1, "input", ctx.textarea1_input_handler),
					listen(textarea1, "change", ctx.change_handler_1),
					listen(form_1, "submit", ctx.submitForm),
					listen(input3, "click", ctx.evaluate)
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div19, anchor);
				append(div19, div0);
				append(div19, t0);
				append(div19, a);
				append(a, t1);
				append(a, t2);
				append(div19, t3);
				append(div19, span0);
				append(span0, t4);
				append(div19, t5);
				append(div19, span1);
				append(span1, t6);
				append(div19, t7);
				append(div19, div18);
				append(div18, div3);
				if (if_block) if_block.m(div3, null);
				append(div3, t8);
				append(div3, div2);
				append(div2, div1);
				append(div1, t9);
				append(div1, t10);
				append(div1, t11);
				append(div1, input0);
				append(div2, t12);
				mount_component(type, div2, null);
				add_binding_callback(() => ctx.div3_binding(div3, null));
				append(div18, t13);
				append(div18, form_1);
				append(form_1, div5);
				append(div5, div4);
				append(div5, t15);
				append(div5, textarea0);
				append(form_1, t16);
				append(form_1, div7);
				append(div7, div6);
				append(div7, t18);
				append(div7, textarea1);

				textarea1.value = ctx.variables;

				append(form_1, t19);
				append(form_1, div9);
				append(div9, div8);
				append(div9, t21);
				append(div9, input1);
				append(form_1, t22);
				append(form_1, div10);
				append(div10, input2);
				add_binding_callback(() => ctx.form_1_binding(form_1, null));
				append(div18, t23);
				append(div18, div17);
				append(div17, div11);
				append(div17, t25);
				append(div17, div14);
				append(div14, div12);
				append(div12, t26);
				append(div12, span2);
				append(span2, t27);
				append(div14, t28);
				append(div14, div13);
				add_binding_callback(() => ctx.div13_binding(div13, null));
				append(div17, t29);
				append(div17, div16);
				append(div16, span3);
				append(div16, t31);
				append(div16, textarea2);
				add_binding_callback(() => ctx.textarea2_binding(textarea2, null));
				append(div16, t32);
				append(div16, div15);
				append(div15, input3);
				append(div15, t33);
				append(div15, span4);
				append(span4, t34);
				append(div15, t35);
				append(div15, span5);
				span5.innerHTML = ctx.evalErrors;
				current = true;
			},

			p: function update(changed, ctx) {
				if ((!current || changed.node) && t1_value !== (t1_value = ctx.node.name)) {
					set_data(t1, t1_value);
				}

				if ((!current || changed.vis) && a_class_value !== (a_class_value = "name " + (ctx.vis?'opened':'closed') + " svelte-1xt33sg")) {
					a.className = a_class_value;
				}

				if (!current || changed.testResult) {
					set_data(t4, ctx.testResult);
				}

				if ((!current || changed.node) && t6_value !== (t6_value = ctx.node.description)) {
					set_data(t6, t6_value);
				}

				if (ctx.node.args) {
					if (if_block) {
						if_block.p(changed, ctx);
						if_block.i(1);
					} else {
						if_block = create_if_block$3(ctx);
						if_block.c();
						if_block.i(1);
						if_block.m(div3, t8);
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

				if ((!current || changed.node) && t10_value !== (t10_value = ctx.node.type.kind == "LIST" ? '[...]': '')) {
					set_data(t10, t10_value);
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

				if ((!current || changed.response) && t27_value !== (t27_value = ctx.response?'':null)) {
					set_data(t27, t27_value);
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
					set_data(t34, ctx.testResult);
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
	        // if (node.name == "get_broadcast" && arg.getText){
	        //     console.log("inside ", arg)
	        // }

	        if (!arg.getText) continue
	        let text = arg.getText();
	        if (text) args.push(text);
	    }

	    let argsText = args.length == 0? '' : `(\n${ args.join(',\n') }\n)`;

	    return argsText
	}



	function generateQuery(){
	    // console.log("generateQuery")

	    let arglist = getArgsText();
	    let fieldlist =getTypeText ? getTypeText() : '';
	    // console.log("args=", arglist, "fieldlist", fieldlist)
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
	    // console.log(" Func onMount")
	});

		function change_handler(event) {
			bubble($$self, event);
		}

		function change_handler_1(event) {
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
	            console.log("node changed");
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
				add_location(div, file$6, 58, 10, 1110);
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
				add_location(div, file$6, 65, 10, 1338);
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
				add_location(div, file$6, 72, 10, 1573);
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
		var div, input, t0, h40, t2, t3, h41, t5, t6, h42, t8, current, dispose;

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
				input = element("input");
				t0 = space();
				h40 = element("h4");
				h40.textContent = "Queries";
				t2 = space();

				for (var i = 0; i < each_blocks_2.length; i += 1) {
					each_blocks_2[i].c();
				}

				t3 = space();
				h41 = element("h4");
				h41.textContent = "Mutations";
				t5 = space();

				for (var i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t6 = space();
				h42 = element("h4");
				h42.textContent = "User types";
				t8 = space();

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				attr(input, "type", "button");
				input.value = "test";
				add_location(input, file$6, 55, 5, 998);
				add_location(h40, file$6, 56, 5, 1057);
				add_location(h41, file$6, 63, 5, 1281);
				add_location(h42, file$6, 70, 5, 1515);
				add_location(div, file$6, 54, 0, 987);
				dispose = listen(input, "click", ctx.doTests);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, input);
				append(div, t0);
				append(div, h40);
				append(div, t2);

				for (var i = 0; i < each_blocks_2.length; i += 1) {
					each_blocks_2[i].m(div, null);
				}

				append(div, t3);
				append(div, h41);
				append(div, t5);

				for (var i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].m(div, null);
				}

				append(div, t6);
				append(div, h42);
				append(div, t8);

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
							each_blocks_2[i].m(div, t3);
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
							each_blocks_1[i].m(div, t6);
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

				dispose();
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
		

	let { scheme, url, parentid = '' } = $$props;

	let mutations =[];
	let queries =[];
	let types=[];
	let usertypes=[];

	function doTests(){
	    for (let o of queries) {
	        o.test();
	    }
	    for (let o of mutations) {
	        o.test();
	    }
	}

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
		};

		$$self.$$.update = ($$dirty = { scheme: 1 }) => {
			if ($$dirty.scheme) { {
	            $$invalidate('mutations', mutations =[]);
	            $$invalidate('queries', queries =[]);
	            $$invalidate('types', types=[]);
	            $$invalidate('usertypes', usertypes=[]);
	            
	            console.log("List scheme changed");
	            
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
			mutations,
			queries,
			usertypes,
			doTests,
			change_handler,
			change_handler_1,
			func_test_binding,
			func_test_binding_1
		};
	}

	class List extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$6, create_fragment$6, safe_not_equal, ["scheme", "url", "parentid"]);

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
	}

	/* src/App.svelte generated by Svelte v3.4.0 */

	const file$7 = "src/App.svelte";

	function create_fragment$7(ctx) {
		var div2, updating_url, updating_scheme, t0, div0, input0, t1, input1, t2, div1, current, dispose;

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

		var list = new List({
			props: {
			parentid: "" + ctx.parentid + "-List",
			url: ctx.url,
			scheme: ctx.scheme
		},
			$$inline: true
		});
		list.$on("change", ctx.changeHandler);

		return {
			c: function create() {
				div2 = element("div");
				schemer.$$.fragment.c();
				t0 = space();
				div0 = element("div");
				input0 = element("input");
				t1 = space();
				input1 = element("input");
				t2 = space();
				div1 = element("div");
				list.$$.fragment.c();
				attr(input0, "type", "button");
				input0.value = "save";
				input0.className = "svelte-o5nj5n";
				add_location(input0, file$7, 141, 8, 3077);
				attr(input1, "type", "button");
				input1.value = "restore";
				input1.className = "svelte-o5nj5n";
				add_location(input1, file$7, 142, 8, 3142);
				add_location(div0, file$7, 140, 4, 3063);
				div1.className = "main svelte-o5nj5n";
				add_location(div1, file$7, 144, 4, 3220);
				div2.className = "root svelte-o5nj5n";
				add_location(div2, file$7, 138, 0, 2938);

				dispose = [
					listen(input0, "click", ctx.saveFields),
					listen(input1, "click", ctx.restoreFields)
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div2, anchor);
				mount_component(schemer, div2, null);
				append(div2, t0);
				append(div2, div0);
				append(div0, input0);
				append(div0, t1);
				append(div0, input1);
				append(div2, t2);
				append(div2, div1);
				mount_component(list, div1, null);
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
				list.$set(list_changes);
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

				run_all(dispose);
			}
		};
	}

	function dispatchChangeEvent(element) {
	var event = new Event('change',{
	    view: window,
	    bubbles: true,
	    cancelable: true,
	    target: element
	});

	element.dispatchEvent(event);
	}

	function getControls() {
	let a =[];
	let inps=document.getElementsByTagName("input");  
	for (let inp of inps) {
	    let id = inp.getAttribute("id");
	    if (!id) continue
	    if (id[0]=='-') console.log(id);

	    let type = inp.getAttribute("type");
	    let value = inp.value;
	    let checked = inp.checked;
	    a.push({ id: id, type:type, checked:checked, value:value });
	}

	inps=document.getElementsByTagName("textarea");  
	for (let inp of inps) {
	    let id = inp.getAttribute("id");
	    if (!id) continue
	    if (id[0]=='-') console.log(id);

	    let type = "textarea";
	    let value = inp.value;
	    let checked = false;
	    a.push({ id: id, type:type, checked:checked, value:value });
	}

	return a
	}

	function instance$7($$self, $$props, $$invalidate) {
		

	let { parentid='tab1' } = $$props;


	let url;
	let scheme = {};
	let controls = [];
	let ignoreChanges = true;

	function restoreFieldsWithEvents( withEvents = false) {
	    for (let c of controls) {
	        let inp = document.getElementById(c.id);
	        if (!inp) continue
	        if (c.type == 'checkbox') {
	            inp.checked = c.checked;
	        } else {
	            inp.value = c.value;
	        }
	        // inp.checked = c.checked
	        // inp.value = c.value
	        if (withEvents) dispatchChangeEvent(inp);
	    }
	}


	function saveFields() {
	    $$invalidate('controls', controls = getControls());
	    // let key = `${window.location.href}|${url}`
	    let key = parentid;
	    let controlsStr = JSON.stringify(controls);
	    localStorage.setItem(key, JSON.stringify(controls));
	    console.log("saved: ", key, controlsStr.length );
	}


	function restoreFields() {
	    // let key = `${window.location.href}|${url}`
	    let key = parentid;
	    let controlsStr = localStorage.getItem(key);
	    $$invalidate('controls', controls = JSON.parse(controlsStr));


	    $$invalidate('ignoreChanges', ignoreChanges = true);
	    restoreFieldsWithEvents(false);
	    // restoreFieldsWithEvents(true)
	    // setTimeout(() => {
	    //     ignoreChanges = true
	    //     restoreFieldsWithEvents(false)
	    //     console.log("restored", key, controlsStr.length )
	    //     ignoreChanges = false
	    // }, 100);
	}



	function changeHandler(){
	    if (ignoreChanges) return
	    // saveFields()
	    // console.log('changeHandler')
	}



	onMount(async () => {
	    // restoreFields()
	});

		function schemer_url_binding(value) {
			url = value;
			$$invalidate('url', url);
		}

		function schemer_scheme_binding(value_1) {
			scheme = value_1;
			$$invalidate('scheme', scheme);
		}

		$$self.$set = $$props => {
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
		};

		return {
			parentid,
			url,
			scheme,
			saveFields,
			restoreFields,
			changeHandler,
			schemer_url_binding,
			schemer_scheme_binding
		};
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$7, create_fragment$7, safe_not_equal, ["parentid"]);
		}

		get parentid() {
			throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set parentid(value) {
			throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/AppTabbed.svelte generated by Svelte v3.4.0 */

	const file$8 = "src/AppTabbed.svelte";

	function create_fragment$8(ctx) {
		var div1, div0, t1, hr, t2, current;

		var app = new App({
			props: { parentid: "tab1" },
			$$inline: true
		});

		return {
			c: function create() {
				div1 = element("div");
				div0 = element("div");
				div0.textContent = "tab1";
				t1 = space();
				hr = element("hr");
				t2 = space();
				app.$$.fragment.c();
				add_location(div0, file$8, 9, 4, 80);
				add_location(hr, file$8, 12, 4, 110);
				add_location(div1, file$8, 8, 0, 70);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				append(div1, t1);
				append(div1, hr);
				append(div1, t2);
				mount_component(app, div1, null);
				current = true;
			},

			p: noop,

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
					detach(div1);
				}

				app.$destroy();
			}
		};
	}

	class AppTabbed extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, null, create_fragment$8, safe_not_equal, []);
		}
	}

	// import App from './App.svelte';


	var app = new AppTabbed({
		target: document.body
	});

	return app;

}());
//# sourceMappingURL=bundle.js.map

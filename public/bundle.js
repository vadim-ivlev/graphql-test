
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

	// (47:2) {#if visible}
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
		var div, form, label, t1, input0, t2, input1, t3, a, t4_value = ctx.visible?'Hide':'Show', t4, t5, t6, current, dispose;

		var if_block = (ctx.visible) && create_if_block(ctx);

		return {
			c: function create() {
				div = element("div");
				form = element("form");
				label = element("label");
				label.textContent = "GraphQL url";
				t1 = space();
				input0 = element("input");
				t2 = space();
				input1 = element("input");
				t3 = space();
				a = element("a");
				t4 = text(t4_value);
				t5 = text(" scheme");
				t6 = space();
				if (if_block) if_block.c();
				label.htmlFor = "inp0";
				add_location(label, file$1, 41, 4, 786);
				input0.className = "text svelte-1pdhvrm";
				attr(input0, "type", "text");
				input0.id = "inp0";
				input0.name = "inp0";
				add_location(input0, file$1, 42, 4, 828);
				attr(input1, "type", "button");
				input1.value = "refresh";
				input1.className = "svelte-1pdhvrm";
				add_location(input1, file$1, 43, 4, 915);
				a.href = true;
				add_location(a, file$1, 44, 4, 980);
				add_location(form, file$1, 40, 2, 775);
				div.className = "self svelte-1pdhvrm";
				add_location(div, file$1, 39, 0, 754);

				dispose = [
					listen(input0, "input", ctx.input0_input_handler),
					listen(input0, "change", ctx.change_handler),
					listen(input1, "click", ctx.getSchema),
					listen(a, "click", prevent_default(ctx.click_handler))
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, form);
				append(form, label);
				append(form, t1);
				append(form, input0);

				input0.value = ctx.url;

				append(form, t2);
				append(form, input1);
				append(form, t3);
				append(form, a);
				append(a, t4);
				append(a, t5);
				append(div, t6);
				if (if_block) if_block.m(div, null);
				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.url && (input0.value !== ctx.url)) input0.value = ctx.url;

				if ((!current || changed.visible) && t4_value !== (t4_value = ctx.visible?'Hide':'Show')) {
					set_data(t4, t4_value);
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

				if (if_block) if_block.d();
				run_all(dispose);
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		

	let { url = "http://localhost:7700/graphql", scheme = {} } = $$props;
	let visible = false;


	async function getSchema() {
	// scheme =  await $.ajax({ url: url, type: "POST", data: { query:queryString, variables: '{}'},});
	let resp = await fetch(url, { method: "POST", body: JSON.stringify({ query: queryString, variables: "{}" }) });
	$$invalidate('scheme', scheme = await resp.json());
	}


	onMount(async () => {
	    getSchema();
	});

		function change_handler(event) {
			bubble($$self, event);
		}

		function input0_input_handler() {
			url = this.value;
			$$invalidate('url', url);
		}

		function click_handler(e) {visible = ! visible; $$invalidate('visible', visible);}

		$$self.$set = $$props => {
			if ('url' in $$props) $$invalidate('url', url = $$props.url);
			if ('scheme' in $$props) $$invalidate('scheme', scheme = $$props.scheme);
		};

		return {
			url,
			scheme,
			visible,
			getSchema,
			change_handler,
			input0_input_handler,
			click_handler
		};
	}

	class Schemer extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, ["url", "scheme"]);
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

	function create_fragment$3(ctx) {
		var div, input, input_id_value, t0, span0, t1, t2, updating_getText, t3, br, span1, t4_value = ctx.node.description, t4, current, dispose;

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
				input = element("input");
				t0 = space();
				span0 = element("span");
				t1 = text(ctx.fieldName);
				t2 = space();
				type.$$.fragment.c();
				t3 = space();
				br = element("br");
				span1 = element("span");
				t4 = text(t4_value);
				attr(input, "type", "checkbox");
				input.id = input_id_value = "" + ctx.parentid + "-" + ctx.fieldName;
				input.className = "svelte-x6f70e";
				add_location(input, file$3, 80, 4, 1592);
				span0.className = "field-name svelte-x6f70e";
				add_location(span0, file$3, 81, 4, 1710);
				br.className = "svelte-x6f70e";
				add_location(br, file$3, 85, 4, 1965);
				span1.className = "field-description svelte-x6f70e";
				add_location(span1, file$3, 85, 8, 1969);
				div.className = "field svelte-x6f70e";
				add_location(div, file$3, 79, 0, 1549);

				dispose = [
					listen(input, "change", ctx.input_change_handler),
					listen(input, "change", ctx.change_handler)
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, input);

				input.checked = ctx.checked;

				add_binding_callback(() => ctx.input_binding(input, null));
				append(div, t0);
				append(div, span0);
				append(span0, t1);
				append(div, t2);
				mount_component(type, div, null);
				append(div, t3);
				append(div, br);
				append(div, span1);
				append(span1, t4);
				add_binding_callback(() => ctx.div_binding(div, null));
				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.checked) input.checked = ctx.checked;
				if (changed.items) {
					ctx.input_binding(null, input);
					ctx.input_binding(input, null);
				}

				if ((!current || changed.parentid) && input_id_value !== (input_id_value = "" + ctx.parentid + "-" + ctx.fieldName)) {
					input.id = input_id_value;
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

				if (changed.items) {
					ctx.div_binding(null, div);
					ctx.div_binding(div, null);
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

				ctx.input_binding(null, input);

				type.$destroy();

				ctx.div_binding(null, div);
				run_all(dispose);
			}
		};
	}

	function instance$3($$self, $$props, $$invalidate) {
		let { parentid = '', scheme, node, getText = function(e){
	    // console.log("TypeField getText() parentid = ", parentid, checkboxElement.checked)
	    if (checkboxElement.checked == false) return ''
	    
	    // let value = fieldName + typeComponent.getText()
	    let value = fieldName + getTypeText();
	    // let value = fieldName + typeFieldList
	    return value
	} } = $$props;


	// const dispatch = createEventDispatcher()
	// function dispatchEvent(e) {
	// 	dispatch('statechange', { text: 'State changed!', target: e.target })
	// }



	let root;
	let checked = true;
	let fieldName = node.name;
	let typeName = node.type.kind == "LIST" ? node.type.ofType.name : node.type.name;
	// let treeNode 
	// let typeFieldList
	let getTypeText;

	let checkboxElement;
	// let typeElement


	// $: {
	//     if (node) {
	//         if (!tree[fieldName]) tree[fieldName]={}
	//         treeNode=tree[fieldName]
	//         treeNode.checked = checked
	//         treeNode.typeName = typeName
	//         treeNode.getText = getText
	//     }
	// }

		function change_handler(event) {
			bubble($$self, event);
		}

		function change_handler_1(event) {
			bubble($$self, event);
		}

		function input_change_handler() {
			checked = this.checked;
			$$invalidate('checked', checked);
		}

		function input_binding($$node, check) {
			checkboxElement = $$node;
			$$invalidate('checkboxElement', checkboxElement);
		}

		function type_getText_binding(value) {
			getTypeText = value;
			$$invalidate('getTypeText', getTypeText);
		}

		function div_binding($$node, check) {
			root = $$node;
			$$invalidate('root', root);
		}

		$$self.$set = $$props => {
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
			if ('scheme' in $$props) $$invalidate('scheme', scheme = $$props.scheme);
			if ('node' in $$props) $$invalidate('node', node = $$props.node);
			if ('getText' in $$props) $$invalidate('getText', getText = $$props.getText);
		};

		return {
			parentid,
			scheme,
			node,
			getText,
			root,
			checked,
			fieldName,
			typeName,
			getTypeText,
			checkboxElement,
			change_handler,
			change_handler_1,
			input_change_handler,
			input_binding,
			type_getText_binding,
			div_binding
		};
	}

	class TypeField extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$3, create_fragment$3, safe_not_equal, ["parentid", "scheme", "node", "getText"]);

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

	// (188:0) {#if node}
	function create_if_block$1(ctx) {
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
				div.className = "self svelte-1bwk5o0";
				add_location(div, file$4, 188, 0, 3881);
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

	// (192:4) {:else}
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
				a.className = a_class_value = "" + (ctx.vis?'opened':'closed') + " svelte-1bwk5o0";
				a.href = true;
				add_location(a, file$4, 192, 8, 4003);
				span.className = "description svelte-1bwk5o0";
				add_location(span, file$4, 195, 16, 4212);
				div.className = "frame svelte-1bwk5o0";
				set_style(div, "display", (ctx.vis?'block':'none'));
				add_location(div, file$4, 194, 12, 4139);
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

				if ((!current || changed.vis) && a_class_value !== (a_class_value = "" + (ctx.vis?'opened':'closed') + " svelte-1bwk5o0")) {
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

	// (190:4) {#if node.kind=="SCALAR"}
	function create_if_block_1(ctx) {
		var span, t;

		return {
			c: function create() {
				span = element("span");
				t = text(ctx.typeName);
				span.className = "scalar-type svelte-1bwk5o0";
				add_location(span, file$4, 190, 9, 3939);
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

	// (197:16) {#if node.fields}
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
				div.className = "fieldlist svelte-1bwk5o0";
				add_location(div, file$4, 197, 20, 4318);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div, null);
				}

				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.scheme || changed.node || changed.parentid || changed.typeName || changed.fieldFunctions || changed.onFieldStateChange) {
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

	// (199:20) {#each node.fields as f,ind}
	function create_each_block(ctx) {
		var updating_getText, t, current;

		function typefield_getText_binding(value) {
			ctx.typefield_getText_binding.call(null, value, ctx);
			updating_getText = true;
			add_flush_callback(() => updating_getText = false);
		}

		let typefield_props = {
			scheme: ctx.scheme,
			node: ctx.f,
			parentid: "" + ctx.parentid + "-" + ctx.typeName
		};
		if (ctx.fieldFunctions[ctx.f.name] !== void 0) {
			typefield_props.getText = ctx.fieldFunctions[ctx.f.name];
		}
		var typefield = new TypeField({ props: typefield_props, $$inline: true });

		add_binding_callback(() => bind(typefield, 'getText', typefield_getText_binding));
		typefield.$on("change", ctx.onFieldStateChange);

		return {
			c: function create() {
				typefield.$$.fragment.c();
				t = space();
			},

			m: function mount(target, anchor) {
				mount_component(typefield, target, anchor);
				insert(target, t, anchor);
				current = true;
			},

			p: function update(changed, new_ctx) {
				ctx = new_ctx;
				var typefield_changes = {};
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

				if (detaching) {
					detach(t);
				}
			}
		};
	}

	function create_fragment$4(ctx) {
		var if_block_anchor, current;

		var if_block = (ctx.node) && create_if_block$1(ctx);

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
						if_block = create_if_block$1(ctx);
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
	let { parentid = '', scheme = {}, typeName = '', fieldList = '', getText = function () {
	    // console.log("Type getText parentid=", parentid)
	    let a =[];
	    let p = '  ';

	    // if (!node || !node.fields) return ''
	    // for (let f of node.fields) {
	    //     // let v = f.component.getText()
	    //     if (!f.getText) continue
	    //     let v = f.getText()
	        
	    //     if (v){
	    //         a.push( p + v )
	    //     }
	    // }

	    for (let key in fieldFunctions) {
	        // console.log(key)
	        let v = fieldFunctions[key]();
	        if (v){
	            a.push( p + v );
	        }
	    }

	    if (a.length > 0) {
	        return '{\n' +a.join('\n') + '\n'+p+'}'
	    }
	    return ''
	} } = $$props;

	let fieldFunctions = {};



	// let nodes 
	let node = getNode(scheme, typeName);
	let vis = false;


	const dispatch = createEventDispatcher();
	function dispatchEvent(e) {
		dispatch('change', { text: 'State changed!', target: e.target });
	}





	// function getFields(n, level){
	//     let a =[]
	//     let p = '  '
	//     for (let key in n) {
	//         if (n[key].checked){
	//             a.push( p.repeat(level+1)+ key + getFields(n[key], level+1) )
	//         }
	//     }
	//     if (a.length > 0) {
	//         return '{\n' +a.join('\n') + '\n'+p.repeat(level)+ '}'
	//     }
	//     return ''
	// }

	// function showTree(e) {
	//     console.log(fieldList)
	// }

	function onFieldStateChange(e) {
	//    fieldList = getFields(tree,0) 
	//    fieldList = getText()
	   dispatchEvent(e);
	//    console.log(e)
	//    console.log(fieldList)
	}

	onMount(async () => {
	    // fieldList = getFields(tree,0)
	    $$invalidate('fieldList', fieldList = getText());    
	});

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
			if ('fieldList' in $$props) $$invalidate('fieldList', fieldList = $$props.fieldList);
			if ('getText' in $$props) $$invalidate('getText', getText = $$props.getText);
		};

		return {
			parentid,
			scheme,
			typeName,
			fieldList,
			getText,
			fieldFunctions,
			node,
			vis,
			onFieldStateChange,
			click_handler,
			typefield_getText_binding
		};
	}

	class Type extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$4, create_fragment$4, safe_not_equal, ["parentid", "scheme", "typeName", "fieldList", "getText"]);
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

		get fieldList() {
			throw new Error("<Type>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set fieldList(value) {
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

	// (335:12) {#if node.args}
	function create_if_block$2(ctx) {
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
				div0.className = "header svelte-crq5wd";
				add_location(div0, file$5, 335, 12, 7376);
				div1.className = "fieldlist svelte-crq5wd";
				add_location(div1, file$5, 336, 12, 7425);
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

	// (338:16) {#each node.args as arg, index (arg.name)}
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
		argument.$on("change", ctx.getArgsList);

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
		var a, t0_value = ctx.node.name, t0, t1, a_class_value, t2, span0, t3, t4, span1, t5_value = ctx.node.description, t5, t6, div17, div2, t7, div1, div0, t8, t9_value = ctx.node.type.kind == "LIST" ? '[...]': '', t9, t10, input0, t11, updating_getText, t12, form_1, div4, div3, t14, textarea0, textarea0_id_value, t15, div6, div5, t17, textarea1, textarea1_id_value, t18, div8, div7, t20, input1, t21, div9, input2, t22, div16, div10, t24, div13, div11, t25, span2, t26_value = ctx.response?'':null, t26, t27, div12, t28, div15, span3, t30, textarea2, textarea2_id_value, t31, div14, input3, t32, span4, t33, t34, span5, current, dispose;

		var if_block = (ctx.node.args) && create_if_block$2(ctx);

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
				div17 = element("div");
				div2 = element("div");
				if (if_block) if_block.c();
				t7 = space();
				div1 = element("div");
				div0 = element("div");
				t8 = text("RETURNS ");
				t9 = text(t9_value);
				t10 = space();
				input0 = element("input");
				t11 = space();
				type.$$.fragment.c();
				t12 = space();
				form_1 = element("form");
				div4 = element("div");
				div3 = element("div");
				div3.textContent = "QUERY";
				t14 = space();
				textarea0 = element("textarea");
				t15 = space();
				div6 = element("div");
				div5 = element("div");
				div5.textContent = "VARIABLES";
				t17 = space();
				textarea1 = element("textarea");
				t18 = space();
				div8 = element("div");
				div7 = element("div");
				div7.textContent = "FILE";
				t20 = space();
				input1 = element("input");
				t21 = space();
				div9 = element("div");
				input2 = element("input");
				t22 = space();
				div16 = element("div");
				div10 = element("div");
				div10.textContent = "RESPONSE";
				t24 = space();
				div13 = element("div");
				div11 = element("div");
				t25 = text("response = ");
				span2 = element("span");
				t26 = text(t26_value);
				t27 = space();
				div12 = element("div");
				t28 = space();
				div15 = element("div");
				span3 = element("span");
				span3.textContent = "TEST";
				t30 = space();
				textarea2 = element("textarea");
				t31 = space();
				div14 = element("div");
				input3 = element("input");
				t32 = space();
				span4 = element("span");
				t33 = text(ctx.testResult);
				t34 = space();
				span5 = element("span");
				a.className = a_class_value = "name " + (ctx.vis?'opened':'closed') + " svelte-crq5wd";
				a.href = true;
				add_location(a, file$5, 326, 0, 6971);
				span0.className = "test-result svelte-crq5wd";
				add_location(span0, file$5, 327, 0, 7081);
				span1.className = "description svelte-crq5wd";
				add_location(span1, file$5, 328, 0, 7128);
				attr(input0, "type", "button");
				input0.value = "getText";
				add_location(input0, file$5, 346, 16, 7845);
				div0.className = "header svelte-crq5wd";
				add_location(div0, file$5, 345, 16, 7759);
				add_location(div1, file$5, 344, 12, 7737);
				div2.className = "form-area svelte-crq5wd";
				add_location(div2, file$5, 332, 4, 7290);
				div3.className = "header svelte-crq5wd";
				add_location(div3, file$5, 358, 12, 8400);
				textarea0.id = textarea0_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-query";
				textarea0.name = "query";
				textarea0.className = "query svelte-crq5wd";
				textarea0.value = ctx.request;
				add_location(textarea0, file$5, 359, 12, 8445);
				add_location(div4, file$5, 357, 8, 8382);
				div5.className = "header svelte-crq5wd";
				add_location(div5, file$5, 362, 12, 8610);
				textarea1.id = textarea1_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-variables";
				textarea1.name = "variables";
				textarea1.className = "variables svelte-crq5wd";
				add_location(textarea1, file$5, 363, 12, 8659);
				add_location(div6, file$5, 361, 8, 8592);
				div7.className = "header svelte-crq5wd";
				add_location(div7, file$5, 366, 12, 8828);
				attr(input1, "type", "file");
				input1.name = "input-file";
				add_location(input1, file$5, 367, 12, 8871);
				add_location(div8, file$5, 365, 8, 8810);
				attr(input2, "type", "submit");
				input2.value = "TEST";
				input2.className = "svelte-crq5wd";
				add_location(input2, file$5, 370, 12, 8966);
				div9.className = "buttons svelte-crq5wd";
				add_location(div9, file$5, 369, 8, 8932);
				form_1.className = "svelte-crq5wd";
				add_location(form_1, file$5, 356, 4, 8327);
				div10.className = "header svelte-crq5wd";
				add_location(div10, file$5, 376, 8, 9071);
				span2.className = "json-literal";
				add_location(span2, file$5, 378, 28, 9170);
				add_location(div11, file$5, 378, 12, 9154);
				div12.className = "response svelte-crq5wd";
				add_location(div12, file$5, 379, 12, 9241);
				div13.className = "response-area svelte-crq5wd";
				add_location(div13, file$5, 377, 8, 9114);
				span3.className = "header svelte-crq5wd";
				add_location(span3, file$5, 382, 12, 9354);
				textarea2.rows = "3";
				textarea2.id = textarea2_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-eval-text";
				textarea2.className = "eval-text svelte-crq5wd";
				textarea2.value = "response != null";
				add_location(textarea2, file$5, 383, 12, 9399);
				attr(input3, "type", "button");
				input3.className = "try-button svelte-crq5wd";
				input3.value = "TRY THE CODE";
				add_location(input3, file$5, 385, 16, 9580);
				span4.className = "eval-result svelte-crq5wd";
				add_location(span4, file$5, 386, 16, 9678);
				span5.className = "eval-errors svelte-crq5wd";
				add_location(span5, file$5, 387, 16, 9740);
				div14.className = "buttons2 svelte-crq5wd";
				add_location(div14, file$5, 384, 12, 9541);
				div15.className = "eval-area svelte-crq5wd";
				add_location(div15, file$5, 381, 8, 9318);
				div16.className = "result-panel svelte-crq5wd";
				add_location(div16, file$5, 375, 4, 9036);
				div17.className = "root svelte-crq5wd";
				set_style(div17, "display", (ctx.vis?'grid':'none'));
				add_location(div17, file$5, 330, 0, 7199);

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
				insert(target, a, anchor);
				append(a, t0);
				append(a, t1);
				insert(target, t2, anchor);
				insert(target, span0, anchor);
				append(span0, t3);
				insert(target, t4, anchor);
				insert(target, span1, anchor);
				append(span1, t5);
				insert(target, t6, anchor);
				insert(target, div17, anchor);
				append(div17, div2);
				if (if_block) if_block.m(div2, null);
				append(div2, t7);
				append(div2, div1);
				append(div1, div0);
				append(div0, t8);
				append(div0, t9);
				append(div0, t10);
				append(div0, input0);
				append(div1, t11);
				mount_component(type, div1, null);
				add_binding_callback(() => ctx.div2_binding(div2, null));
				append(div17, t12);
				append(div17, form_1);
				append(form_1, div4);
				append(div4, div3);
				append(div4, t14);
				append(div4, textarea0);
				add_binding_callback(() => ctx.textarea0_binding(textarea0, null));
				append(form_1, t15);
				append(form_1, div6);
				append(div6, div5);
				append(div6, t17);
				append(div6, textarea1);

				textarea1.value = ctx.variables;

				append(form_1, t18);
				append(form_1, div8);
				append(div8, div7);
				append(div8, t20);
				append(div8, input1);
				append(form_1, t21);
				append(form_1, div9);
				append(div9, input2);
				add_binding_callback(() => ctx.form_1_binding(form_1, null));
				append(div17, t22);
				append(div17, div16);
				append(div16, div10);
				append(div16, t24);
				append(div16, div13);
				append(div13, div11);
				append(div11, t25);
				append(div11, span2);
				append(span2, t26);
				append(div13, t27);
				append(div13, div12);
				add_binding_callback(() => ctx.div12_binding(div12, null));
				append(div16, t28);
				append(div16, div15);
				append(div15, span3);
				append(div15, t30);
				append(div15, textarea2);
				add_binding_callback(() => ctx.textarea2_binding(textarea2, null));
				append(div15, t31);
				append(div15, div14);
				append(div14, input3);
				append(div14, t32);
				append(div14, span4);
				append(span4, t33);
				append(div14, t34);
				append(div14, span5);
				span5.innerHTML = ctx.evalErrors;
				current = true;
			},

			p: function update(changed, ctx) {
				if ((!current || changed.node) && t0_value !== (t0_value = ctx.node.name)) {
					set_data(t0, t0_value);
				}

				if ((!current || changed.vis) && a_class_value !== (a_class_value = "name " + (ctx.vis?'opened':'closed') + " svelte-crq5wd")) {
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
						if_block = create_if_block$2(ctx);
						if_block.c();
						if_block.i(1);
						if_block.m(div2, t7);
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
					ctx.div2_binding(null, div2);
					ctx.div2_binding(div2, null);
				}
				if (changed.items) {
					ctx.textarea0_binding(null, textarea0);
					ctx.textarea0_binding(textarea0, null);
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
					ctx.div12_binding(null, div12);
					ctx.div12_binding(div12, null);
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
					set_style(div17, "display", (ctx.vis?'grid':'none'));
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
					detach(a);
					detach(t2);
					detach(span0);
					detach(t4);
					detach(span1);
					detach(t6);
					detach(div17);
				}

				if (if_block) if_block.d();

				type.$destroy();

				ctx.div2_binding(null, div2);
				ctx.textarea0_binding(null, textarea0);
				ctx.form_1_binding(null, form_1);
				ctx.div12_binding(null, div12);
				ctx.textarea2_binding(null, textarea2);
				run_all(dispose);
			}
		};
	}

	function instance$5($$self, $$props, $$invalidate) {
		

	// P R O P S
	let { url, parentid = '', scheme = {}, node = {}, operation = "", test = submitForm, getArgs = getArgsList, getFields = function(){
	    if (getTypeText) $$invalidate('fieldlist', fieldlist = getTypeText());
	} } = $$props;

	let testResult ='';
	let evalErrors ='';
	let vis = false;
	let fieldlist = '';
	let arglist = '';
	let request; //= ''
	let variables = '';
	let response = null;

	// $: returnType = node.graphqlType = node.type.name || node.type.ofType.name

	const dispatch = createEventDispatcher();
	function dispatchEvent() {
		dispatch('change', { text: 'State changed!' });
	}



	// function doTest(){
	//     testResult = "passed"
	// }



	function getArgsText() {
	    // let checked = node.args.filter( n => n.checked && n.value != null )
	    // let args = checked.map( n => {
	    //     let val = n.graphqlType == 'String'?`"${n.value.replace(/"/g,'\\"')}"`: n.value
	    //     return `  ${n.name}:${val}`
	    // })

	    let args = [];
	    for (let arg of node.args) {
	        if (!arg.getText) continue
	        let text = arg.getText();
	        if (text) args.push(text);
	    }

	    let argsText = args.length == 0? '' : `(\n${ args.join(',\n') }\n)`;
	    return argsText
	}

	function getArgsList() {
	    $$invalidate('arglist', arglist = getArgsText()); 
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
	            // testResult = "passed" +JSON.stringify(res, null,'  ').length
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


	let getTypeText;
	function typeChangeHandler(params) {
	    console.log("typeChangeHandler");
	    // request = `${operation} {\n${node.name}${arglist}\n${fieldlist}\n}`
	    // fieldlist = getTypeText()
	    if (getTypeText) $$invalidate('fieldlist', fieldlist = getTypeText());
	    // console.log(fieldlist)
	}


	let form;
	// let rootArea
	let formArea;
	let queryArea;
	let responseArea;
	let evalTextarea;

	onMount(async () => {
	    getArgsList();
	    if (getTypeText) $$invalidate('fieldlist', fieldlist = getTypeText());
	    window.$(formArea).resizable({ handles: "e" });
	    window.$(form).resizable({ handles: "e" });
	    console.log(" Func onMount");
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

		function div2_binding($$node, check) {
			formArea = $$node;
			$$invalidate('formArea', formArea);
		}

		function textarea0_binding($$node, check) {
			queryArea = $$node;
			$$invalidate('queryArea', queryArea);
		}

		function textarea1_input_handler() {
			variables = this.value;
			$$invalidate('variables', variables);
		}

		function form_1_binding($$node, check) {
			form = $$node;
			$$invalidate('form', form);
		}

		function div12_binding($$node, check) {
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
			if ('getArgs' in $$props) $$invalidate('getArgs', getArgs = $$props.getArgs);
			if ('getFields' in $$props) $$invalidate('getFields', getFields = $$props.getFields);
		};

		$$self.$$.update = ($$dirty = { node: 1, getTypeText: 1, operation: 1, arglist: 1, fieldlist: 1 }) => {
			if ($$dirty.node || $$dirty.getTypeText) { {
	            console.log("Func node changed");
	            // arglist = getArgsText() 
	            if (getTypeText) $$invalidate('fieldlist', fieldlist = getTypeText());
	        } }
			if ($$dirty.operation || $$dirty.node || $$dirty.arglist || $$dirty.fieldlist) { {
	            $$invalidate('request', request = `${operation} {\n${node.name}${arglist}\n${fieldlist}\n}`);
	            dispatchEvent();
	        } }
		};

		return {
			url,
			parentid,
			scheme,
			node,
			operation,
			test,
			getArgs,
			getFields,
			testResult,
			evalErrors,
			vis,
			request,
			variables,
			response,
			getArgsList,
			submitForm,
			evaluate,
			getTypeText,
			typeChangeHandler,
			form,
			formArea,
			queryArea,
			responseArea,
			evalTextarea,
			console,
			change_handler,
			change_handler_1,
			click_handler,
			argument_getText_binding,
			click_handler_1,
			type_getText_binding,
			div2_binding,
			textarea0_binding,
			textarea1_input_handler,
			form_1_binding,
			div12_binding,
			textarea2_binding
		};
	}

	class Func extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$5, create_fragment$5, safe_not_equal, ["url", "parentid", "scheme", "node", "operation", "test", "getArgs", "getFields"]);

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

		get getArgs() {
			throw new Error("<Func>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set getArgs(value) {
			throw new Error("<Func>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get getFields() {
			throw new Error("<Func>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set getFields(value) {
			throw new Error("<Func>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/List.svelte generated by Svelte v3.4.0 */

	const file$6 = "src/List.svelte";

	function get_each_context$2(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.e = list[i];
		return child_ctx;
	}

	function get_each_context_1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.e = list[i];
		child_ctx.each_value_1 = list;
		child_ctx.e_index_1 = i;
		return child_ctx;
	}

	// (48:5) {#each queries as e}
	function create_each_block_1(ctx) {
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
			parentid: "query"
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
				add_location(div, file$6, 48, 10, 991);
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

	// (55:5) {#each mutations as e}
	function create_each_block$2(ctx) {
		var div, t, current;

		var func = new Func({
			props: {
			url: ctx.url,
			node: ctx.e,
			operation: "mutation",
			scheme: ctx.scheme,
			parentid: "mutation"
		},
			$$inline: true
		});
		func.$on("change", ctx.change_handler_1);

		return {
			c: function create() {
				div = element("div");
				func.$$.fragment.c();
				t = space();
				add_location(div, file$6, 55, 10, 1208);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				mount_component(func, div, null);
				append(div, t);
				current = true;
			},

			p: function update(changed, ctx) {
				var func_changes = {};
				if (changed.url) func_changes.url = ctx.url;
				if (changed.mutations) func_changes.node = ctx.e;
				if (changed.scheme) func_changes.scheme = ctx.scheme;
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

	function create_fragment$6(ctx) {
		var div, input, t0, h40, t2, t3, h41, t5, current, dispose;

		var each_value_1 = ctx.queries;

		var each_blocks_1 = [];

		for (var i = 0; i < each_value_1.length; i += 1) {
			each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
		}

		function outro_block(i, detaching, local) {
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

		var each_value = ctx.mutations;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
		}

		function outro_block_1(i, detaching, local) {
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

				for (var i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t3 = space();
				h41 = element("h4");
				h41.textContent = "Mutations";
				t5 = space();

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				attr(input, "type", "button");
				input.value = "test";
				add_location(input, file$6, 45, 5, 879);
				add_location(h40, file$6, 46, 5, 938);
				add_location(h41, file$6, 53, 5, 1151);
				add_location(div, file$6, 44, 0, 868);
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

				for (var i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].m(div, null);
				}

				append(div, t3);
				append(div, h41);
				append(div, t5);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div, null);
				}

				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.url || changed.queries || changed.scheme) {
					each_value_1 = ctx.queries;

					for (var i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1(ctx, each_value_1, i);

						if (each_blocks_1[i]) {
							each_blocks_1[i].p(changed, child_ctx);
							each_blocks_1[i].i(1);
						} else {
							each_blocks_1[i] = create_each_block_1(child_ctx);
							each_blocks_1[i].c();
							each_blocks_1[i].i(1);
							each_blocks_1[i].m(div, t3);
						}
					}

					group_outros();
					for (; i < each_blocks_1.length; i += 1) outro_block(i, 1, 1);
					check_outros();
				}

				if (changed.url || changed.mutations || changed.scheme) {
					each_value = ctx.mutations;

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
					for (; i < each_blocks.length; i += 1) outro_block_1(i, 1, 1);
					check_outros();
				}
			},

			i: function intro(local) {
				if (current) return;
				for (var i = 0; i < each_value_1.length; i += 1) each_blocks_1[i].i();

				for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

				current = true;
			},

			o: function outro(local) {
				each_blocks_1 = each_blocks_1.filter(Boolean);
				for (let i = 0; i < each_blocks_1.length; i += 1) outro_block(i, 0);

				each_blocks = each_blocks.filter(Boolean);
				for (let i = 0; i < each_blocks.length; i += 1) outro_block_1(i, 0);

				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

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
		

	let { scheme, url } = $$props; 

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
	    // console.log(queries)
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

		$$self.$set = $$props => {
			if ('scheme' in $$props) $$invalidate('scheme', scheme = $$props.scheme);
			if ('url' in $$props) $$invalidate('url', url = $$props.url);
		};

		$$self.$$.update = ($$dirty = { scheme: 1 }) => {
			if ($$dirty.scheme) { try {
	            $$invalidate('mutations', mutations = scheme.data.__schema.mutationType.fields);
	            $$invalidate('queries', queries = scheme.data.__schema.queryType.fields);
	            $$invalidate('types', types = scheme.data.__schema.types.sort(compareTypes));
	            $$invalidate('usertypes', usertypes = scheme.data.__schema.types.filter(t => t.name[0]!='_' && t.kind == 'OBJECT' && t.name != 'Query' && t.name != 'Mutation').sort(compareTypes));
	            } catch(e){} }
		};

		return {
			scheme,
			url,
			mutations,
			queries,
			doTests,
			change_handler,
			change_handler_1,
			func_test_binding
		};
	}

	class List extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$6, create_fragment$6, safe_not_equal, ["scheme", "url"]);

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

		let schemer_props = {};
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
				add_location(input0, file$7, 143, 8, 3211);
				attr(input1, "type", "button");
				input1.value = "restore";
				input1.className = "svelte-o5nj5n";
				add_location(input1, file$7, 144, 8, 3276);
				add_location(div0, file$7, 142, 4, 3197);
				div1.className = "main svelte-o5nj5n";
				add_location(div1, file$7, 146, 4, 3354);
				div2.className = "root svelte-o5nj5n";
				add_location(div2, file$7, 140, 0, 3111);

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
				if (!updating_url && changed.url) {
					schemer_changes.url = ctx.url;
				}
				if (!updating_scheme && changed.scheme) {
					schemer_changes.scheme = ctx.scheme;
				}
				schemer.$set(schemer_changes);

				var list_changes = {};
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

	// if ("createEvent" in document) {
	//     var evt = document.createEvent("HTMLEvents");
	//     evt.initEvent("change", false, true);
	//     element.dispatchEvent(evt);
	// }
	// else
	//     element.fireEvent("onchange");
	}

	function getControls() {
	let a =[];
	let inps=document.getElementsByTagName("input");  
	for (let inp of inps) {
	    let id = inp.getAttribute("id");
	    if (!id) continue
	    // if (id[0]=='-') console.log(id)

	    let type = inp.getAttribute("type");
	    let value = inp.value;
	    let checked = inp.checked;
	    a.push({ id: id, type:type, checked:checked, value:value });
	}

	inps=document.getElementsByTagName("textarea");  
	for (let inp of inps) {
	    let id = inp.getAttribute("id");
	    if (!id) continue
	    // if (id[0]=='-') console.log(id)

	    let type = "textarea";
	    let value = inp.value;
	    let checked = false;
	    a.push({ id: id, type:type, checked:checked, value:value });
	}

	return a
	}

	function instance$7($$self, $$props, $$invalidate) {
		

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
	    let key = `${window.location.href}|${url}`;
	    let controlsStr = JSON.stringify(controls);
	    localStorage.setItem(key, JSON.stringify(controls));
	    console.log("saved: ", key, controlsStr.length );
	}


	function restoreFields() {
	    let key = `${window.location.href}|${url}`;
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

		return {
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
			init(this, options, instance$7, create_fragment$7, safe_not_equal, []);
		}
	}

	var app = new App({
		target: document.body
	});

	return app;

}());
//# sourceMappingURL=bundle.js.map

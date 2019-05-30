
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
		var div, input0, input0_id_value, input0_disabled_value, t0, span0, t1_value = ctx.node.name, t1, span0_class_value, t2, input1, input1_id_value, input1_name_value, input1_disabled_value, input1_placeholder_value, t3, span2, t4_value = ctx.node.graphqlType, t4, t5, span1, t6_value = ctx.node.type.kind=='NON_NULL'?' !':'', t6, span2_class_value, t7, br, span3, t8_value = ctx.node.description, t8, span3_class_value, dispose;

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
				t4 = text(t4_value);
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
				input0.className = "svelte-19wistz";
				add_location(input0, file$2, 83, 4, 1566);
				span0.className = span0_class_value = "argname " + (ctx.node.checked?'':'disabled') + " svelte-19wistz";
				add_location(span0, file$2, 84, 4, 1709);
				input1.id = input1_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-input";
				input1.className = "input svelte-19wistz";
				input1.name = input1_name_value = ctx.node.name;
				input1.disabled = input1_disabled_value = !ctx.node.checked;
				input1.placeholder = input1_placeholder_value = ctx.node.value==''?'':null;
				add_location(input1, file$2, 85, 4, 1783);
				span1.className = "exclamation svelte-19wistz";
				add_location(span1, file$2, 87, 4, 2050);
				span2.className = span2_class_value = "oftype " + (ctx.node.checked?'':'disabled') + " svelte-19wistz";
				add_location(span2, file$2, 86, 4, 1977);
				add_location(br, file$2, 90, 4, 2142);
				span3.className = span3_class_value = "description " + (ctx.node.checked?'':'disabled') + " svelte-19wistz";
				add_location(span3, file$2, 90, 8, 2146);
				div.className = "field svelte-19wistz";
				add_location(div, file$2, 82, 0, 1539);

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

				input0.checked = ctx.node.checked;

				append(div, t0);
				append(div, span0);
				append(span0, t1);
				append(div, t2);
				append(div, input1);

				input1.value = ctx.node.value;

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
				if (changed.node) input0.checked = ctx.node.checked;

				if ((changed.parentid || changed.node) && input0_id_value !== (input0_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-checkbox")) {
					input0.id = input0_id_value;
				}

				if ((changed.node) && input0_disabled_value !== (input0_disabled_value = ctx.node.type.kind=='NON_NULL')) {
					input0.disabled = input0_disabled_value;
				}

				if ((changed.node) && t1_value !== (t1_value = ctx.node.name)) {
					set_data(t1, t1_value);
				}

				if ((changed.node) && span0_class_value !== (span0_class_value = "argname " + (ctx.node.checked?'':'disabled') + " svelte-19wistz")) {
					span0.className = span0_class_value;
				}

				if (changed.node && (input1.value !== ctx.node.value)) input1.value = ctx.node.value;
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

				if ((changed.node) && input1_disabled_value !== (input1_disabled_value = !ctx.node.checked)) {
					input1.disabled = input1_disabled_value;
				}

				if ((changed.node) && input1_placeholder_value !== (input1_placeholder_value = ctx.node.value==''?'':null)) {
					input1.placeholder = input1_placeholder_value;
				}

				if ((changed.node) && t4_value !== (t4_value = ctx.node.graphqlType)) {
					set_data(t4, t4_value);
				}

				if ((changed.node) && t6_value !== (t6_value = ctx.node.type.kind=='NON_NULL'?' !':'')) {
					set_data(t6, t6_value);
				}

				if ((changed.node) && span2_class_value !== (span2_class_value = "oftype " + (ctx.node.checked?'':'disabled') + " svelte-19wistz")) {
					span2.className = span2_class_value;
				}

				if ((changed.node) && t8_value !== (t8_value = ctx.node.description)) {
					set_data(t8, t8_value);
				}

				if ((changed.node) && span3_class_value !== (span3_class_value = "description " + (ctx.node.checked?'':'disabled') + " svelte-19wistz")) {
					span3.className = span3_class_value;
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				ctx.input1_binding(null, input1);
				run_all(dispose);
			}
		};
	}

	function instance$2($$self, $$props, $$invalidate) {
		// P R O P S
	let { parentid = '', node = {} } = $$props;
	// export let checked = true
	// export let name = node.name 
	// export let value = node.defaultValue
	// export let graphqlType = node.type.name || node.type.ofType.name

	if (node.checked === undefined)     { node.checked = true; $$invalidate('node', node); }
	if (node.graphqlType === undefined) { node.graphqlType = node.type.name || node.type.ofType.name; $$invalidate('node', node); }
	if (node.value === undefined)       { node.value = node.defaultValue ||  (node.graphqlType=='Int'?0:'some text'); $$invalidate('node', node); }




	let input;
	let inputType = node.graphqlType=='Int'?'number':'text';


	onMount(async () => {
	    input.setAttribute('type', inputType);
	});

		function change_handler(event) {
			bubble($$self, event);
		}

		function change_handler_1(event) {
			bubble($$self, event);
		}

		function input0_change_handler() {
			node.checked = this.checked;
			$$invalidate('node', node);
		}

		function input1_input_handler() {
			node.value = this.value;
			$$invalidate('node', node);
		}

		function input1_binding($$node, check) {
			input = $$node;
			$$invalidate('input', input);
		}

		$$self.$set = $$props => {
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
			if ('node' in $$props) $$invalidate('node', node = $$props.node);
		};

		return {
			parentid,
			node,
			input,
			change_handler,
			change_handler_1,
			input0_change_handler,
			input1_input_handler,
			input1_binding
		};
	}

	class Argument extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$2, create_fragment$2, safe_not_equal, ["parentid", "node"]);
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
	}

	/* src/TypeField.svelte generated by Svelte v3.4.0 */

	const file$3 = "src/TypeField.svelte";

	function create_fragment$3(ctx) {
		var div, input, input_id_value, t0, span0, t1, t2, t3, br, span1, t4_value = ctx.node.description, t4, current, dispose;

		var type = new Type({
			props: {
			scheme: ctx.scheme,
			typeName: ctx.typeName,
			tree: ctx.tree[ctx.fieldName],
			parentid: "" + ctx.parentid + "-" + ctx.fieldName + "-type"
		},
			$$inline: true
		});
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
				add_location(input, file$3, 63, 4, 1118);
				span0.className = "field-name svelte-x6f70e";
				add_location(span0, file$3, 64, 4, 1208);
				br.className = "svelte-x6f70e";
				add_location(br, file$3, 66, 4, 1377);
				span1.className = "field-description svelte-x6f70e";
				add_location(span1, file$3, 66, 8, 1381);
				div.className = "field svelte-x6f70e";
				add_location(div, file$3, 62, 0, 1075);

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

				if ((!current || changed.parentid) && input_id_value !== (input_id_value = "" + ctx.parentid + "-" + ctx.fieldName)) {
					input.id = input_id_value;
				}

				var type_changes = {};
				if (changed.scheme) type_changes.scheme = ctx.scheme;
				if (changed.typeName) type_changes.typeName = ctx.typeName;
				if (changed.tree || changed.fieldName) type_changes.tree = ctx.tree[ctx.fieldName];
				if (changed.parentid || changed.fieldName) type_changes.parentid = "" + ctx.parentid + "-" + ctx.fieldName + "-type";
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

				type.$destroy();

				ctx.div_binding(null, div);
				run_all(dispose);
			}
		};
	}

	function instance$3($$self, $$props, $$invalidate) {
		let { parentid = '', scheme, node, tree = {} } = $$props;

	// const dispatch = createEventDispatcher()
	// function dispatchEvent(e) {
	// 	dispatch('statechange', { text: 'State changed!', target: e.target })
	// }



	let root;
	let checked = true;
	let fieldName = node.name;
	let typeName = node.type.kind == "LIST" ? node.type.ofType.name : node.type.name;
	let treeNode;

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

		function div_binding($$node, check) {
			root = $$node;
			$$invalidate('root', root);
		}

		$$self.$set = $$props => {
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
			if ('scheme' in $$props) $$invalidate('scheme', scheme = $$props.scheme);
			if ('node' in $$props) $$invalidate('node', node = $$props.node);
			if ('tree' in $$props) $$invalidate('tree', tree = $$props.tree);
		};

		$$self.$$.update = ($$dirty = { node: 1, tree: 1, fieldName: 1, checked: 1, typeName: 1 }) => {
			if ($$dirty.node || $$dirty.tree || $$dirty.fieldName || $$dirty.checked || $$dirty.typeName) { {
	            if (node) {
	                if (!tree[fieldName]) { tree[fieldName]={}; $$invalidate('tree', tree), $$invalidate('node', node), $$invalidate('fieldName', fieldName), $$invalidate('checked', checked), $$invalidate('typeName', typeName); }
	                tree[fieldName].checked = checked; $$invalidate('tree', tree), $$invalidate('node', node), $$invalidate('fieldName', fieldName), $$invalidate('checked', checked), $$invalidate('typeName', typeName);
	                tree[fieldName].typeName = typeName; $$invalidate('tree', tree), $$invalidate('node', node), $$invalidate('fieldName', fieldName), $$invalidate('checked', checked), $$invalidate('typeName', typeName);
	                $$invalidate('treeNode', treeNode=tree[fieldName]);
	            }
	        } }
		};

		return {
			parentid,
			scheme,
			node,
			tree,
			root,
			checked,
			fieldName,
			typeName,
			change_handler,
			change_handler_1,
			input_change_handler,
			div_binding
		};
	}

	class TypeField extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$3, create_fragment$3, safe_not_equal, ["parentid", "scheme", "node", "tree"]);

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

		get tree() {
			throw new Error("<TypeField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set tree(value) {
			throw new Error("<TypeField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/Type.svelte generated by Svelte v3.4.0 */

	const file$4 = "src/Type.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.f = list[i];
		return child_ctx;
	}

	// (137:0) {#if node}
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
				div.className = "self svelte-1680n0b";
				add_location(div, file$4, 137, 0, 2673);
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

	// (141:4) {:else}
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
				a.className = a_class_value = "" + (ctx.vis?'opened':'closed') + " svelte-1680n0b";
				a.href = true;
				add_location(a, file$4, 141, 8, 2795);
				span.className = "description svelte-1680n0b";
				add_location(span, file$4, 144, 16, 3004);
				div.className = "frame svelte-1680n0b";
				set_style(div, "display", (ctx.vis?'block':'none'));
				add_location(div, file$4, 143, 12, 2931);
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

				if ((!current || changed.vis) && a_class_value !== (a_class_value = "" + (ctx.vis?'opened':'closed') + " svelte-1680n0b")) {
					a.className = a_class_value;
				}

				if ((!current || changed.node) && t2_value !== (t2_value = ctx.node.description)) {
					set_data(t2, t2_value);
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

	// (139:4) {#if node.kind=="SCALAR"}
	function create_if_block_1(ctx) {
		var span, t;

		return {
			c: function create() {
				span = element("span");
				t = text(ctx.typeName);
				span.className = "scalar-type svelte-1680n0b";
				add_location(span, file$4, 139, 9, 2731);
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

	// (146:16) {#if node.fields}
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
				div.className = "fieldlist svelte-1680n0b";
				add_location(div, file$4, 146, 20, 3110);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div, null);
				}

				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.scheme || changed.node || changed.tree || changed.parentid || changed.typeName || changed.onFieldStateChange) {
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

	// (148:20) {#each node.fields as f}
	function create_each_block(ctx) {
		var current;

		var typefield = new TypeField({
			props: {
			scheme: ctx.scheme,
			node: ctx.f,
			tree: ctx.tree,
			parentid: "" + ctx.parentid + "-" + ctx.typeName
		},
			$$inline: true
		});
		typefield.$on("change", ctx.onFieldStateChange);

		return {
			c: function create() {
				typefield.$$.fragment.c();
			},

			m: function mount(target, anchor) {
				mount_component(typefield, target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var typefield_changes = {};
				if (changed.scheme) typefield_changes.scheme = ctx.scheme;
				if (changed.node) typefield_changes.node = ctx.f;
				if (changed.tree) typefield_changes.tree = ctx.tree;
				if (changed.parentid || changed.typeName) typefield_changes.parentid = "" + ctx.parentid + "-" + ctx.typeName;
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

	function getFields(n, level){
	 let a =[];
	 let p = '  ';
	 for (let key in n) {
	     if (n[key].checked){
	         a.push( p.repeat(level+1)+ key + getFields(n[key], level+1) );
	     }
	 }
	 if (a.length > 0) {
	     return '{\n' +a.join('\n') + '\n'+p.repeat(level)+ '}'
	 }
	 return ''
	}

	function instance$4($$self, $$props, $$invalidate) {
		


	// P R O P S
	let { parentid = '', scheme = {}, typeName = '', tree = {}, fieldList = '' } = $$props;


	let nodes; 
	let node; 
	let vis = false;


	const dispatch = createEventDispatcher();
	function dispatchEvent(e) {
		dispatch('change', { text: 'State changed!', target: e.target });
	}




	function recalculate(){
	    if (scheme && scheme.data && scheme.data.__schema){
	        $$invalidate('nodes', nodes = scheme.data.__schema.types.filter(t =>  t.name == typeName ));
	        if (nodes.length > 0) {
	            $$invalidate('node', node = nodes[0]);
	        }
	    } 
	}

	recalculate();

	// function showTree(e) {
	//     console.log(fieldList)
	// }

	function onFieldStateChange(e) {
	   $$invalidate('fieldList', fieldList = getFields(tree,0)); 
	   dispatchEvent(e);
	//    console.log(e)
	//    console.log(fieldList)
	}

	onMount(async () => {
	    $$invalidate('fieldList', fieldList = getFields(tree,0));
	});

		function click_handler(e) {
			const $$result = vis = !vis;
			$$invalidate('vis', vis);
			return $$result;
		}

		$$self.$set = $$props => {
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
			if ('scheme' in $$props) $$invalidate('scheme', scheme = $$props.scheme);
			if ('typeName' in $$props) $$invalidate('typeName', typeName = $$props.typeName);
			if ('tree' in $$props) $$invalidate('tree', tree = $$props.tree);
			if ('fieldList' in $$props) $$invalidate('fieldList', fieldList = $$props.fieldList);
		};

		return {
			parentid,
			scheme,
			typeName,
			tree,
			fieldList,
			node,
			vis,
			onFieldStateChange,
			click_handler
		};
	}

	class Type extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$4, create_fragment$4, safe_not_equal, ["parentid", "scheme", "typeName", "tree", "fieldList"]);
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

		get tree() {
			throw new Error("<Type>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set tree(value) {
			throw new Error("<Type>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get fieldList() {
			throw new Error("<Type>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set fieldList(value) {
			throw new Error("<Type>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/Func.svelte generated by Svelte v3.4.0 */

	const file$5 = "src/Func.svelte";

	function get_each_context$1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.arg = list[i];
		child_ctx.index = i;
		return child_ctx;
	}

	// (201:12) {#if node.args}
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
				div0.className = "header svelte-1ub66rd";
				add_location(div0, file$5, 201, 12, 4406);
				div1.className = "fieldlist svelte-1ub66rd";
				add_location(div1, file$5, 202, 12, 4455);
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

	// (204:16) {#each node.args as arg, index (arg.name)}
	function create_each_block$1(key_1, ctx) {
		var first, current;

		var argument = new Argument({
			props: {
			node: ctx.arg,
			parentid: "" + ctx.parentid + "-" + ctx.node.name + "-argument"
		},
			$$inline: true
		});
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

			p: function update(changed, ctx) {
				var argument_changes = {};
				if (changed.node) argument_changes.node = ctx.arg;
				if (changed.parentid || changed.node) argument_changes.parentid = "" + ctx.parentid + "-" + ctx.node.name + "-argument";
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
		var a, t0_value = ctx.node.name, t0, t1, a_class_value, t2, span, t3_value = ctx.node.description, t3, br, t4, div11, div9, t5, div1, div0, t6, t7_value = ctx.node.type.kind == "LIST" ? '[...]': '', t7, t8, updating_fieldList, t9, form_1, div3, div2, t11, textarea0, textarea0_id_value, t12, div5, div4, t14, textarea1, textarea1_id_value, t15, div7, div6, t17, input0, t18, div8, input1, t19, pre, t20, t21, div10, current, dispose;

		var if_block = (ctx.node.args) && create_if_block$2(ctx);

		function type_fieldList_binding(value) {
			ctx.type_fieldList_binding.call(null, value);
			updating_fieldList = true;
			add_flush_callback(() => updating_fieldList = false);
		}

		let type_props = {
			typeName: ctx.node.graphqlType = ctx.node.type.name || ctx.node.type.ofType.name,
			scheme: ctx.scheme,
			parentid: "" + ctx.parentid + "-" + ctx.node.name
		};
		if (ctx.fieldlist !== void 0) {
			type_props.fieldList = ctx.fieldlist;
		}
		var type = new Type({ props: type_props, $$inline: true });

		add_binding_callback(() => bind(type, 'fieldList', type_fieldList_binding));

		return {
			c: function create() {
				a = element("a");
				t0 = text(t0_value);
				t1 = text("(...)");
				t2 = space();
				span = element("span");
				t3 = text(t3_value);
				br = element("br");
				t4 = space();
				div11 = element("div");
				div9 = element("div");
				if (if_block) if_block.c();
				t5 = space();
				div1 = element("div");
				div0 = element("div");
				t6 = text("RETURNS ");
				t7 = text(t7_value);
				t8 = space();
				type.$$.fragment.c();
				t9 = space();
				form_1 = element("form");
				div3 = element("div");
				div2 = element("div");
				div2.textContent = "QUERY";
				t11 = space();
				textarea0 = element("textarea");
				t12 = space();
				div5 = element("div");
				div4 = element("div");
				div4.textContent = "VARIABLES";
				t14 = space();
				textarea1 = element("textarea");
				t15 = space();
				div7 = element("div");
				div6 = element("div");
				div6.textContent = "FILE";
				t17 = space();
				input0 = element("input");
				t18 = space();
				div8 = element("div");
				input1 = element("input");
				t19 = space();
				pre = element("pre");
				t20 = text(ctx.request);
				t21 = space();
				div10 = element("div");
				a.className = a_class_value = "name " + (ctx.vis?'opened':'closed') + " svelte-1ub66rd";
				a.href = true;
				add_location(a, file$5, 194, 0, 4051);
				span.className = "description svelte-1ub66rd";
				add_location(span, file$5, 195, 0, 4164);
				add_location(br, file$5, 195, 51, 4215);
				div0.className = "header svelte-1ub66rd";
				add_location(div0, file$5, 211, 16, 4762);
				add_location(div1, file$5, 210, 12, 4740);
				div2.className = "header svelte-1ub66rd";
				add_location(div2, file$5, 217, 20, 5130);
				textarea0.id = textarea0_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-query";
				textarea0.name = "query";
				textarea0.className = "query svelte-1ub66rd";
				textarea0.value = ctx.request;
				add_location(textarea0, file$5, 218, 20, 5183);
				add_location(div3, file$5, 216, 16, 5104);
				div4.className = "header svelte-1ub66rd";
				add_location(div4, file$5, 221, 20, 5350);
				textarea1.id = textarea1_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-variables";
				textarea1.name = "variables";
				textarea1.className = "variables svelte-1ub66rd";
				add_location(textarea1, file$5, 222, 20, 5407);
				add_location(div5, file$5, 220, 16, 5324);
				div6.className = "header svelte-1ub66rd";
				add_location(div6, file$5, 225, 20, 5600);
				attr(input0, "type", "file");
				input0.name = "input-file";
				add_location(input0, file$5, 226, 20, 5651);
				add_location(div7, file$5, 224, 16, 5574);
				attr(input1, "type", "submit");
				input1.value = "TEST";
				input1.className = "svelte-1ub66rd";
				add_location(input1, file$5, 229, 20, 5770);
				div8.className = "buttons svelte-1ub66rd";
				add_location(div8, file$5, 228, 16, 5728);
				add_location(form_1, file$5, 215, 12, 5041);
				div9.className = "form-area svelte-1ub66rd";
				add_location(div9, file$5, 198, 4, 4320);
				pre.className = "request  svelte-1ub66rd";
				add_location(pre, file$5, 233, 4, 5865);
				div10.className = "response  svelte-1ub66rd";
				add_location(div10, file$5, 234, 4, 5931);
				div11.className = "root svelte-1ub66rd";
				set_style(div11, "display", (ctx.vis?'grid':'none'));
				add_location(div11, file$5, 197, 0, 4239);

				dispose = [
					listen(a, "click", prevent_default(ctx.click_handler)),
					listen(textarea0, "change", ctx.change_handler),
					listen(textarea1, "input", ctx.textarea1_input_handler),
					listen(textarea1, "change", ctx.change_handler_1),
					listen(form_1, "submit", ctx.submitForm)
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
				insert(target, span, anchor);
				append(span, t3);
				insert(target, br, anchor);
				insert(target, t4, anchor);
				insert(target, div11, anchor);
				append(div11, div9);
				if (if_block) if_block.m(div9, null);
				append(div9, t5);
				append(div9, div1);
				append(div1, div0);
				append(div0, t6);
				append(div0, t7);
				append(div1, t8);
				mount_component(type, div1, null);
				append(div9, t9);
				append(div9, form_1);
				append(form_1, div3);
				append(div3, div2);
				append(div3, t11);
				append(div3, textarea0);
				append(form_1, t12);
				append(form_1, div5);
				append(div5, div4);
				append(div5, t14);
				append(div5, textarea1);

				textarea1.value = ctx.variables;

				append(form_1, t15);
				append(form_1, div7);
				append(div7, div6);
				append(div7, t17);
				append(div7, input0);
				append(form_1, t18);
				append(form_1, div8);
				append(div8, input1);
				add_binding_callback(() => ctx.form_1_binding(form_1, null));
				add_binding_callback(() => ctx.div9_binding(div9, null));
				append(div11, t19);
				append(div11, pre);
				append(pre, t20);
				add_binding_callback(() => ctx.pre_binding(pre, null));
				append(div11, t21);
				append(div11, div10);
				add_binding_callback(() => ctx.div10_binding(div10, null));
				add_binding_callback(() => ctx.div11_binding(div11, null));
				current = true;
			},

			p: function update(changed, ctx) {
				if ((!current || changed.node) && t0_value !== (t0_value = ctx.node.name)) {
					set_data(t0, t0_value);
				}

				if ((!current || changed.vis) && a_class_value !== (a_class_value = "name " + (ctx.vis?'opened':'closed') + " svelte-1ub66rd")) {
					a.className = a_class_value;
				}

				if ((!current || changed.node) && t3_value !== (t3_value = ctx.node.description)) {
					set_data(t3, t3_value);
				}

				if (ctx.node.args) {
					if (if_block) {
						if_block.p(changed, ctx);
						if_block.i(1);
					} else {
						if_block = create_if_block$2(ctx);
						if_block.c();
						if_block.i(1);
						if_block.m(div9, t5);
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

				if ((!current || changed.node) && t7_value !== (t7_value = ctx.node.type.kind == "LIST" ? '[...]': '')) {
					set_data(t7, t7_value);
				}

				var type_changes = {};
				if (changed.node) type_changes.typeName = ctx.node.graphqlType = ctx.node.type.name || ctx.node.type.ofType.name;
				if (changed.scheme) type_changes.scheme = ctx.scheme;
				if (changed.parentid || changed.node) type_changes.parentid = "" + ctx.parentid + "-" + ctx.node.name;
				if (!updating_fieldList && changed.fieldlist) {
					type_changes.fieldList = ctx.fieldlist;
				}
				type.$set(type_changes);

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
				if (changed.items) {
					ctx.div9_binding(null, div9);
					ctx.div9_binding(div9, null);
				}

				if (!current || changed.request) {
					set_data(t20, ctx.request);
				}

				if (changed.items) {
					ctx.pre_binding(null, pre);
					ctx.pre_binding(pre, null);
				}
				if (changed.items) {
					ctx.div10_binding(null, div10);
					ctx.div10_binding(div10, null);
				}
				if (changed.items) {
					ctx.div11_binding(null, div11);
					ctx.div11_binding(div11, null);
				}

				if (!current || changed.vis) {
					set_style(div11, "display", (ctx.vis?'grid':'none'));
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
					detach(span);
					detach(br);
					detach(t4);
					detach(div11);
				}

				if (if_block) if_block.d();

				type.$destroy();

				ctx.form_1_binding(null, form_1);
				ctx.div9_binding(null, div9);
				ctx.pre_binding(null, pre);
				ctx.div10_binding(null, div10);
				ctx.div11_binding(null, div11);
				run_all(dispose);
			}
		};
	}

	function instance$5($$self, $$props, $$invalidate) {
		

	// P R O P S
	let { url, parentid = '', scheme = {}, node = {}, operation = "" } = $$props;



	let vis = false;
	let fieldlist = '';
	let arglist = '';
	let request = '';
	let variables = '';

	// $: returnType = node.graphqlType = node.type.name || node.type.ofType.name

	const dispatch = createEventDispatcher();
	function dispatchEvent() {
		dispatch('change', { text: 'State changed!' });
	}





	function getArgsText() {
	    let checked = node.args.filter( n => n.checked && n.value != null );
	    let args = checked.map( n => {
	        let val = n.graphqlType == 'String'?`"${n.value.replace(/"/g,'\\"')}"`: n.value;
	        return `  ${n.name}:${val}`
	    });
	    let argsText = args.length == 0? '' : `(\n${ args.join(',\n') }\n)`;
	    return argsText
	}

	function getArgsList() {
	    $$invalidate('arglist', arglist = getArgsText()); 
	}



	function submitForm(event){
	    event.preventDefault();
	    console.log("submitForm");
	    window.$(form).ajaxSubmit({
	        url: url, 
	        type: 'POST',
	        //success: function(response) {$('#result').text(JSON.stringify(response, null,'  '));}
	        success: function(response) {window.$(responseArea).jsonViewer(response, {collapsed: true, rootCollapsable: false});}
	    });
	    return false
	}


	let form;
	let rootArea;
	let formArea;
	let requestArea;
	let responseArea;

	onMount(async () => {
	    getArgsList();
	    // window.$(requestArea).resizable();
	    window.$(formArea).resizable({ handles: "e" });
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

		function type_fieldList_binding(value) {
			fieldlist = value;
			$$invalidate('fieldlist', fieldlist);
		}

		function textarea1_input_handler() {
			variables = this.value;
			$$invalidate('variables', variables);
		}

		function form_1_binding($$node, check) {
			form = $$node;
			$$invalidate('form', form);
		}

		function div9_binding($$node, check) {
			formArea = $$node;
			$$invalidate('formArea', formArea);
		}

		function pre_binding($$node, check) {
			requestArea = $$node;
			$$invalidate('requestArea', requestArea);
		}

		function div10_binding($$node, check) {
			responseArea = $$node;
			$$invalidate('responseArea', responseArea);
		}

		function div11_binding($$node, check) {
			rootArea = $$node;
			$$invalidate('rootArea', rootArea);
		}

		$$self.$set = $$props => {
			if ('url' in $$props) $$invalidate('url', url = $$props.url);
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
			if ('scheme' in $$props) $$invalidate('scheme', scheme = $$props.scheme);
			if ('node' in $$props) $$invalidate('node', node = $$props.node);
			if ('operation' in $$props) $$invalidate('operation', operation = $$props.operation);
		};

		$$self.$$.update = ($$dirty = { operation: 1, node: 1, arglist: 1, fieldlist: 1 }) => {
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
			vis,
			fieldlist,
			request,
			variables,
			getArgsList,
			submitForm,
			form,
			rootArea,
			formArea,
			requestArea,
			responseArea,
			change_handler,
			change_handler_1,
			click_handler,
			type_fieldList_binding,
			textarea1_input_handler,
			form_1_binding,
			div9_binding,
			pre_binding,
			div10_binding,
			div11_binding
		};
	}

	class Func extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$5, create_fragment$5, safe_not_equal, ["url", "parentid", "scheme", "node", "operation"]);

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
		return child_ctx;
	}

	// (39:5) {#each queries as e}
	function create_each_block_1(ctx) {
		var div, current;

		var func = new Func({
			props: {
			url: ctx.url,
			node: ctx.e,
			operation: "query",
			scheme: ctx.scheme,
			parentid: "query"
		},
			$$inline: true
		});
		func.$on("change", ctx.change_handler);

		return {
			c: function create() {
				div = element("div");
				func.$$.fragment.c();
				add_location(div, file$6, 39, 10, 772);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				mount_component(func, div, null);
				current = true;
			},

			p: function update(changed, ctx) {
				var func_changes = {};
				if (changed.url) func_changes.url = ctx.url;
				if (changed.queries) func_changes.node = ctx.e;
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

	// (46:5) {#each mutations as e}
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
				add_location(div, file$6, 46, 10, 970);
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
		var div, h40, t1, t2, h41, t4, current;

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
				h40 = element("h4");
				h40.textContent = "Queries";
				t1 = space();

				for (var i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t2 = space();
				h41 = element("h4");
				h41.textContent = "Mutations";
				t4 = space();

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				add_location(h40, file$6, 37, 5, 719);
				add_location(h41, file$6, 44, 5, 913);
				add_location(div, file$6, 36, 0, 708);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, h40);
				append(div, t1);

				for (var i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].m(div, null);
				}

				append(div, t2);
				append(div, h41);
				append(div, t4);

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
							each_blocks_1[i].m(div, t2);
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

		function change_handler(event) {
			bubble($$self, event);
		}

		function change_handler_1(event) {
			bubble($$self, event);
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
			change_handler,
			change_handler_1
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
				add_location(input0, file$7, 142, 8, 3155);
				attr(input1, "type", "button");
				input1.value = "restore";
				input1.className = "svelte-o5nj5n";
				add_location(input1, file$7, 143, 8, 3220);
				add_location(div0, file$7, 141, 4, 3141);
				div1.className = "main svelte-o5nj5n";
				add_location(div1, file$7, 145, 4, 3298);
				div2.className = "root svelte-o5nj5n";
				add_location(div2, file$7, 139, 0, 3055);

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
	    restoreFieldsWithEvents(true);
	    setTimeout(() => {
	        $$invalidate('ignoreChanges', ignoreChanges = true);
	        restoreFieldsWithEvents(false);
	        console.log("restored", key, controlsStr.length );
	        $$invalidate('ignoreChanges', ignoreChanges = false);
	    }, 100);
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

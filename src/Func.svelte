
<script>
import { createEventDispatcher } from 'svelte'

import { onMount } from 'svelte'
import Js from './JsonView.svelte'
import Argument from './Argument.svelte'
import Type from './Type.svelte'

// P R O P S
export let url
export let parentid = ''
export let scheme = {}
export let node = {}
export let operation = ""



let vis = false
let fieldlist = ''
let arglist = ''
let request = ''
let variables = ''
// let returnType = ''
// let response

$: {
    request = `${operation} {\n${node.name}${arglist}\n${fieldlist}\n}`
    dispatchEvent()
}

// $: returnType = node.graphqlType = node.type.name || node.type.ofType.name

const dispatch = createEventDispatcher()
function dispatchEvent() {
	dispatch('change', { text: 'State changed!' })
}





function getArgsText() {
    let checked = node.args.filter( n => n.checked && n.value != null )
    let args = checked.map( n => {
        let val = n.graphqlType == 'String'?`"${n.value.replace(/"/g,'\\"')}"`: n.value
        return `  ${n.name}:${val}`
    })
    let argsText = args.length == 0? '' : `(\n${ args.join(',\n') }\n)`
    return argsText
}

function getArgsList() {
    arglist = getArgsText() 
}



function submitForm(event){
    event.preventDefault()
    console.log("submitForm")
    window.$(form).ajaxSubmit({
        url: url, 
        type: 'POST',
        //success: function(response) {$('#result').text(JSON.stringify(response, null,'  '));}
        success: function(response) {window.$(responseArea).jsonViewer(response, {collapsed: true, rootCollapsable: false});}
    })
    return false
}


let form
let rootArea
let formArea
let requestArea
let responseArea

onMount(async () => {
    getArgsList()
    // window.$( formArea ).resizable();
    // console.log('onMount:', formArea )
})

</script>

<style>
    .header {
        /* font-variant: small-caps; */
        font-family: 'Roboto Condensed';
        font-weight: bold;
        font-size: 90%;
        letter-spacing: 0.1em;
        /* color: gray; */
        margin-top:1em;
        /* border-top: 1px dashed slategray; */

    }

    .root {
        margin: 10px 0 10px 30px;
        /* display: flex; */
        /* flex-direction: row; */
        /* width:100%; */

        /* display: grid; */
        grid-template-columns: 380px 1fr 3fr;
        /* grid-template-rows: 400px; */
    }

    .form-area { 
        /* display: inline-block; */
        /* vertical-align: top; */
        border: 1px solid transparent;
        /* resize: horizontal; */
        overflow:auto;
        min-width: 230px;
        padding: 10px;
        /* width:380px; */
    }

    .active {
        background-color: whitesmoke;
        /* padding: 10px; */
        border: 1px solid silver;
    }

    .name { 
        display: inline-block;
        min-width: 200px;
    }
    .description {
        display: inline-block;
        color: slategray;
        vertical-align: bottom;
        /* margin-left: 15px; */
        /* margin-bottom: 10px; */
        /* width: 80%; */
        /* max-width: 300px; */
    }

    .fieldlist {
        border-top:1px dashed slategray;
        border-bottom:1px dashed slategray;
        padding-bottom: 10px;
    }

    .closed::before {
        content: '\25B6';
        font-size: 90%;
        width:15px;
        display: inline-block;
    }

    .opened::before {
        content: '\25BC';
        font-size: 90%;
        width:15px;
        display: inline-block;
    }

    .buttons {
        text-align: right;
        /* padding: 10px; */
    }

    input[type="submit"] {
        font-family: 'Roboto Condensed';
        /* font-variant: small-caps; */
        font-weight: bold;
        /* font-size: 90%; */
        letter-spacing: 0.1em;
        padding: 3px 15px 3px 15px;
        border: 1px solid rgba(70,130,180,0.5);
        border-radius: 2px;
        background-color: transparent;
        color: steelblue;
    }

    .request {
        border:1px solid silver;
        /* border-left-width:0; */
        margin: 0 0 0 0;
        padding: 0 10px 0 10px;
        color:steelblue;
        resize: both;
        overflow: auto;
        /* width: 100%; */
    }

    .response {
        overflow:auto;
        border: 1px solid silver;
        /* border-left-width: 0; */
        /* background-color: bisque; */
        /* width: 500px; */

        /* flex: 1 1 auto; */
    }

    .query {
        width: calc(100% - 6px);
        height: 8em;
        min-height: 1em;
        resize: vertical;
    }

    .variables {
        margin-left:0px;
        width: calc(100% - 6px);
        height: 3em;
        min-height: 1em;
        resize: vertical;
    }

 
</style>

<a class="name {vis?'opened':'closed'}" href on:click|preventDefault={ e => vis = !vis }>{node.name}(...)  </a> 
<span class="description">{node.description}</span><br>
<!-- {#if vis} -->
<div class="root" style="display:{vis?'grid':'none'}"  bind:this={rootArea}>
    <div class="form-area  {vis?'active':''}" bind:this={formArea}>

            
            {#if node.args}
            <div class="header" >ARGUMENTS</div>
            <div class="fieldlist" >
                {#each node.args as arg, index (arg.name)}
                <Argument node={arg} on:change={getArgsList} parentid="{parentid}-{node.name}-argument"/>
                {/each}
            </div>
            {/if}
        
            
            <div>
                <div class="header" >RETURNS {node.type.kind == "LIST" ? '[...]': ''}</div>
                <Type typeName={node.graphqlType = node.type.name || node.type.ofType.name} scheme={scheme} parentid="{parentid}-{node.name}" bind:fieldList={fieldlist}/>
            </div>

            <form bind:this={form} on:submit={submitForm}>
                <div>
                    <div class="header" >QUERY</div>
                    <textarea id="{parentid}-{node.name}-query" name="query" class="query" on:change>{request}</textarea>
                </div>
                <div>
                    <div class="header" >VARIABLES</div>
                    <textarea id="{parentid}-{node.name}-variables" name="variables" class="variables" bind:value={variables} on:change></textarea>
                </div>
                <div>
                    <div class="header">FILE</div>
                    <input type="file" name="input-file">
                </div>
                <div class="buttons">
                    <input type="submit"  value="TEST">
                </div>
            </form>
    </div>
    <pre class="request " bind:this={requestArea}>{request}</pre>
    <div class="response " bind:this={responseArea}></div>
</div>
<!-- {/if} -->
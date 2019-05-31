
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
export let test = submitForm

let testResult =''
let evalErrors =''
let vis = false
let fieldlist = ''
let arglist = ''
let request = ''
let variables = ''
let response
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



function doTest(){
    testResult = "passed"
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
    if (event) event.preventDefault()
    console.log("submitForm")
    window.$(form).ajaxSubmit({
        url: url, 
        type: 'POST',
        //success: function(res) {$('#result').text(JSON.stringify(res, null,'  '));}
        success: function(res) {
            response = res
            window.$(responseArea).jsonViewer(res, {collapsed: true, rootCollapsable: false});
            // testResult = "passed" +JSON.stringify(res, null,'  ').length
            evaluate()
            }
    })
    return false
}

function evaluate(){
    testResult = ""
    evalErrors = ""
    let code = evalTextarea.value
    code = code.trimStart()
    code = code.trimEnd()
    if (code == "") {
        evalErrors = `<br>// Write some code to evaluate server response.<br>// For example:<br>response.errors == null`
        return
    }

    try {
        let result = eval(code)
        testResult = result        
    } catch (error) {
        console.log(error)
        evalErrors = error
    }


}


let form
let rootArea
let formArea
let requestArea
let responseArea
let evalTextarea

onMount(async () => {
    getArgsList()
    // window.$(requestArea).resizable();
    window.$(formArea).resizable({ handles: "e" });
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
        padding-top:1em;
        /* border-top: 1px dashed slategray; */

    }

    .root {
        margin: 10px 0 10px 30px;
        display: grid;
        grid-template-columns: 1fr max-content 4fr;
        /* grid-template-rows: 400px; */
    }

    .form-area { 
        border: 1px solid silver;
        padding: 10px;
        min-width:380px;
        background-color: whitesmoke;
    }


    .name { 
        display: inline-block;
        min-width: 200px;
    }
    .description {
        display: inline-block;
        color: slategray;
        vertical-align: bottom;
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
    }

    input[type="submit"]{
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
        border-left-width:0;
        margin: 0 0 0 0;
        padding: 0 10px 0 10px;
        color:steelblue;
        /* resize: both; */
        /* overflow: auto; */
    }

    .response {
        overflow:auto;
        /* border: 1px solid silver; */
        background-color: white;
        /* border-left-width: 0; */
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

    .test-result {
        min-width: 60px;
        display: inline-block;
    }

    .result-panel {
        border: 1px solid silver;
        border-left-width: 0;
    }

    .response-area {
        background-color: whitesmoke;
        padding: 10px;
    }

    .eval-area {
        background-color: whitesmoke;
        padding: 10px;
    }

    .eval-text {
        width: calc(100% - 6px);
    }

    .eval-result {
        font-weight: normal;
    }

    .eval-errors {
        color: red;
        font-size: 90%
    }

    .try-button {
        font-family: 'Roboto Condensed';
        /* font-variant: small-caps; */
        font-weight: bold;
        /* font-size: 90%; */
        letter-spacing: 0.1em;
        padding: 0px 5px 0px 5px;
        border: 1px solid rgba(70,130,180,0.5);
        border-radius: 2px;
        background-color: transparent;
        color: steelblue;

    }

 
</style>

<a class="name {vis?'opened':'closed'}" href on:click|preventDefault={ e => vis = !vis }>{node.name}(...)</a>
<span class="test-result">{testResult}</span> 
<span class="description">{node.description}</span>
<!-- {#if vis} -->
<div class="root" style="display:{vis?'grid':'none'}"  bind:this={rootArea}>
    <div class="form-area" bind:this={formArea}>

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
    <div class="result-panel">
        <div class="response-area">
            <div class="header">RESPONSE</div>
            <div class="response " bind:this={responseArea}></div>
        </div>
        <div class="eval-area">
            <span class="header">TEST</span>
            <textarea rows="3" id="{parentid}-{node.name}-eval-text" class="eval-text" bind:this={evalTextarea} >response != null</textarea> 
            <input type="button" class="try-button" value="TRY THE CODE" on:click={evaluate}>
            <span class="eval-result">{testResult}</span>
            <span class="eval-errors">{@html evalErrors}</span>
        </div>
    </div>
</div>
<!-- {/if} -->
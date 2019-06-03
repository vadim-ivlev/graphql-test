
<script>
import { createEventDispatcher } from 'svelte'
import { onMount } from 'svelte'
// import { afterUpdate } from 'svelte'

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
// let fieldlist = ''
// let arglist = ''
let request 
let variables = ''
let response = null

let responseArea
let evalTextarea

let getTypeText


const dispatch = createEventDispatcher()
function dispatchEvent() {
	dispatch('change', { text: 'State changed!' })
}

// $: {
//     let dummy1 = scheme
//     console.log("scheme changed")
//     generateQuery()
// }

$: {
    let dummy = node
    // console.log("node changed")
    generateQuery()
}

function getArgsText() {
    let args = []
    for (let arg of node.args) {
        if (!arg.getText) continue
        let text = arg.getText()
        if (text) args.push(text)
    }
    let argsText = args.length == 0? '' : `(\n${ args.join(',\n') }\n)`
    return argsText
}


function generateQuery(){
    let arglist = getArgsText()
    let fieldlist =getTypeText ? getTypeText() : ''
    request = `${operation} {\n${node.name}${arglist}\n${fieldlist}\n}`
    dispatchEvent()
}


function argsChangeHandler() {
    console.log("argsChangeHandler")
    generateQuery()
}


function typeChangeHandler(params) {
    console.log("typeChangeHandler")
    generateQuery()
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
let formArea
onMount(async () => {
    window.$(formArea).resizable({ handles: "e" });
    window.$(form).resizable({ handles: "e" });
})


</script>

<style>
    .header {
        font-family: 'Roboto','Roboto Condensed';
        font-weight: bold;
        font-size: 90%;
        letter-spacing: 0.1em;
        padding: 1em 0 0 10px;

    }

    .root {
        margin-top: 10px;
        margin-bottom: 10px;
        display: grid;
        grid-template-columns: 1fr max-content 4fr;
        border-top: 1px solid silver;
        border-bottom: 1px solid silver;
    }

    .form-area { 
        border-right: 1px solid steelblue;
        min-width:380px;
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
        padding: 10px;
    }
    .buttons2 {
        text-align: left;
        padding: 10px;
    }

    input[type="submit"]{
        font-family: 'Roboto','Roboto Condensed';
        font-weight: bold;
        font-size: 14.4px;
        letter-spacing: 0.1em;
        padding: 5px 15px 5px 15px;
        border: 1px solid steelblue;
        border-radius: 4px;
        background-color: steelblue;
        color: white;
    }

    .response {
        overflow:auto;
        background-color: white;
        font-family: 'Roboto', 'Roboto Mono', monospace;
        padding: 0;
    }

    .query {
        height: 20em;
        min-height: 1em;
        resize: vertical;
    }

    .variables {
        margin-left:0px;
        height: 3em;
        min-height: 1em;
        resize: vertical;
    }

    .test-result {
        min-width: 60px;
        display: inline-block;
    }

    .result-panel {
        border-left-width: 0;
    }

    .response-area {
        padding: 10px;
    }

    .eval-area {
    }

    .eval-text {
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
        font-weight: bold;
        letter-spacing: 0.1em;
        padding: 5px 15px 5px 15px;
        border: 1px solid steelblue;
        border-radius: 4px;
        background-color: transparent;
        color: steelblue;
    }

    form {
        border-right: 1px solid steelblue
    }

    textarea {
        padding: 10px;
        width: calc(100% - 20px);
        font-size: 14px;
        font-family: 'Roboto Mono','Roboto', monospace;
        border-left-width: 0;
        border-right-width: 0;
        border-color: silver;
        color: darkmagenta;
    }

    .json-toggle {
        color: darkmagenta !important;
    }
    
    .outer {
        margin: 0 3% 0 3%;
    }
</style>

<div>
    <div class="outer">
        <a class="name {vis?'opened':'closed'}" href on:click|preventDefault={ e => vis = !vis }>{node.name}(...)</a>
        <span class="test-result">{testResult}</span> 
        <span class="description">{node.description}</span>
    </div>
    <div class="root" style="display:{vis?'grid':'none'}"  >
        <div class="form-area" bind:this={formArea}>

                {#if node.args}
                <div class="header" >ARGUMENTS</div>
                <div class="fieldlist" >
                    {#each node.args as arg, index (arg.name)}
                    <Argument node={arg} bind:getText={arg.getText} on:change={argsChangeHandler} parentid="{parentid}-{node.name}-argument"/>
                    {/each}
                </div>
                {/if}
            
                
                <div>
                    <div class="header" >RETURNS {node.type.kind == "LIST" ? '[...]': ''}
                    <input type="button" value="getText" on:click={()=> console.log(getTypeText())}>
                    </div>
                    <Type typeName={node.type.name || node.type.ofType.name} scheme={scheme} parentid="{parentid}-{node.name}"  bind:getText={getTypeText} on:change={typeChangeHandler}/>
                </div>

        </div>

        <form bind:this={form} on:submit={submitForm}>
            <div>
                <div class="header" >QUERY</div>
                <textarea id="{parentid}-{node.name}-query" name="query" class="query" on:change >{request}</textarea>
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


        <div class="result-panel">
            <div class="header">RESPONSE</div>
            <div class="response-area">
                <div>response = <span class="json-literal">{response?'':null}</span></div>
                <div class="response" bind:this={responseArea}></div>
            </div>
            <div class="eval-area">
                <span class="header">TEST</span>
                <textarea rows="3" id="{parentid}-{node.name}-eval-text" class="eval-text" bind:this={evalTextarea} on:change>response && !response.errors</textarea> 
                <div class="buttons2">
                    <input type="button" class="try-button" value="TRY TEST" on:click={evaluate}>
                    <span class="eval-result">{testResult}</span>
                    <span class="eval-errors">{@html evalErrors}</span>
                </div>
            </div>
        </div>
    </div>
</div>
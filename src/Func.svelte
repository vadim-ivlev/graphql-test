
<script>
import { createEventDispatcher } from 'svelte'
import { onMount } from 'svelte'
// import { afterUpdate } from 'svelte'

import Js from './JsonView.svelte'
import Argument from './Argument.svelte'
import Type from './Type.svelte'

// P R O P S
// export let url
export let urlElement

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
// let variables = ''
let response = null

let responseArea
let evalTextarea
let queryFrame
let variablesFrame
let evalFrame

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
    console.log("submitForm urlElement.value=", urlElement.value)
    window.$(form).ajaxSubmit({
        // url: url, 
        url: urlElement.value, 
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
    window.$(queryFrame).resizable({ handles: "s" });
    window.$(variablesFrame).resizable({ handles: "s" });
    window.$(evalFrame).resizable({ handles: "s" });
})


</script>

<style>
    .header {
        font-family: 'Roboto','Roboto Condensed';
        font-weight: bold;
        font-size: 90%;
        letter-spacing: 0.1em;
        padding: 1em 0 0 10px;
        background-color: whitesmoke;
        /* font-variant: small-caps; */
        /* text-transform: lowercase; */
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
        /* border-top:1px dashed slategray; */
        border-bottom:1px solid silver;
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

    input[type="file"] {
        margin-left:10px
    }

    .response {
        overflow:auto;
        background-color: white;
        font-family: 'Roboto', 'Roboto Mono', monospace;
        padding: 0;
    }

    .queryFrame {
        height: 20em;
        min-height: 1em;
        border-top:1px solid silver;
        border-bottom:1px solid steelblue;
    }

    .queryFrame>textarea {
        /* resize: vertical; */
        width: calc(100% - 20px);
        height: calc(100% - 20px);
        border-width: 0;
    }

    .variablesFrame {
        height: 3em;
        min-height: 1em;
        border-top:1px solid silver;
        border-bottom:1px solid steelblue;
    }

    .variablesFrame>textarea {
        /* resize: vertical; */
        width: calc(100% - 20px);
        height: calc(100% - 20px);
        border-width: 0;
    }

    .evalFrame {
        height: 3em;
        min-height: 1em;
        border-top:1px solid silver;
        border-bottom:1px solid steelblue;
    }

    .evalFrame>textarea {
        /* resize: vertical; */
        width: calc(100% - 20px);
        height: calc(100% - 20px);
        border-width: 0;
    }


    /* .variables {
        margin-left:0px;
        height: 3em;
        min-height: 1em;
        resize: vertical;
    } */

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
        border-right: 1px solid steelblue;
        background-color: whitesmoke;
    }

    textarea {
        padding: 10px;
        font-size: 14px;
        font-family: 'Roboto Mono','Roboto', monospace;
        color: darkmagenta;
    }

    .json-toggle {
        color: darkmagenta !important;
    }
    
    .outer {
        margin: 0 3% 0 3%;
    }

    .shadow {

        -webkit-box-shadow: 0px 12px 16px 0px rgba(0,0,0,0.10);
        -moz-box-shadow: 0px 12px 16px 0px rgba(0,0,0,0.10);
        box-shadow: 0px 12px 16px 0px rgba(0,0,0,0.10);    

    }

</style>

<div >
    <div class="outer">
        <a class="name {vis?'opened':'closed'}" href on:click|preventDefault={ e => vis = !vis }>{node.name}(...)</a>
        <span class="test-result">{testResult}</span> 
        <span class="description">{node.description}</span>
    </div>
    <div class="root shadow" style="display:{vis?'grid':'none'}"  >
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
                    <!-- <input type="button" value="getText" on:click={()=> console.log(getTypeText())}> -->
                    </div>
                    <Type typeName={node.type.name || node.type.ofType.name} scheme={scheme} parentid="{parentid}-{node.name}"  bind:getText={getTypeText} on:change={typeChangeHandler}/>
                </div>

        </div>

        <form bind:this={form} on:submit={submitForm}>
            <div>
                <div class="header" >QUERY</div>
                <div class="queryFrame" bind:this={queryFrame}>
                    <textarea id="{parentid}-{node.name}-query" name="query" on:change >{request}</textarea>
                </div>
            </div>
            <div>
                <div class="header" >VARIABLES</div>
                <div class="variablesFrame" bind:this={variablesFrame}>
                    <textarea id="{parentid}-{node.name}-variables" name="variables" on:change></textarea>
                </div>
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
            <div>
                <div class="header">DEFINE TEST</div>
                <div class="evalFrame" bind:this={evalFrame}>
                    <textarea id="{parentid}-{node.name}-eval-text" bind:this={evalTextarea} on:change>response && !response.errors</textarea> 
                </div>
                <div class="buttons2">
                    <input type="button" class="try-button" value="TRY TEST" on:click={evaluate}>
                    <span class="eval-result">{testResult}</span>
                    <span class="eval-errors">{@html evalErrors}</span>
                </div>
            </div>
        </div>
    </div>
</div>
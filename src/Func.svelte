
<script>
import { onMount } from 'svelte'

import Js from './JsonView.svelte'
import Argument from './Argument.svelte'
import Type from './Type.svelte'
import { changeCount } from './stores.js'



// P R O P S
export let urlElement
export let credentialsElement

export let parentid = ''
export let scheme = {}
export let node = {}
export let operation = ""
export let test = submitForm


let testResult =''
let evalErrors =''
let vis = false
let request 
let response = null

let responseArea

let evalTextarea
let evalCodeMirror
let variablesTextarea
let variablesCodeMirror
let queryTextarea
let queryCodeMirror


let queryFrame
let variablesFrame
let evalFrame

let form
let attachFileCheckbox
let attachFileCheckboxChecked = false
let formArea


let getTypeText
let getArgFunctions ={}


$: {
    let dummy = node
    console.log("node changed -------------")
    // generateQuery(node)
    
}


function getArgsText() {
    let args = []
    for (let [key,f] of Object.entries(getArgFunctions)) {
        let text = f()
        if (text) args.push(text)
    }
    let argsText = args.length == 0? '' : `(\n${ args.join(',\n') }\n)`
    return argsText
}



function generateQuery(el){
    console.log("generateQuery:", el)
    let arglist = getArgsText()
    let fieldlist =getTypeText ? getTypeText() : ''
    request = `${operation} {\n${node.name}${arglist}${fieldlist}\n}`
    if (queryCodeMirror){
        queryCodeMirror.getDoc().setValue(request)
    }
    incChangeCounter()
}


function fixEmptyVariablesField() {
    let str = variablesTextarea.value
    if (!str || !str.trim()){
        console.log("Fixing empty variable field")
        variablesCodeMirror.setValue("{}")
    }

}


function submitForm(event){
    if (event) event.preventDefault()
    console.log("submitForm credentialsElement=",credentialsElement.checked," urlElement.value=", urlElement.value)
    response = null
    responseArea.innerHTML = ""

    fixEmptyVariablesField()

    if (attachFileCheckbox.checked) {
        submitFormMultipart()
    } else {
        submitFormInJSON()
    }

    return false
}


function onFormSubmitSuccess(res){
    response = res
    window.$(responseArea).jsonViewer(res, {collapsed: true, rootCollapsable: false})
    evaluate()
}


function submitFormMultipart(){
    window.$(form).ajaxSubmit({
        url: urlElement.value, 
        type: 'POST',
        xhrFields : { withCredentials: credentialsElement.checked} ,
        success: onFormSubmitSuccess,
        error: err => {
                console.log("-------------------")
                window.$(responseArea).jsonViewer( JSON.parse(JSON.stringify(err)), {collapsed: true, rootCollapsable: false})
            }
    })
}


async function submitFormInJSON() {
    try {
        let fetchOptions = {
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json'
            },
            method: "POST",  
            body: JSON.stringify({ query: queryTextarea.value, variables: variablesTextarea.value, operationName: null }) 
        }
        if (credentialsElement.checked){
            fetchOptions.credentials = 'include' 
        }
        let resp = await fetch( urlElement.value, fetchOptions )
        let res = await resp.json()
        onFormSubmitSuccess(res)
    } catch (err) {
        console.error("Submit form error --------------------------------\n", err)
        responseArea.innerText = String(err)
    }
}


function evaluate(){
    testResult = ""
    evalErrors = ""
    let code = evalTextarea.value
    code = code.trimStart()
    code = code.trimEnd()
    if (code == "") {
        evalErrors = `<br>// Write code to evaluate server response.<br>// For example:<br>response.errors == null`
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


function incChangeCounter(a) {
    console.log('incChangeCounter', $changeCount, a)
    $changeCount +=1
}


function onCodeMirrorChange(cm) {
    var txt = cm.getDoc().getValue()
    var textarea = cm.getTextArea()
    textarea.value = txt
}


let jsOptions =  {
    mode:  "javascript",
    extraKeys: {'Ctrl-Space':'autocomplete'},
    autoRefresh:true,
    autoCloseBrackets: true,
    matchBrackets: true,
    tabSize:2,
    theme: "eclipse",
}


function addCodeMirrors() {
    if (! evalCodeMirror) { 
        evalCodeMirror = CodeMirror.fromTextArea( evalTextarea, jsOptions )
        evalCodeMirror.on('blur', incChangeCounter)
        evalCodeMirror.on('change', onCodeMirrorChange)
    }

    if (! variablesCodeMirror) { 
        variablesCodeMirror = CodeMirror.fromTextArea( variablesTextarea, jsOptions )
        variablesCodeMirror.on('blur', incChangeCounter)
        variablesCodeMirror.on('change', onCodeMirrorChange)
    }

    if (! queryCodeMirror) { 
        queryCodeMirror = CodeMirror.fromTextArea( queryTextarea, jsOptions)
        queryCodeMirror.on('blur', incChangeCounter)
        queryCodeMirror.on('change', onCodeMirrorChange)
    }
}


function removeCodeMirrors(params) {
    if ( evalCodeMirror) {
        evalCodeMirror.off('blur', incChangeCounter)
        evalCodeMirror.off('change', onCodeMirrorChange)
        evalCodeMirror.toTextArea()
        evalCodeMirror = null
    }

    if ( variablesCodeMirror) {
        variablesCodeMirror.off('blur', incChangeCounter)
        variablesCodeMirror.off('change', onCodeMirrorChange)
        variablesCodeMirror.toTextArea()
        variablesCodeMirror = null;
    }

    if ( queryCodeMirror) {
        queryCodeMirror.off('blur', incChangeCounter)
        queryCodeMirror.off('change', onCodeMirrorChange)
        queryCodeMirror.toTextArea()
        queryCodeMirror = null
    }
}


function toggleVisibility(event) {
    if (event) event.preventDefault()
    vis = !vis
    if (vis) {
        addCodeMirrors()
    } else {
        removeCodeMirrors()
    }
}


onMount(async () => {
    window.$(formArea).resizable({ handles: "e" });
    window.$(form).resizable({ handles: "e" });
    window.$(queryFrame).resizable({ handles: "s" });
    window.$(variablesFrame).resizable({ handles: "s" });
    window.$(evalFrame).resizable({ handles: "s" });
    console.log("on mount ----------------------------------------------")
    generateQuery(node)
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
        padding-bottom: 5px;
    }

    .root {
        margin-top: 10px;
        margin-bottom: 10px;
        display: grid;
        grid-template-columns: 1fr max-content 4fr;

        border: 1px solid steelblue;
    }

    .form-area { 
        border-right: 1px solid steelblue;
        min-width:380px;
    }

    .form-area h3 {
        background-color: whitesmoke;
        margin: 0;
        padding:10px 0 0 10px;
        color: silver;
        font-size:1.5em;
    }

    .name { 
        display: inline-block;
        min-width: 200px;
    }

    .description {
        display: inline-block;
        color: slategray;
        font-weight: normal;
        /* vertical-align: bottom; */
    }

    .fieldlist {
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



    .margined {
        margin:10px
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
        height: calc(100% - 21px);
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
        height: calc(100% - 21px);
        border-width: 0;
    }

    .evalFrame {
        height: 8em;
        min-height: 1em;
        border-top:1px solid silver;
        border-bottom:1px solid steelblue;
    }

    .evalFrame>textarea {
        /* resize: vertical; */
        width: calc(100% - 20px);
        height: calc(100% - 21px);
        border-width: 0;
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


    .eval-result {
        font-weight: normal;
    }

    .eval-errors {
        color: red;
        font-size: 90%
    }

    .button {
        color: #E10098; 
        background-color: transparent;
        border: 1px solid #E10098;
        padding: 5px 15px 5px 15px;
        border-radius: 4px;
        height: 32px;

        font-family: 'Roboto Condensed';
        font-size: 13px;
        font-weight: bold;
        
        letter-spacing: 0.1em;
        text-transform: uppercase;
    }

    .button-opaque{
       background-color: #E10098;
       color: white;
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
        <a class="name {vis?'opened':'closed'}" href on:click|preventDefault={ toggleVisibility }>{node.name}(...)</a>
        <span class="test-result">{@html testResult}</span> 
        <span class="description">{node.description}</span>
    </div>
    <div class="root shadow" style="display:{vis?'grid':'none'}">
        <!-- <h3>{node.name}(...)</h3> -->
        <!-- <div></div> -->
        <!-- <div></div> -->
        <div class="form-area" bind:this={formArea}>

                {#if node.args}
                <h3>{node.name}(...)</h3>
                <div class="header" >ARGUMENTS</div>
                <div class="fieldlist" >
                    {#each node.args as arg (arg.name)}
                    <Argument node={arg} bind:getText={getArgFunctions[arg.name]} on:change={generateQuery} parentid="{parentid}-{node.name}-argument"/>
                    {/each}
                </div>
                {/if}
            
                
                <div>
                    <div class="header" >RETURN {node.type.kind == "LIST" ? '[...]': ''}
                    </div>
                    <Type typeName={node.type.name || node.type.ofType.name} scheme={scheme} parentid="{parentid}-{node.name}" level={1}  bind:getText={getTypeText} on:change={generateQuery}/>
                </div>

        </div>

        <form bind:this={form} on:submit={submitForm}>
            <div>
                <div class="header" >QUERY</div>
                <div class="queryFrame" bind:this={queryFrame}>
                    <textarea id="{parentid}-{node.name}-query" name="query" bind:this={queryTextarea} on:change={incChangeCounter} >{request}</textarea>
                </div>
            </div>
            <div>
                <div class="header" >VARIABLES</div>
                <div class="variablesFrame" bind:this={variablesFrame}>
                    <textarea id="{parentid}-{node.name}-variables" name="variables" bind:this={variablesTextarea} on:change={incChangeCounter}>{'{'}{'}'}</textarea>
                </div>
            </div>
            <div class="buttons">
                <input type="submit" class="button "  value="query & run test">
            </div>
            <div>
                <div class="margined">
                    <input bind:this={attachFileCheckbox} type="checkbox" style="vertical-align:top"
                    on:change={e => attachFileCheckboxChecked = attachFileCheckbox && attachFileCheckbox.checked ? true: false}>
                    <span class="description">
                        <span style="font-weight:bold; color:black">Attach file.</span>
                        Sets Content-Type to
                        <br>application/x-www-form-urlencoded
                    </span>
                </div>
                <div class="margined" >
                    {#if attachFileCheckboxChecked}
                    <!-- <input id="{parentid}-{node.name}-input-file-namer" type="text" on:change={onInputFileNameChange} style="width:70px;" value="input-file"> -->
                    <span>name="file"</span><br>
                    <input type="file" name="file">
                    {/if}
                </div>
            </div>
        </form> 


        <div class="result-panel">
            <div class="header">RESPONSE
            </div>
            <div class="response-area">
                <span class="json-literal">{response?'':null}</span>
                <div class="response" bind:this={responseArea}></div>
            </div>
            <div>
                <div class="header">
                    <span class="description">Response saved in variable 'response'</span>
                    <br><span>DEFINE TEST & </span>
                    <input type="button" class="button" value="run test &#x25B6" on:click={evaluate}>
                </div>
                <div class="evalFrame" bind:this={evalFrame}>
                    <textarea id="{parentid}-{node.name}-eval-text" bind:this={evalTextarea} on:change={incChangeCounter}>response && !response.errors</textarea> 
                </div>
                <div class="buttons2">
                    <!-- <input type="button" class="button" value="try test" on:click={evaluate}> -->
                    <span class="eval-result">{@html testResult}</span>
                    <span class="eval-errors">{@html evalErrors}</span>
                </div>
            </div>
        </div>
    </div>
</div>
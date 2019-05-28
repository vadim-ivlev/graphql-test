
<script>
import { onMount } from 'svelte'
import Js from './JsonView.svelte'
import Argument from './Argument.svelte'
import Type from './Type.svelte'

// P R O P S
export let parentid = ''
export let scheme = {}
export let node = {}
export let operation = ""



let vis = false
let fieldlist = ''
let arglist = ''
let request = ''
// let response

$: request = `${operation} {\n${node.name}${arglist}\n${fieldlist}\n}`

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
    // console.log( request )
}



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
        border-top: 1px solid silver;

    }

    .root {
        /* margin-top: 20px; */
        display: flex;
        /* flex-direction: row; */
        /* width:100%; */
    }

    .form{ 
        /* display: inline-block; */
        /* vertical-align: top; */
        border: 1px solid transparent;
        resize: horizontal;
        overflow:auto;
        min-width: 230px;
        padding: 10px;
        /* width:400px; */
        /* max-width: 400px; */
    }

    .active {
        background-color: whitesmoke;
        /* padding: 10px; */
        border: 1px solid silver;
    }

    .name { 
        display: block;
        min-width: 200px;
    }
    .description {
        display: inline-block;
        color: green;
        vertical-align: bottom;
        /* margin-left: 15px; */
        /* margin-bottom: 10px; */
        /* width: 80%; */
        /* max-width: 300px; */
    }

    .closed::before {
        content: '\25B6';
        font-size: 70%;
        width:15px;
        display: inline-block;
    }

    .opened::before {
        content: '\25BC';
        font-size: 70%;
        width:15px;
        display: inline-block;
    }

    .buttons {
        text-align: right;
        padding: 10px;
    }

    input[type="button"] {
        font-size: 18px !important;
        padding: 20px !important;
        border-radius: 0px;
    }
    /* response ------------------------*/

    .request {
        /* background-color: bisque; */
        border-right:1px dotted silver;
        margin: 0 0 0 0;
        padding: 0 10px 0 10px;
        color:steelblue;
        /* resize: both; */
        overflow: auto;
        /* width: 100%; */

        /* white-space: pre-wrap;       
        white-space: -moz-pre-wrap;  
        white-space: -pre-wrap;      
        white-space: -o-pre-wrap;    
        word-wrap: break-word;        */

    }

    .response {
        background-color: bisque;
        /* width: 100%; */
    }

    /* splitter */

    /* ::-webkit-resizer {
        border: 1px solid black;
        background: red;
    } */



</style>

<a class="name {vis?'opened':'closed'}" href on:click|preventDefault={ e => vis = !vis }>{node.name}(...) </a>
<!-- {#if vis} -->
<div class="root" style="display:{vis?'flex':'none'}"  bind:this={rootArea}>
    <div class="form ui-widget-content {vis?'active':''}" bind:this={formArea}>

        <span class="description">{node.description}</span><br>
            
            {#if node.args}
            <div class="header" >ARGUMENTS</div>
            <div class="fieldlist" >
                {#each node.args as arg, index (arg.name)}
                <Argument node={arg} on:change={getArgsList}/>
                {/each}
            </div>
            {/if}
        
            
            <div>
                <div class="header" >RETURN</div>
                <Type typeName={node.type.name}  scheme={scheme} parentid="{parentid}-{node.name}" bind:fieldList={fieldlist}/>
            </div>
            <div>
                <div class="header" >VARIABLES</div>
            </div>
            <div>
                <div class="header">FILE</div>
            </div>
        
            <div class="buttons">
                <!-- <input type="button" value="show request" on:click={getArgsList}> -->
                <input type="button" value="send">
            </div>
    </div>
    <pre class="request " bind:this={requestArea}>{request}</pre>
    <div class="response " bind:this={responseArea}></div>
</div>
<!-- {/if} -->
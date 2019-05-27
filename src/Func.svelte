
<script>
import { onMount } from 'svelte'
import Js from './JsonView.svelte'
import Argument from './Argument.svelte'

// P R O P S
// export let scheme = {}
export let node = {}
export let operation = ""
// let fieldlist 

let vis = false

// $: console.log("node=",node)

function getQueryText() {
    let checked = node.args.filter( n => n.checked && n.value != null )
    let args = checked.map( n => {
        let val = n.graphqlType == 'String'?`"${n.value.replace(/"/g,'\\"')}"`: n.value
        return `  ${n.name}:${val}`
    })
    let argsText = args.length == 0? '' : `(\n${ args.join(',\n') }\n)`
    let returnFields = '{\n}'
    let text = `${operation} {\n${node.name}${argsText}${returnFields}\n}`
    return text
}

function showRequest(e) {
    console.log( getQueryText() )
}



let rootArea
let formArea
let respArea

onMount(async () => {
    
})

</script>

<style>

    .root {
        /* margin-top: 20px; */
        display: flex;
        /* flex-direction: row; */
        width:100%;
    }

    .form{ 
        /* display: inline-block; */
        /* vertical-align: top; */
        border: 1px solid transparent;
        resize: horizontal;
        overflow:auto;
        min-width: 230px;
        /* max-width: 400px; */
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
        color: green;
        vertical-align: bottom;
        margin-left: 15px;
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
    }
    /* response ------------------------*/

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

<div class="root " bind:this={rootArea}>
    <div class="form  {vis?'active':''}" bind:this={formArea}>

        <a class="name {vis?'opened':'closed'}" href on:click|preventDefault={ e => vis = !vis }>{node.name}(...) </a><br>
        {#if vis}
        <span class="description">{node.description}</span><br>
            
            {#if node.args}
            <div class="fieldlist" >
                {#each node.args as arg, index (arg.name)}
                <Argument node={arg} />
                {/each}
            </div>
            {/if}
        
            
            <div class="buttons">
                <input type="button" value="show request" on:click={showRequest}>
                <input type="button" value="send">
            </div>
        {/if}
        
    </div>
    <div class="response " bind:this={respArea}></div>
</div>
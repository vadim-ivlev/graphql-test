<script>
// import { onMount } from 'svelte'

import Schemer from "./schemer/schemer.svelte";
import JsonView from "./JsonView.svelte"
import List from "./List.svelte"


export let parentid='tab1'


let url
let scheme = null
let ignoreChanges = true
let doTests

$: {
    scheme=scheme
    console.log('App scheme changed', scheme)
    ignoreChanges= true
}

function doAllTests() {
    doTests()
}


function getControlValuesByTagName(tag) {
    let a =[]
    let inps=document.getElementsByTagName(tag)  
    for (let inp of inps) {
        let id = inp.getAttribute("id")
        if (!id) continue
        if (id[0]=='-') console.log(id) // check wrong ids
        let type =  tag == 'textarea' ? 'textarea' :  inp.getAttribute("type")
        let value = inp.value
        let checked = inp.checked
        a.push({ id: id, type:type, checked:checked, value:value })
    }
    return a    
}

function getControlValues() {
    let inputs    = getControlValuesByTagName("input")
    let textareas = getControlValuesByTagName("textarea")
    return inputs.concat(textareas)
}

function restoreControlValues(controls) {
    if (!controls) return
    for (let c of controls) {
        let inp = document.getElementById(c.id)
        if (!inp) continue
        if (c.type == 'checkbox') {
            inp.checked = c.checked
        } else {
            inp.value = c.value
        }
    }
}


function saveInputs() {
    let key = parentid
    let controls = getControlValues()
    let controlsStr = JSON.stringify(controls)
    localStorage.setItem(key, controlsStr);
    console.log("saved: ", key, controlsStr.length )
}


function restoreInputs() {
    let key = parentid
    let controlsStr = localStorage.getItem(key)
    if (!controlsStr) return
    let controls = JSON.parse(controlsStr)
    restoreControlValues(controls)
}

let delayTimeout
function delay(func, time=300) {
    clearTimeout(delayTimeout)
    delayTimeout = setTimeout(func, time)
}

function changeHandler(){
    console.log('App changeHandler')
    if (ignoreChanges) return
    delay(()=> console.log("I was delayed"))
}


// onMount(async () => {
//     // restoreInputs()
// })



</script>

<style>
    .root {
        display: grid;
        grid-template-columns: 5fr max-content;
        grid-template-areas:  
        "h b" 
        "m m";
    }
    .main {
        grid-area: m;
    }

    input {
        font-size: 100%;
    }

</style>


<div class="root">
    <Schemer parentid="{parentid}-Schemer" bind:url bind:scheme={scheme} on:change={changeHandler} />
    <div>
        <input type="button" on:click={doAllTests} value="do tests" >
        <input type="button" on:click={saveInputs} value="save">
        <input type="button" on:click={restoreInputs} value="restore">
    </div>
    <div class="main">
        <List parentid="{parentid}-List" url={url} scheme={scheme} bind:doTests={doTests} on:change={changeHandler}/>
    </div>
</div>


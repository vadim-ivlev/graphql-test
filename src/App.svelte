<script>
// import { afterUpdate, onMount } from 'svelte'
import { afterUpdate } from 'svelte'

import Schemer from "./schemer/schemer.svelte";
import JsonView from "./JsonView.svelte"
import List from "./List.svelte"


export let parentid='tab1'
export let visible = true

// let url
let urlElement
let scheme = {}
// let ignoreChanges = true
let doTests
// let noscheme = true
let mainArea

let controls

// $: {
//     scheme = scheme
//     // noscheme = Object.entries(scheme).length == 0
//     console.log('App scheme changed', scheme)
//     // ignoreChanges= true
//     // delay(restoreInputs, 500)
// }

function doAllTests() {
    doTests()
}


function getControlValuesByTagName(tag) {
    let a =[]
    if (!mainArea){
        return a
    }
    let inps=mainArea.getElementsByTagName(tag)  
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


function restoreControlValues() {
    if (!controls) return
    let restored = 0
    for (let c of controls) {
        let inp = document.getElementById(c.id)
        if (!inp) {
            // console.log("No input:")
            continue
        }
        restored ++
        if (c.type == 'checkbox') {
            inp.checked = c.checked
        } else {
            inp.value = c.value
        }
    }
    // if (restored)
    console.log(restored, "condrols have been restored.")
}


function clearStorageItemScheme(){
    localStorage.removeItem(parentid)
    console.log('clearStorageItemScheme')
    // let key = parentid
    // let controls = getControlValues()
    // if (!controls || controls.length==0){
    //     console.log("No controls")
    //     return
    // }
    // let value = { 
    //     url: urlElement.value, 
    //     controls:controls,
    //     scheme:{}
    //     }
    // let controlsStr = JSON.stringify(value)
    // localStorage.setItem(key, controlsStr);
    // console.log('clearStorageItemScheme:', key, controlsStr.length)
}


export function saveInputs() {
    let key = parentid
    let controls = getControlValues()
    if (!controls || controls.length==0){
        console.log("No controls")
        return
    }
    let value = { 
        url: urlElement.value,
        controls:controls,
        scheme:scheme
        }
    let controlsStr = JSON.stringify(value)
    localStorage.setItem(key, controlsStr);
    console.log("saved: ", key, controlsStr.length )
}


export function restoreInputs() {

    let key = parentid
    let controlsStr = localStorage.getItem(key)
    if (!controlsStr) return
    let value = JSON.parse(controlsStr)
    urlElement.value = value.url
    scheme = value.scheme
    console.log("restored tab=", key, controlsStr.length )

    // check if scheme is empty
    // if (!scheme) return
    // if (scheme && Object.entries(scheme).length === 0 && scheme.constructor === Object) return

    // let controls = value.controls
    controls = value.controls
    // restoreControlValues(controls)
    // console.log("restored controls=", key, controlsStr.length )
}

// let delayTimeout
// function delay(func, time=300) {
//     clearTimeout(delayTimeout)
//     delayTimeout = setTimeout(func, time)
// }

// function changeHandler(){
//     console.log('App changeHandler parentid=', parentid)
//     // if (ignoreChanges) return
//     // delay(()=> console.log("I was delayed from App changeYandler parentid=", parentid, document.readyState))
// }


afterUpdate(() => {
    console.log("afterUpdate parentid=", parentid)
    restoreInputs()
    // delay(restoreInputs, 1000)
    // restoreControlValues()
    // delay(restoreControlValues, 0)
    setTimeout(restoreControlValues, 0)
});

// onMount(async () => {
//     // restoreInputs()
//     console.log("onMount parentid=", parentid)
// })



</script>

<style>
    .root {
        padding-top:60px;
        display: grid;
        grid-template-columns:  max-content 5fr;
        grid-template-areas:  
        "schemer buttons" 
        "main    main";
    }
    .main {
        grid-area: main;
    }

    input {
        font-size: 100%;
    }

    .button {
        /* font-family: 'Roboto Condensed'; */
        /* font-weight: bold; */
        /* letter-spacing: 0.1em; */
        padding: 2px 10px 2px 10px;
        border: 1px solid steelblue;
        border-radius: 2px;
        background-color: steelblue;
        color: white;
        font-size: 100%;
    }



    .hidden {display: none;}
    /* .noscheme {display: none;} */
    .visible {display: block;}
</style>

<div class="hidden" class:visible>
<div class="root" >
    <Schemer parentid="{parentid}-Schemer" bind:urlElement={urlElement}  bind:scheme={scheme} on:clear={clearStorageItemScheme} />
    <!-- bind:scheme={scheme}  -->
    <!-- on:change={changeHandler}  -->
    <!-- bind:url -->
    <!-- {#if Object.entries(scheme).length != 0 } -->
    <div >
    <!-- class:noscheme -->
        <input type="button" class="button" on:click={doAllTests} value="test all" >
        <!-- <input type="button" on:click={saveInputs} value="save"> -->
        <!-- <input type="button" on:click={restoreInputs} value="restore"> -->
    </div>
    <!-- {/if} -->
    <div class="main" bind:this={mainArea}>
        <List parentid="{parentid}-List" urlElement={urlElement} scheme={scheme} bind:doTests={doTests} />
        <!-- on:change={changeHandler} -->
        <!-- url={url} -->
    </div>
</div>
</div>


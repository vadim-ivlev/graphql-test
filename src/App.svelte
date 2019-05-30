<script>
import { onMount } from 'svelte'

import Schemer from "./schemer/schemer.svelte";
import JsonView from "./JsonView.svelte"
import List from "./List.svelte"

let url
let scheme = {}
let controls = []
let ignoreChanges = true

// https://stackoverflow.com/questions/2856513/how-can-i-trigger-an-onchange-event-manually
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
    let a =[]
    let inps=document.getElementsByTagName("input")  
    for (let inp of inps) {
        let id = inp.getAttribute("id")
        if (!id) continue
        // if (id[0]=='-') console.log(id)

        let type = inp.getAttribute("type")
        let value = inp.value
        let checked = inp.checked
        a.push({ id: id, type:type, checked:checked, value:value })
    }

    inps=document.getElementsByTagName("textarea")  
    for (let inp of inps) {
        let id = inp.getAttribute("id")
        if (!id) continue
        // if (id[0]=='-') console.log(id)

        let type = "textarea"
        let value = inp.value
        let checked = false
        a.push({ id: id, type:type, checked:checked, value:value })
    }

    return a
}

function restoreFieldsWithEvents( withEvents = false) {
    for (let c of controls) {
        let inp = document.getElementById(c.id)
        if (!inp) continue
        if (c.type == 'checkbox') {
            inp.checked = c.checked
        } else {
            inp.value = c.value
        }
        // inp.checked = c.checked
        // inp.value = c.value
        if (withEvents) dispatchChangeEvent(inp)
    }
}


function saveFields() {
    controls = getControls()
    let key = `${window.location.href}|${url}`
    let controlsStr = JSON.stringify(controls)
    localStorage.setItem(key, JSON.stringify(controls));
    console.log("saved: ", key, controlsStr.length )
}


function restoreFields() {
    let key = `${window.location.href}|${url}`
    let controlsStr = localStorage.getItem(key)
    controls = JSON.parse(controlsStr)


    ignoreChanges = true
    restoreFieldsWithEvents(true)
    setTimeout(() => {
        ignoreChanges = true
        restoreFieldsWithEvents(false)
        console.log("restored", key, controlsStr.length )
        ignoreChanges = false
    }, 100);
}



function changeHandler(){
    if (ignoreChanges) return
    // saveFields()
    // console.log('changeHandler')
}



onMount(async () => {
    // restoreFields()
})



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
    <Schemer bind:url bind:scheme on:change={changeHandler} />
    <div>
        <input type="button" on:click={saveFields} value="save">
        <input type="button" on:click={restoreFields} value="restore">
    </div>
    <div class="main">
        <List url={url} {scheme} on:change={changeHandler}/>
    </div>

</div>

<!-- <JsonView json={scheme}/> -->

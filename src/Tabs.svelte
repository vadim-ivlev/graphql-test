<script>
import {createEventDispatcher,onMount} from 'svelte'


export let tabs = []
export let active = ""

const dispatch = createEventDispatcher()




let n = 3
function activate(e) {
    active = this.getAttribute("data-tab")
}

function getKeysFromLocalStorage() {
    return Object.keys(localStorage)
}



function addTab(){
    let tabName = prompt("New tab name","")
    if (!tabName) return
    while (tabs.includes(tabName)){
        tabName = prompt(`"${tabName}" already exists. Please try again.`,tabName)
        if (!tabName) return
    }
    tabs = [...tabs, tabName]
    active = tabName
}

function deleteTab(){
    let tab = this.getAttribute("data-tab")
    tabs = tabs.filter( e => e != tab)
    active = tabs.length >0 ? tabs[0] : ''
    console.log(active)
}


function renameTab(){

}


function saveTab(){
    dispatch('save', {tab: active} )
}

onMount(async () => {
    let storedTabs = getKeysFromLocalStorage()
    tabs = storedTabs.length ==0 ? ['Test endpont'] : [...tabs, ...storedTabs]
    active = tabs[0]
})


</script>

<style>
    .container {
        padding: 10px 0 0 0;
        /* background-color: whitesmoke; */
    }
    .plus {
     }

    .tab {
        margin: 0;
        display: inline-block;
        padding: 1px 10px 1px 10px;
        cursor: default;
        border-bottom: 2px solid transparent;
        color: gray;
        /* background-color: transparent; */
    }

    .active {
        /* display: inline-block;
        padding: 5px 20px 5px 20px;
        cursor: pointer; */

        background-color: white;
        border-bottom-color: steelblue;
        color: black;
        }
    .x {
        border-radius: 20px;
        border: 1px solid transparent;
        display: inline-block;
        font-size: 70%;
        width:14px;
        height: 14px;
        text-align: center;
        vertical-align: bottom;
        margin-left:5px;
        background-color: transparent;
        font-weight: bold;
    }
    .x:hover {
        border-color: silver;
    }

    .buttons {
        float: right;
    }
    .button {
        /* font-family: 'Roboto Condensed'; */
        /* font-weight: bold; */
        /* letter-spacing: 0.1em; */
        padding: 0 5px 0 5px;
        border: 1px solid steelblue;
        /* border-radius: 4px; */
        background-color: transparent;
        color: steelblue;
    }


</style>

<div class="container">
    {#if tabs && tabs.length > 0}
    <span class="buttons">
        <input type="button" class="button" value="rename" on:click={renameTab}>
        <input type="button" class="button" value="save" on:click={saveTab}>
    </span>
    {/if}

    {#each tabs as tab (tab)}
        <span class="tab" class:active={tab == active} data-tab={tab} on:click={activate}>{tab} 
            <span class="x" data-tab={tab} on:click={deleteTab}>x</span>
        </span>
    {/each}
    <span class="tab plus" on:click={addTab}>+</span>
</div>
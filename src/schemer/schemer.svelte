<script>

import { createEventDispatcher } from 'svelte'
import { queryString } from "./schemer.js"
import JsonView from '../JsonView.svelte'

export let url = "http://localhost:7700/graphql"
export let scheme = {}
export let parentid =''
export let refreshScheme = getScheme
export let urlElement 


let visible = false


const dispatch = createEventDispatcher()


async function getScheme() {
    clearScheme()
    scheme = {}    
    // scheme =  await $.ajax({ url: inputUrl.value, type: "POST", data: { query:queryString, variables: '{}'},});
    try {
        let resp = await fetch(urlElement.value, { method: "POST",  credentials: 'include', body: JSON.stringify({ query: queryString, variables: "{}" }) })
        scheme = await resp.json()
    } catch (error) {
        alert(error)
    }
}

function clearScheme() {
    //scheme = {}     
    dispatch('clear', { text: 'clear storage' })
    console.log('clearScheme:', parentid)
}

// function onChange() {
// }


</script>

<style>

    .text {
        width: 400px;
        font-size: 100%;
    }
    .button {
        padding: 2px 10px 2px 10px;
        border: 1px solid steelblue;
        border-radius: 2px;
        background-color: transparent;
        color: steelblue;
        font-size: 100%;
    }

    label {
        margin-left:0;
    }

</style>


<div>

  <form>
        <label for="id-{parentid}-inp-url" >GraphQL endpoint</label>
        <input class="text" type="text" id="id-{parentid}-inp-url" name="id-{parentid}-inp-url" bind:this={urlElement} value={url} />
        <input type="button" class="button" value="&#x21bb; reload scheme" on:click={getScheme} />
        {#if Object.entries(scheme).length != 0 }
        <br>
        <a href on:click|preventDefault={ e => {visible = ! visible} } >{visible?'Hide':'Show'} scheme</a>
        {/if}
  </form>
  {#if visible}
        <JsonView json={scheme} />
  {/if}

</div>

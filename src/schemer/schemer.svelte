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
        width: 294px;
        font-size: 100%;
        padding:1px 10px;
        border-radius: 4px;
        border: 1px solid silver;
        height: 28px;
    }
    .button {
        color: #E10098; 
        background-color: transparent;
        border: 1px solid #E10098;
        padding: 5px 15px 5px 15px;
        border-radius: 4px;
        height: 32px;

        font-family: 'Roboto Condensed';
        font-size: 80%;
        font-weight: bold;
        
        letter-spacing: 0.1em;
        text-transform: uppercase;
    }
    label {
        margin-left:0;
    }

</style>


<div>

  <form>
        <input class="text" type="text" id="id-{parentid}-inp-url" name="id-{parentid}-inp-url" placeholder="GraphQL endpoint" bind:this={urlElement} value={url} />
        <input type="button"  class="button" value="&#x21bb; reload schema" on:click={getScheme} />
        {#if Object.entries(scheme).length != 0 }
        <br>
        <a href on:click|preventDefault={ e => {visible = ! visible} } >{visible?'Hide':'Show'} scheme</a>
        {/if}
  </form>
  {#if visible}
        <JsonView json={scheme} />
  {/if}

</div>

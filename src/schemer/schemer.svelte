<script>

import { onMount } from 'svelte'
import { queryString } from "./schemer.js"
import JsonView from '../JsonView.svelte'

export let url = "http://localhost:7700/graphql"
export let scheme = {}
export let parentid =''
export let refreshScheme = getScheme

let visible = false
let urlElement 
let methodElement 

async function getScheme() {
    scheme = {}    
    // scheme =  await $.ajax({ url: inputUrl.value, type: "POST", data: { query:queryString, variables: '{}'},});
    let resp = await fetch(urlElement.value, { method: methodElement.value, body: JSON.stringify({ query: queryString, variables: "{}" }) })
    scheme = await resp.json()
}

function clearScheme() {
    scheme = {}     
}


onMount(async () => {
    // getScheme()
})

</script>

<style>
    .self {
        /* background-color: whitesmoke; */
    }
    .post {
        width: 50px;
        font-size: 100%;
    }
    .text {
        width: 300px;
        font-size: 100%;
    }

    input {font-size: 100%;}
</style>


<div class="self">
  <form>
    <input class="post" type="text" id="id-{parentid}-inp-method" value="POST" bind:this={methodElement}>
    <label for="id-{parentid}-inp-url">GraphQL url</label>
    <input class="text" type="text" id="id-{parentid}-inp-url" name="id-{parentid}-inp-url"  bind:value={url} bind:this={urlElement} on:change/>
    <input type="button" value="reset" on:click={clearScheme} />
    <input type="button" value="refresh" on:click={getScheme} />
    <a href on:click|preventDefault={ e => {visible = ! visible} } >{visible?'Hide':'Show'} scheme</a>
  </form>
  {#if visible}
        <JsonView json={scheme} />
  {/if}
</div>

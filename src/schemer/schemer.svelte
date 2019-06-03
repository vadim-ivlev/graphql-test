<script>

import { onMount } from 'svelte'
import { queryString } from "./schemer.js"
import JsonView from '../JsonView.svelte'

export let url = "http://localhost:7700/graphql"
export let scheme = {}
let visible = false


async function getSchema() {
// scheme =  await $.ajax({ url: url, type: "POST", data: { query:queryString, variables: '{}'},});
let resp = await fetch(url, { method: "POST", body: JSON.stringify({ query: queryString, variables: "{}" }) })
scheme = await resp.json()
}


onMount(async () => {
    // getSchema()
})

</script>

<style>
    .self {
        /* background-color: whitesmoke; */
    }

    .text {
      width: 300px;
      /* border: 1px solid red; */
      font-size: 100%
    }

    input {font-size: 100%;}
</style>


<div class="self">
  <form>
    <label for="inp0">GraphQL url</label>
    <input class="text" type="text" id="inp0" name="inp0" bind:value={url} on:change/>
    <input type="button" value="refresh" on:click={getSchema} />
    <a href on:click|preventDefault={ e => {visible = ! visible} } >{visible?'Hide':'Show'} scheme</a>
  </form>
  {#if visible}
        <JsonView json={scheme} />
  {/if}
</div>

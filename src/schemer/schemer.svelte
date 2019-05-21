<script>
    import {getSchema} from './schemer.js'
</script>



<form>
    <label for="inp0">GraphQL endpoint. </label>
    <input id="inp0" type="text" name="inp0" value="http://localhost:7777/graphql">
    <input id="btn0" type="button" value="refresh" on:click={getSchema}>
    <div id="schema"></div>
</form>
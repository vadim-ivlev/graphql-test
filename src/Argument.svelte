<script>
export let node = {}

</script>

<style>
    .field {
        margin-left: 20px;
        margin-top: 0.5em;
    }

    .description {
        display: inline-block;
        color: gray;
        font-size: 90%;
        /* margin-bottom: 10px; */
        /* width: 80%; */
        /* max-width: 400px; */
        vertical-align: top;

    }
    .argname { 
        display: inline-block;
        min-width: 130px;
        margin-left: 20px;
        text-align: left;
    }
    .input {
        width: 130px;
    }
    .oftype { 
        display: inline-block;
        min-width: 50px;

    }
    input {
        font-size: inherit;
    }

</style>


<!-- {@debug} -->
<div class="field">  
    
    <span class="description"><input type="checkbox"> {node.description}</span>
    <br> 
    <span class="argname">{node.name}</span>
    <input class="input">
    <!-- <span class="kind">{node.type.kind}</span>  -->
    <span class="oftype">{node.type.name || node.type.ofType.name}{node.type.kind=='NON_NULL'?'!':''} </span> 
</div>
 
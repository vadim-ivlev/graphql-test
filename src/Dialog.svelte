<script>

let hidden = true
let message 
let input 
let callback = null

export function showDialog(text, value, callbackFunc) {
    callback = callbackFunc
    message.innerText = text
    input.value = value
    hidden = false
    setTimeout(()=>input.focus())
}


export function hideDialog(){
    hidden = true
}

function okPressed() {
    hideDialog()
    if (typeof callback == 'function')
        callback(input.value)
}

function onkeyup(event) {
    console.log(event.keyCode)
    if (event.keyCode === 13) {
        event.preventDefault()
        okPressed()
    } else if (event.keyCode === 27) {
        event.preventDefault()
        hideDialog()
    }

}

</script>

<style>
    /* The Modal (background) */
    .modal {
        position: fixed; /* Stay in place */
        z-index: 100; /* Sit on top */
        /* padding-top: 1px;  */
        left: 0;
        top: 0;
        width: 100%; /* Full width */
        height: 100%; /* Full height */
        overflow: auto; /* Enable scroll if needed */
        background-color: rgb(0,0,0); /* Fallback color */
        background-color: rgba(0,0,0,0.1); /* Black w/ opacity */
    }

    /* Modal Content */
    .modal-content {
        position: relative;
        background-color: #fefefe;
        margin: auto;
        width: 100%;
        max-width: 500px;
        box-shadow: 0px 10px 50px rgba(0, 0, 0, 0.356);
    }


    /* The Close Button */
    .close {
        color: #aaaaaa;
        position: absolute;
        top:0px;
        right:10px;;
        font-size: 28px;
        font-weight: bold;
        margin:0;
        padding:0;
    }

    .close:hover,
    .close:focus {
        color: #000;
        text-decoration: none;
        cursor: pointer;
    }
    .input-row {
        margin-left:20px;
        margin-right:20px;
    }
    .input {
        width: 100%;
    }
    .buttons {
        margin:20px;
        margin-bottom:0;
        padding-bottom:20px;
        text-align: right;
    }
    .buttons button {
        width: 100px;
    }

    .message {
        margin-left:20px;
        margin-right:20px;
        margin-bottom:20px;
        padding-top:15px;
    }

    .hidden {
        display: none;
    }

</style>


<!-- The Modal -->
<div class="modal" class:hidden on:click={hideDialog}>

  <!-- Modal content -->
  <div class="modal-content" onclick="event.stopPropagation()">
    <div class="close" on:click={hideDialog}>&times;</div>
    
    <div class="message" bind:this={message}></div>
    <div class="input-row">
        <input class="input" bind:this={input} value="" on:keyup={onkeyup}><br>
    </div>
    <div class="buttons">
        <button on:click={hideDialog}>Cancel</button>
        <button on:click={okPressed}>Ok</button>    
    </div>
    
  </div>

</div>
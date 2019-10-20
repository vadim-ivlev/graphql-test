var txta = document.getElementById('txta')
var divcm = document.getElementById('divcm')
var cm
// txta.innerText = `hello`
var cmJsOpt = {
    value: 'function helloWorld(){	console.log("hello world")	return }',
    mode:  "javascript",
    // lineNumbers: true,
    extraKeys: {'Ctrl-Space':'autocomplete'},
    theme: "darcula",
}
function makeCm(txtarea, opt){
    console.log('making CodeMirror')
    cm = CodeMirror.fromTextArea(txtarea, opt);
}
makeCm(txta, cmJsOpt)

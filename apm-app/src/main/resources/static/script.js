let lastKey = "";
let lastLoadedVal = "";
let lastDisplayedVal = "";
let inEditMode = false;

function init() {
    setInterval(doLoad, 5000);
}

function load() {
    lastKey = document.getElementById('key').value;
    inEditMode = false;
    updateMode();
    doLoad();
}

function doLoad() {
    if (lastKey === "") {
        return;
    }
    const val = document.getElementById('value');
    const err = document.getElementById('error');
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'store/' + encodeURIComponent(lastKey));
    xhr.onload = function () {
        if (xhr.status === 200 || xhr.status === 404) {
            lastLoadedVal = xhr.responseText;
            if (!inEditMode) {
                lastDisplayedVal = lastLoadedVal;
                val.value = lastLoadedVal;
            }
            updateMode()
            err.innerHTML = '';
            err.style.visibility = 'hidden';
        } else {
            err.innerHTML = 'Error: ' + xhr.status;
            err.style.visibility = 'visible';
        }
    };
    xhr.send();
}

function store() {
    lastKey = document.getElementById('key').value;
    inEditMode = false;
    updateMode();

    const val = document.getElementById('value');
    const err = document.getElementById('error');
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', 'store/' + encodeURIComponent(lastKey));
    xhr.setRequestHeader('Content-Type', 'text/plain')
    xhr.onload = function () {
        if (xhr.status === 204) {
            err.innerHTML = '';
            err.style.visibility = 'hidden';
        } else {
            err.innerHTML = 'Error: ' + xhr.status;
            err.style.visibility = 'visible';
        }
    };
    xhr.send(val.value);
}

function onEdit() {
    inEditMode = true;
    updateMode();
}

function updateMode() {
    if (lastKey === "") {
        return;
    }
    const val = document.getElementById('value');
    val.classList.remove('editing', 'conflict', 'clean')
    if (inEditMode) {
        if (lastLoadedVal === lastDisplayedVal) {
            val.classList.add('editing');
        } else {
            val.classList.add('conflict');
        }
    } else {
        val.classList.add('clean');
    }
}

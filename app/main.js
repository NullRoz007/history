var locationData;
var currentIteration = 1;

function get(endpoint, callback) {
    const xhttp = new XMLHttpRequest();
    const url = endpoint;
    xhttp.open("GET", url);
    xhttp.send();

    xhttp.onreadystatechange = function() {
        if(this.readyState == 4 && this.status == 200) { 
            callback(xhttp.responseText);
        }
    }
}

function getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
 
    return color;
}

function step() {
    get('/step', () => {
        get("/history", (response) => {
            locationData = JSON.parse(response);
            clearGrid();
            createGrid();
        });
    });
}

function updateCellDataUI(gameCell) {
    const eventIndex = gameCell.events.length - 1;
    gameCell.events.sort((a, b) => {
        if(a.iteration < b.iteration) return -1;
        if(a.iteration > b.iteration) return 1;
        
        return 0;
    });

    const lastEvent = gameCell.events[eventIndex]; 

    document.getElementById("cell-name").textContent = "Unnammed Region";
    document.getElementById("cell-location").textContent = lastEvent.location.x + ", "+lastEvent.location.y;
    document.getElementById("cell-race").textContent = lastEvent.race;
    document.getElementById("cell-population").textContent = lastEvent.population;
    document.getElementById("cell-resources").textContent = "";
    document.getElementById("cell-structures").textContent = "";
    document.getElementById("event-list").innerHTML = "";

    for(let event of gameCell.events) {
        const action = event.action;
        const iteration = event.iteration;
        const eventString = `${iteration}BC: ${action}`;
        var node = document.createElement("li");
        node.appendChild(document.createTextNode(eventString));
        document.getElementById("event-list").appendChild(node);
    }
}

function clearGrid() {
    document.querySelectorAll(".cell")
            .forEach((c) => c.parentNode.removeChild(c));
}

function createGrid() {
    const gridContainer = document.getElementById("grid-container");

    const totalCells = 100 * 50;
    const width = 100;
    const height = 50;
    var locations = [];

    for(let location in locationData) {
        locations.push(location);
    }

    let i = 0;
    for(let y = 0; y < height; y++) {
        for(let x = 0; x < width; x++) {
            const coords = x + ","+y;
            const cell = document.createElement("div");
            cell.classList.add("cell");

            if(locations.indexOf(coords) != -1) { 
                cell.style.backgroundColor = "lightgreen";
            }

            cell.addEventListener('click', (event) => {
                console.log(coords);
                updateCellDataUI(locationData[coords]);
                
            });
            
            gridContainer.appendChild(cell);
        }
    }

    
}


get("/history", (response) => {
    locationData = JSON.parse(response);
    createGrid();
});
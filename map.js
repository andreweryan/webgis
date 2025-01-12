// Global variables
let map;
let drawnItems;
let basemaps = {};
let overlays = {};
let geotiffLayer;
let layerControl;

// Map defaults
const defaultHome = [39, -95];
const defaultZoom = 5

// Raster defaults
var currentOpacity = 1;
var currentBrightness = 1.0;
var bandOrder = [0, 1, 2]; // Default RGB order

map = L.map("map", {
    center: defaultHome,
    zoom: defaultZoom
});

basemaps = {
    "OpenStreetMap": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors"
    }),
    "Satellite": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Tiles © Esri",
        maxZoom: 19
    })
};

basemaps["OpenStreetMap"].addTo(map);

L.control.scale({position: "bottomright"}).addTo(map);

drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

overlays = {
    "Drawn Features": drawnItems
};

// Fly To/Fly Home panel
const combinedControl = L.control({ position: "bottomleft" });

let showCoordinatesPopup = true;

combinedControl.onAdd = function (map) {
    const div = L.DomUtil.create("div", "control-panel");
    div.innerHTML = `
        <div style="margin-top: 1px;">
            <label>Latitude:</label>
            <input type="number" id="latitudeInput" placeholder="Lat" step="any">
            <label>Longitude:</label>
            <input type="number" id="longitudeInput" placeholder="Lon" step="any">
            <button id="flyToButton">Fly To</button>
            <button id="flyHomeButton">Fly Home</button>
        </div>
        <div style="margin-top: 10px;">
            <label>Clicked Coordinates:</label>
            <input type="text" id="clickedCoords" readonly style="width: 200px;">
            <button id="copyCoordsButton">Copy</button>
        </div>
    `;

    // Prevent map interactions when using the control panel
    L.DomEvent.disableScrollPropagation(div);
    L.DomEvent.disableClickPropagation(div);

    // Add click event for the Fly Home button
    const flyHomeButton = div.querySelector("#flyHomeButton");
    flyHomeButton.onclick = function () {
        map.flyTo(defaultHome, defaultZoom); // Fly to the home location at zoom level 13
    };

    // Add click event for the Fly To button
    const flyToButton = div.querySelector("#flyToButton");
    flyToButton.onclick = function () {
        const latInput = parseFloat(div.querySelector("#latitudeInput").value);
        const lonInput = parseFloat(div.querySelector("#longitudeInput").value);

        if (isNaN(latInput) || isNaN(lonInput)) {
            alert("Please enter latitude and longitude coorindates.");
            return;
        }

        map.flyTo([latInput, lonInput], 13); // Fly to the entered coordinates at zoom level 13
    };

    // Copy Coordinates button functionality
    const copyCoordsButton = div.querySelector("#copyCoordsButton");
    copyCoordsButton.onclick = function () {
        const clickedCoordsInput = div.querySelector("#clickedCoords").value;

        if (!clickedCoordsInput) {
            alert("No coordinates available to copy.");
            return;
        }

        // Write to clipboard
        navigator.clipboard.writeText(clickedCoordsInput)
            // .then(() => alert("Coordinates copied to clipboard!"))
            .catch((err) => {
                console.error("Failed to copy text: ", err);
                alert("Failed to copy coordinates. Check your browser permissions.");
            });
    };

    return div;
};

// Add the combined control to the map
combinedControl.addTo(map);

map.on("click", function (e) {
    const clickedCoords = document.querySelector("#clickedCoords");
    clickedCoords.value = `${e.latlng.lat}, ${e.latlng.lng}`;
});

// Store the layer control reference
layerControl = L.control.layers(basemaps, overlays, {
    position: "topright",
    collapsed: false
}).addTo(map);

const drawControl = new L.Control.Draw({
    draw: {
        polygon: {
            repeatMode: true,
            shapeOptions: {
                color: "#3388ff"
            }
        },
        circle: {
            repeatMode: true,
            shapeOptions: {
                color: "#3388ff"
            }
        },
        rectangle: {
            repeatMode: true,
            shapeOptions: {
                color: "#3388ff"
            }
        },
        polyline: {
            repeatMode: true,
            shapeOptions: {
                color: "#3388ff"
            }
        },
        marker: {
            repeatMode: true
        },
    },
    edit: {
        featureGroup: drawnItems
    }
});

map.addControl(drawControl);

map.on("draw:created", function(e) {
    let layer = e.layer;
    
    // Convert circle to polygon if the layer is a circle
    if (e.layerType === "circle") {
        const center = layer.getLatLng();
        const radius = layer.getRadius();
        const points = 32; // Number of points to create the polygon
        const polygon = createCirclePolygon(center, radius, points);
        layer = polygon;
    }

    if (e.layerType === "polygon") {
        layer.setStyle({
            color:"#000000",
            weight:1,
            fillOpacity: 0.25,
            fillColor: "#4287f5"});
    }
    else if (e.layerType === "circle") {
        layer.setStyle({
            color:"#000000",
            weight:1,
            fillOpacity: 0.25,
            fillColor: "#4287f5"});
    }
    else if (e.layerType === "rectangle") {
        layer.setStyle({
            color:"#000000",
            weight:1,
            fillOpacity: 0.25,
            fillColor: "#4287f5"});
    }
    else if (e.layerType === "polyline") {
        layer.setStyle({
            color:"#000000",
            weight:2,
        });
    }

    
    drawnItems.addLayer(layer);
    updateJson();
});

// Function to create a polygon that approximates a circle
function createCirclePolygon(center, radius, points) {
    const coordinates = [];
    const radiusInDegrees = radius / 111300; // Convert meters to degrees (approximate)
    
    for (let i = 0; i <= points; i++) {
        const angle = (i * 2 * Math.PI) / points;
        const lat = center.lat + (radiusInDegrees * Math.cos(angle));
        const lng = center.lng + (radiusInDegrees * Math.sin(angle) / Math.cos(center.lat * Math.PI / 180));
        coordinates.push([lat, lng]);
    }
    
    // Close the polygon by adding the first point again
    coordinates.push(coordinates[0]);
    
    // Create and return a Leaflet polygon
    return L.polygon(coordinates);
}

map.on("draw:edited", updateJson);
map.on("draw:deleted", updateJson);


setTimeout(() => {
    map.invalidateSize();
}, 100);

console.log("Map initialized successfully");


function updateJson() {
    const drawings = drawnItems.toGeoJSON();
    const jsonOutput = document.getElementById("jsonOutput");
    if (jsonOutput) {
        jsonOutput.value = JSON.stringify(drawings, null, 2);
    }
}

function saveDrawings() {
    const drawings = drawnItems.toGeoJSON();
    const blob = new Blob([JSON.stringify(drawings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "map-vectors.json";
    a.click();
    URL.revokeObjectURL(url);
}

function loadDrawings() {
	document.getElementById("loadFile").click();
}

function handleFileSelect(event) {
	const file = event.target.files[0];
	if (file) {
		const reader = new FileReader();
		reader.onload = function(e) {
			try {
				const drawings = JSON.parse(e.target.result);
				drawnItems.clearLayers();
				L.geoJSON(drawings).eachLayer(layer => {
					drawnItems.addLayer(layer);
				});
				updateJson();
			} catch (error) {
				console.error("Error loading file:", error);
				alert("Error loading file. Please make sure it\"s a valid GeoJSON file.");
			}
		};
		reader.readAsText(file);
	}
}

function createControlPanel() {
    // Create control panel
    const controlPanel = L.control({position: "bottomright"});

    controlPanel.onAdd = function () {
        const div = L.DomUtil.create("div", "geotiff-control-panel");
        div.style.padding = "10px";
        div.style.backgroundColor = "white";
        div.style.border = "2px solid rgba(0,0,0,0.2)";
        div.style.borderRadius = "4px";
        div.style.marginBottom = "20px";

        div.innerHTML = `
            <div style="margin-bottom: 10px;">
                <label>Opacity: <span id="opacityValue">100%</span></label><br>
                <input type="range" id="opacitySlider" min="0" max="100" value="100"
                    style="width: 200px;">
            </div>
            <div style="margin-bottom: 10px;">
                <label>Brightness: <span id="brightnessValue">100%</span></label><br>
                <input type="range" id="brightnessSlider" min="0" max="200" value="100"
                    style="width: 200px;">
            </div>
            <div style="margin-bottom: 10px;">
                <label>Band Order:</label><br>
                <select id="redBand" style="width: 60px; margin-right: 5px;">
                    <option value="0">R</option>
                    <option value="1">G</option>
                    <option value="2">B</option>
                </select>
                <select id="greenBand" style="width: 60px; margin-right: 5px;">
                    <option value="1">G</option>
                    <option value="0">R</option>
                    <option value="2">B</option>
                </select>
                <select id="blueBand" style="width: 60px;">
                    <option value="2">B</option>
                    <option value="0">R</option>
                    <option value="1">G</option>
                </select>
            </div>
        `;

        // Prevent map interactions when using the control panel
        L.DomEvent.disableScrollPropagation(div);
        L.DomEvent.disableClickPropagation(div);

        return div;
    };

    return controlPanel;
}

async function loadGeoTIFF() {
    const fileInput = document.getElementById("geotiffFile");
    const file = fileInput.files[0];
    
    if (!file) {
        alert("Please select a GeoTIFF file");
        return;
    }

    console.log("Loading file:", file.name);

    try {
        const arrayBuffer = await file.arrayBuffer();
        console.log("File loaded as ArrayBuffer");
        
        console.log("Parsing GeoTIFF...");
        const parser = await parseGeoraster(arrayBuffer);
        console.log("GeoTIFF parsed:", parser);
        
        if (parser.numberOfRasters < 3) {
            alert("This GeoTIFF appears to be single-band. RGB controls will be disabled.");
        }

        if (geotiffLayer) {
            console.log("Removing existing GeoTIFF layer");
            map.removeLayer(geotiffLayer);
            delete overlays["GeoTIFF"];
			currentOpacity = 1;
			currentBrightness = 1.0;
			bandOrder = [0, 1, 2]; // Default RGB order
        }

        function updateGeoRasterLayer() {
            if (geotiffLayer) {
                map.removeLayer(geotiffLayer);
            }

            geotiffLayer = new GeoRasterLayer({
                georaster: parser,
                opacity: currentOpacity,
                resolution: 256,
                pixelValuesToColorFn: values => {
                    if (values.length >= 3) {
                        const red = values[bandOrder[0]];
                        const green = values[bandOrder[1]];
                        const blue = values[bandOrder[2]];
                        
                        if (red === null || green === null || blue === null) return null;
                        
                        // Apply brightness
                        const adjustedRed = Math.min(255, Math.max(0, red * currentBrightness));
                        const adjustedGreen = Math.min(255, Math.max(0, green * currentBrightness));
                        const adjustedBlue = Math.min(255, Math.max(0, blue * currentBrightness));
                        
                        return `rgb(${adjustedRed}, ${adjustedGreen}, ${adjustedBlue})`;
                    }
                    
                    const value = values[0];
                    if (value === null) return null;
                    const adjusted = Math.min(255, Math.max(0, value * currentBrightness));
                    return `rgb(${adjusted}, ${adjusted}, ${adjusted})`;
                }
            });

            geotiffLayer.addTo(map);
            overlays["GeoTIFF"] = geotiffLayer;
            
            if (layerControl) {
                map.removeControl(layerControl);
            }
            
            layerControl = L.control.layers(basemaps, overlays, {
                position: "topright",
                collapsed: false
            }).addTo(map);
        }

        // Initial layer creation
        updateGeoRasterLayer();

        // Add control panel

		const existingControl = document.querySelector(".geotiff-control-panel");

		if (existingControl) {
			existingControl.parentNode.removeChild(existingControl);
		} 
			
        const controlPanel = createControlPanel();
        controlPanel.addTo(map);

        // Setup event listeners
        document.getElementById("opacitySlider").addEventListener("input", function(e) {
            currentOpacity = parseInt(e.target.value) / 100;
            document.getElementById("opacityValue").textContent = `${e.target.value}%`;
            updateGeoRasterLayer();
        });

        document.getElementById("brightnessSlider").addEventListener("input", function(e) {
            currentBrightness = parseInt(e.target.value) / 100;
            document.getElementById("brightnessValue").textContent = `${e.target.value}%`;
            updateGeoRasterLayer();
        });

        const bandSelects = ["redBand", "greenBand", "blueBand"];
        bandSelects.forEach((id, index) => {
            document.getElementById(id).addEventListener("change", function(e) {
                bandOrder[index] = parseInt(e.target.value);
                updateGeoRasterLayer();
            });
        });

        // Create bounds and fit map
        const bounds = L.latLngBounds(
            [parser.ymin, parser.xmin],
            [parser.ymax, parser.xmax]
        );
        
        map.fitBounds(bounds);

    } catch (error) {
        console.error("Detailed error loading GeoTIFF:", error);
        console.error("Error stack:", error.stack);
        alert("Error loading GeoTIFF file. Please check the console for details.");
    }
}


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
let currentParser = null;
var bandOrder = [0, 1, 2];

// Vector defaults
let currentFileName = "map-vectors.json"

const defaultStyles = {
    polygon: {
        color: "#000000",
        weight: 1,
        fillOpacity: 0.25,
        fillColor: "#4287f5"
    },
    polyline: {
        color: "#000000",
        weight: 2
    },
    marker: {}
};

map = L.map("map", {
    center: defaultHome,
    zoom: defaultZoom
});

console.log("Map initialized successfully");

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
const coordControls = L.control({ position: "bottomleft" });

coordControls.onAdd = function (map) {
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

// Update Drawn Features
function updateJson() {
    const drawings = drawnItems.toGeoJSON();
    // Ensure each feature maintains its style information
    drawings.features.forEach(feature => {
        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
            // feature.properties.style = defaultStyles.polygon;
        } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
            // feature.properties.style = defaultStyles.polyline;
        }
    });
    
    const jsonOutput = document.getElementById("jsonOutput");
    if (jsonOutput) {
        jsonOutput.value = JSON.stringify(drawings, null, 2);
    }
}

// Save Drawn Features
function saveDrawings(saveAs = false) {
    // console.log('saveDrawings called, saveAs:', saveAs);
    
    const drawings = drawnItems.toGeoJSON();
    console.log('Current features:', drawings.features.length);
    
    // Apply styles to features
    drawings.features.forEach(feature => {
        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
            // feature.properties.style = defaultStyles.polygon;
        } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
            // feature.properties.style = defaultStyles.polyline;
        }
    });
    
    try {
        const blob = new Blob([JSON.stringify(drawings, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = currentFileName || "map-vectors.json";
        document.body.appendChild(a); // Add to document
        a.click();
        document.body.removeChild(a); // Clean up
        URL.revokeObjectURL(url);
        console.log('Save completed');
    } catch (error) {
        console.error('Error saving file:', error);
        alert('Error saving file. Check the console for details.');
    }
}

// Load/ Save Control Panel --- need to rename to something more unique eg saveControlPanel
function saveControlPanel() {
    const saveControls = L.control({ position: "topleft" });
    
    saveControls.onAdd = function (map) {
        const div = L.DomUtil.create("div", "save-control");
        
        // Create hidden file input and control buttons
        div.innerHTML = `
            <input type="file" id="loadFile" accept=".json,.geojson" style="display: none;">
            <div class="leaflet-bar">
                <a href="#" id="loadBtn" title="Load GeoJSON">📂</a>
                <a href="#" id="saveBtn" title="Save">💾</a>
                <a href="#" id="saveAsBtn" title="Save As...">📁</a>
            </div>
        `;
        
        // Add event listeners after the elements are created
        setTimeout(() => {
            const fileInput = document.getElementById('loadFile');
            const loadBtn = document.getElementById('loadBtn');
            const saveBtn = document.getElementById('saveBtn');
            const saveAsBtn = document.getElementById('saveAsBtn');
            
            if (fileInput) {
                fileInput.addEventListener('change', handleFileSelect);
            }
            
            if (loadBtn) {
                loadBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.getElementById('loadFile').click();
                });
            }
            
            if (saveBtn) {
                saveBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    saveDrawings(false);
                });
            }
            
            if (saveAsBtn) {
                saveAsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    saveDrawings(true);
                });
            }
        }, 100);
        
        // Prevent map clicks from propagating
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
        
        return div;
    };
    
    return saveControls;
}

// Load GeoJSON
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        currentFileName = file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const drawings = JSON.parse(e.target.result);
                
                drawnItems.clearLayers();

                const allBounds = L.latLngBounds();
                
                L.geoJSON(drawings, {
                    style: function(feature) {
                        switch (feature.geometry.type) {
                            case 'Polygon':
                            case 'MultiPolygon':
                                return defaultStyles.polygon;
                            case 'LineString':
                            case 'MultiLineString':
                                return defaultStyles.polyline;
                            default:
                                return {};
                        }
                    },
                    pointToLayer: function(feature, latlng) {
                        return L.marker(latlng);
                    },
                    onEachFeature: function(feature, layer) {
                        drawnItems.addLayer(layer);
                        if (layer.getBounds) {
                            allBounds.extend(layer.getBounds());
                        } else if (layer.getLatLng){
                            allBounds.extend(layer.getLatLng());
                        }
                    }
                });

                if (allBounds.isValid()) {
                    map.fitBounds(allBounds)
                }

                updateJson();
                // Reset file input so the same file can be loaded again
                event.target.value = '';
            } catch (error) {
                console.error("Error loading file:", error);
                alert("Error loading file. Please make sure it's a valid GeoJSON file.");
            }
        };
        reader.readAsText(file);
    }
}

// Raster Control Panel --- need to rename to something more unique eg rasterControlPanel
function rasterControlPanel() {
    const rasterControls = L.control({position: "bottomright"});

    rasterControls.onAdd = function () {
        const div = L.DomUtil.create("div", "geotiff-control-panel");
        div.style.padding = "10px";
        div.style.backgroundColor = "white";
        div.style.border = "2px solid rgba(0,0,0,0.2)";
        div.style.borderRadius = "4px";
        div.style.marginBottom = "20px";

        div.innerHTML = `
            <div style="margin-bottom: 10px;">
                <input type="file" id="geotiffFile" accept=".tif,.tiff" style="display: none" onchange="loadGeoTIFF()">
                <button onclick="document.getElementById('geotiffFile').click()">Upload GeoTIFF</button>
                <button onclick="removeGeoTIFF()">Remove GeoTIFF</button>
            </div>
            <div style="margin-bottom: 10px;">
                <button id="flyToGeoTIFFBtn" disabled>Fly to GeoTIFF</button>
            </div>
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
            <div style="display: flex; gap: 5px;">
                <div>
                    <label>Red:</label><br>
                    <select id="redBand" style="width: 75px;"></select>
                </div>
                <div>
                    <label>Green:</label><br>
                    <select id="greenBand" style="width: 75px;"></select>
                </div>
                <div>
                    <label>Blue:</label><br>
                    <select id="blueBand" style="width: 75px;"></select>
                </div>
            </div>
        `;

        // Prevent map interactions when using the control panel
        L.DomEvent.disableScrollPropagation(div);
        L.DomEvent.disableClickPropagation(div);

        return div;
    };

    return rasterControls;
}

// Load Raster Layer
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
        currentParser = await parseGeoraster(arrayBuffer);
        console.log("GeoTIFF parsed. Number of bands:", currentParser.numberOfRasters);
        console.log(currentParser)

        // Extract RGB values
        // const [redArray, greenArray, blueArray] = currentParser.values;

        const redArray = currentParser.values[bandOrder[0]];
        const greenArray = currentParser.values[bandOrder[1]];
        const blueArray = currentParser.values[bandOrder[2]];
        

        // Sample the data to improve performance
        function sampleArray(array, step = 10) {
            const sampled = [];
            for (let i = 0; i < array.length; i += step) {
                for (let j = 0; j < array[i].length; j += step) {
                    const value = array[i][j];
                    if (value !== null) sampled.push(value);
                }
            }
            return sampled;
        }

        const sampledRed = sampleArray(redArray);
        console.log(sampledRed)
        const sampledGreen = sampleArray(greenArray);
        const sampledBlue = sampleArray(blueArray);

        // Calculate percentiles
        // function calculatePercentile(values, percentile) {
        //     const sorted = values.sort((a, b) => a - b);
        //     const index = Math.floor(percentile * sorted.length);
        //     return sorted[index];
        // }

        // const redMin = calculatePercentile(sampledRed, 0.02);
        // const redMax = calculatePercentile(sampledRed, 0.98);
        // const greenMin = calculatePercentile(sampledGreen, 0.02);
        // const greenMax = calculatePercentile(sampledGreen, 0.98);
        // const blueMin = calculatePercentile(sampledBlue, 0.02);
        // const blueMax = calculatePercentile(sampledBlue, 0.98);
        
        // Calculate min max for scaling instead of pct clip
        const redMin = isNaN(Math.min(...sampledRed)) ? 0 : Math.min(...sampledRed);
        const redMax = isNaN(Math.max(...sampledRed)) ? 0 : Math.max(...sampledRed);
        const greenMin = isNaN(Math.min(...sampledGreen)) ? 0 : Math.min(...sampledGreen);
        const greenMax = isNaN(Math.max(...sampledGreen)) ? 0 : Math.max(...sampledGreen);
        const blueMin = isNaN(Math.min(...sampledBlue)) ? 0 : Math.min(...sampledBlue);
        const blueMax = isNaN(Math.max(...sampledBlue)) ? 0 : Math.max(...sampledBlue);


        // Function to normalize and apply brightness
        function normalizeValue(value, min, max) {
            return (value - min) / (max - min);
        }

        function adjustColor(value, min, max, brightness) {
            const normalized = normalizeValue(value, min, max);
            return Math.min(255, Math.max(0, normalized * 255 * brightness));
        }

        if (geotiffLayer) {
            console.log("Removing existing GeoTIFF layer");
            map.removeLayer(geotiffLayer);
            delete overlays["GeoTIFF"];
            currentOpacity = 1;
            currentBrightness = 1.0;
            ; // Reset to default RGB order
        }

        updateBandSelectionDropdowns(currentParser.numberOfRasters);

        function updateGeoRasterLayer() {
            if (geotiffLayer) {
                map.removeLayer(geotiffLayer);
            }
            
            console.log("Current band order:", bandOrder); // Debug log
            
            geotiffLayer = new GeoRasterLayer({
                georaster: currentParser,
                opacity: currentOpacity,
                resolution: 256,
                pixelValuesToColorFn: values => {
                    if (values.length > Math.max(...bandOrder)) {
                        const red = adjustColor(values[bandOrder[0]], redMin, redMax, currentBrightness);
                        const green = adjustColor(values[bandOrder[1]], greenMin, greenMax, currentBrightness);
                        const blue = adjustColor(values[bandOrder[2]], blueMin, blueMax, currentBrightness);
                        return `rgb(${red}, ${green}, ${blue})`;
                    }
                    return null;
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
			
        const rasterControls = rasterControlPanel();
        rasterControls.addTo(map);

        updateBandSelectionDropdowns(currentParser.numberOfRasters);

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

        ["redBand", "greenBand", "blueBand"].forEach((id, index) => {
            const select = document.getElementById(id);
            select.addEventListener("change", function (e) {
                const newBandIndex = parseInt(e.target.value);
                console.log(`Changing ${id} to band ${newBandIndex}`);
                
                // Update band order
                bandOrder[index] = newBandIndex;
                console.log("Updated band order:", bandOrder);
        
                // Refresh the GeoTIFF layer
                updateGeoRasterLayer();
            });
        });

        // Create bounds and fit map
        const bounds = L.latLngBounds(
            [currentParser.ymin, currentParser.xmin],
            [currentParser.ymax, currentParser.xmax]
        );
        
        map.fitBounds(bounds);

        const flyToGeoTIFFBtn = document.getElementById("flyToGeoTIFFBtn");
        flyToGeoTIFFBtn.disabled = false;
        flyToGeoTIFFBtn.onclick = () => map.flyToBounds(bounds, { duration: 1.5 });

    } catch (error) {
        console.error("Detailed error loading GeoTIFF:", error);
        console.error("Error stack:", error.stack);
        alert("Error loading GeoTIFF file. Please check the console for details.");
    }
}

function updateBandSelectionDropdowns(numberOfBands) {
    const bandSelects = ["redBand", "greenBand", "blueBand"];
    const defaultValues = [0, 1, 2]; // Default RGB selection

    bandSelects.forEach((selectId, index) => {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = ''; // Clear existing options

        // Add options for each band
        for (let i = 0; i < numberOfBands; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.text = `Band ${i + 1}`;
            select.appendChild(option);
        }

        // Set default value if available, otherwise first band
        if (defaultValues[index] < numberOfBands) {
            select.value = defaultValues[index];
        } else {
            select.value = 0;
        }
    });
}

// Remove Raster Layer
function removeGeoTIFF() {
    if (geotiffLayer) {
        console.log("Removing GeoTIFF layer...");

        // Remove GeoTIFF layer from the map
        map.removeLayer(geotiffLayer);

        // Remove GeoTIFF from overlays
        delete overlays["GeoTIFF"];

        // Reset variables related to GeoTIFF
        geotiffLayer = null;
        currentParser = null;
        currentOpacity = 1;
        currentBrightness = 1.0;
        bandOrder = [0, 1, 2]; // Default RGB order

        const flyToGeoTIFFBtn = document.getElementById("flyToGeoTIFFBtn");
        flyToGeoTIFFBtn.disabled = true;

        console.log("GeoTIFF layer removed successfully.");
    } else {
        console.log("No GeoTIFF layer to remove.");
    }
}

// Fly to GeoTIFF
function addFlyToGeoTIFFButton(bounds) {
    const existingButton = document.getElementById("geoTIFFControls");
    if (existingButton) {
        existingButton.remove(); // Remove existing button if present
    }

    const button = document.createElement("button");
    button.id = "geoTIFFControls";
    button.textContent = "Fly to GeoTIFF";
    button.style.marginLeft = "10px";

    // Add functionality to fly to GeoTIFF bounds
    button.addEventListener("click", () => {
        map.flyToBounds(bounds, { duration: 1.5 });
    });

    // Append the button next to the upload/remove GeoTIFF buttons
    const rasterControls = document.querySelector(".geotiff-control-panel");
    if (rasterControls) {
        rasterControls.appendChild(button);
    }
}

map.addControl(drawControl);

saveControlPanel().addTo(map);

coordControls.addTo(map);

const rasterControls = rasterControlPanel();
rasterControls.addTo(map);

map.on("draw:created", function(e) {
    let layer = e.layer;
    
    // Convert circle to polygon if the layer is a circle
    if (e.layerType === "circle") {
        const center = layer.getLatLng();
        const radius = layer.getRadius();
        const points = 32;
        const polygon = createCirclePolygon(center, radius, points);
        layer = polygon;
    }

    // Apply styles based on geometry type
    if (layer instanceof L.Polygon) {
        layer.setStyle(defaultStyles.polygon);
    } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
        layer.setStyle(defaultStyles.polyline);
    }
    
    drawnItems.addLayer(layer);
    updateJson();
});

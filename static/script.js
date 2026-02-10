const idToName = {
    1: "Alabama", 2: "Alaska", 4: "Arizona", 5: "Arkansas", 6: "California", 8: "Colorado", 9: "Connecticut", 10: "Delaware",
    11: "District of Columbia", 12: "Florida", 13: "Georgia", 15: "Hawaii", 16: "Idaho", 17: "Illinois", 18: "Indiana", 19: "Iowa",
    20: "Kansas", 21: "Kentucky", 22: "Louisiana", 23: "Maine", 24: "Maryland", 25: "Massachusetts", 26: "Michigan", 27: "Minnesota",
    28: "Mississippi", 29: "Missouri", 30: "Montana", 31: "Nebraska", 32: "Nevada", 33: "New Hampshire", 34: "New Jersey", 35: "New Mexico",
    36: "New York", 37: "North Carolina", 38: "North Dakota", 39: "Ohio", 40: "Oklahoma", 41: "Oregon", 42: "Pennsylvania", 44: "Rhode Island",
    45: "South Carolina", 46: "South Dakota", 47: "Tennessee", 48: "Texas", 49: "Utah", 50: "Vermont", 51: "Virginia", 53: "Washington",
    54: "West Virginia", 55: "Wisconsin", 56: "Wyoming"
};
const allowed = new Set(Object.keys(idToName).map(Number));

const map = L.map('map', { worldCopyJump: false });
map.setMinZoom(3);

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const tiles = L.tileLayer(OSM_URL, {
    maxZoom: 18,
    noWrap: true
}).addTo(map);

tiles.getTileUrl = function (coords) {
    const z = coords.z;
    const n = 1 << z;

    const x = ((coords.x % n) + n) % n;
    const y = coords.y;

    return L.Util.template(OSM_URL, {
        s: this._getSubdomain(coords),
        z,
        x,
        y
    });
};

const firstFeature = g => g?.type === "FeatureCollection" ? g.features[0] : g;

function pointVariants(lng, lat) {
    return [
        turf.point([lng, lat]),
        turf.point([lng + 360, lat]),
        turf.point([lng - 360, lat])
    ];
}

function hitFeature(pts, feature) {
    for (const pt of pts) {
        if (turf.booleanPointInPolygon(pt, feature)) return true;
    }
    return false;
}

function mapGeometryCoords(geom, fn) {
    if (!geom) return geom;
    const t = geom.type;

    if (t === "Point") return { ...geom, coordinates: fn(geom.coordinates) };
    if (t === "MultiPoint" || t === "LineString")
        return { ...geom, coordinates: geom.coordinates.map(fn) };
    if (t === "MultiLineString" || t === "Polygon")
        return { ...geom, coordinates: geom.coordinates.map(ring => ring.map(fn)) };
    if (t === "MultiPolygon")
        return { ...geom, coordinates: geom.coordinates.map(poly => poly.map(ring => ring.map(fn))) };
    if (t === "GeometryCollection")
        return { ...geom, geometries: geom.geometries.map(g => mapGeometryCoords(g, fn)) };

    return geom;
}


//alaska crosses the antimeredian 
function shiftAlaskaWest(feature) {
    const shifted = {
        ...feature,
        geometry: mapGeometryCoords(feature.geometry, ([lng, lat]) => {
            if (lng > 0) lng -= 360;
            return [lng, lat];
        })
    };
    return shifted;
}

Promise.all([
    fetch("https://unpkg.com/us-atlas@3/states-10m.json").then(r => r.json()),
    fetch("https://unpkg.com/us-atlas@3/nation-10m.json").then(r => r.json())
]).then(([statesTopo, nationTopo]) => {
    const statesFC = topojson.feature(statesTopo, statesTopo.objects.states);

    const states = {
        type: "FeatureCollection",
        features: statesFC.features
            .filter(f => allowed.has(+f.id))
            .map(shiftAlaskaWest)
    };

    const nationGeo = topojson.feature(nationTopo, nationTopo.objects.nation);
    const nation = firstFeature(nationGeo);

    const statesLayer = L.geoJSON(states, {
        style: { weight: 1, fillOpacity: 0.05 }
    }).addTo(map);

    // Tight bounds around CONUS+AK+HI
    const b = statesLayer.getBounds().pad(0.10);
    map.fitBounds(b, { padding: [20, 20] });

    map.setMaxBounds(b);
    map.options.maxBoundsViscosity = 1.0;

    const urbanRingsLayer = L.layerGroup().addTo(map);

    function drawUrbanArea(rings) {
        //urbanRingsLayer.clearLayers();
        //if (!Array.isArray(rings) || rings.length === 0) return;

        //const flipped = rings.map(ring => ring.map(([lng, lat]) => [lat, lng]));
        //L.polygon(flipped, {
        //    color: "red",
        //    weight: 2,
        //    fillOpacity: 0.1
        //}).addTo(urbanRingsLayer);
    }

    map.on('click', (e) => {
        const { lng, lat } = e.latlng;
        const pts = pointVariants(lng, lat);

        if (!hitFeature(pts, nation)) return;

        let hit = null;
        for (const f of states.features) {
            if (hitFeature(pts, f)) { hit = f; break; }
        }
        if (!hit) return;

        const sid = +hit.id;
        const stateName = idToName[sid];
        const latS = lat.toFixed(6);
        const lngS = lng.toFixed(6);
        

        fetch(`/eval?lat=${latS}&lng=${lngS}&fips=${sid}`)
            .then(r => r.json())
            .then(raw => {
                const { name: nameRaw, info, urbanArea, ...other } = raw;
                const name = nameRaw ?? "Unincorporated " + stateName;

                console.log(raw);

                const content =
                    `<b>${name}</b>` +
                    Object.entries(info)
                        .map(([k, v]) => `<br>${k}: ${v}`)
                        .join('');

                drawUrbanArea(urbanArea);

                L.popup()
                    .setLatLng(e.latlng)
                    .setContent(content)
                    .openOn(map);
            }, err => {
                console.error(err);
                console.log({ state: stateName, lat: +latS, lng: +lngS, fips: String(sid).padStart(2, '0') });
            });
    });
}).catch(err => {
    console.error(err);
    alert("Failed to load boundary data.");
});
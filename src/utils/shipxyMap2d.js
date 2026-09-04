/* 2D map module — Leaflet + multi-source tiles (OSM default, no key needed) */

const Map2D = (() => {
    let map = null
    let shipMarkers = new Map()
    let routePolyline = null
    let routeStart = null
    let routeEnd = null
    let isInitialized = false
    let onShipClickCallback = null

    const TILE_LAYERS = {
        'osm': {
            name: 'OpenStreetMap',
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
            maxZoom: 19
        },
        'cartodb': {
            name: 'CartoDB Voyager',
            url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
            maxZoom: 20
        },
        'cartodb_light': {
            name: 'CartoDB 浅色',
            url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
            maxZoom: 20
        },
        'topo': {
            name: 'OpenTopoMap',
            url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="https://opentopomap.org/">OpenTopoMap</a>',
            maxZoom: 17
        }
    }

    let currentTileLayer = null

    const SHIP_TYPE_COLORS = {
        70: '#00d4ff', 80: '#f59e0b', 30: '#10b981',
        60: '#8b5cf6', 90: '#94a3b8', default: '#00d4ff'
    }

    function getShipColor(type) {
        return SHIP_TYPE_COLORS[type] || SHIP_TYPE_COLORS.default
    }

    function init(containerId) {
        if (isInitialized) return

        map = L.map(containerId, {
            center: [31.23, 121.47],
            zoom: 5,
            zoomControl: true,
            preferCanvas: true,
            attributionControl: true
        })

        currentTileLayer = L.tileLayer(TILE_LAYERS['osm'].url, {
            attribution: TILE_LAYERS['osm'].attribution,
            maxZoom: TILE_LAYERS['osm'].maxZoom
        }).addTo(map)

        L.control.scale({ imperial: false, metric: true }).addTo(map)
        addLayerControl()
        isInitialized = true
    }

    function addLayerControl() {
        const control = L.control({ position: 'topright' })
        control.onAdd = function () {
            const div = L.DomUtil.create('div', 'map-layer-control')
            div.innerHTML = `
                <select id="map-layer-select" class="map-layer-select">
                    ${Object.entries(TILE_LAYERS).map(([key, layer]) => `<option value="${key}">${layer.name}</option>`).join('')}
                </select>
            `
            L.DomEvent.disableClickPropagation(div)
            L.DomEvent.on(div.querySelector('select'), 'change', function (e) {
                switchTileLayer(e.target.value)
            })
            return div
        }
        control.addTo(map)
    }

    function switchTileLayer(layerKey) {
        if (currentTileLayer) map.removeLayer(currentTileLayer)
        const layer = TILE_LAYERS[layerKey]
        currentTileLayer = L.tileLayer(layer.url, {
            attribution: layer.attribution,
            maxZoom: layer.maxZoom
        }).addTo(map)
    }

    function createShipIcon(shipType, isSelected = false) {
        const color = getShipColor(shipType)
        const size = isSelected ? 14 : 10

        const canvas = document.createElement('canvas')
        canvas.width = 30
        canvas.height = 30
        const ctx = canvas.getContext('2d')

        const glowGrad = ctx.createRadialGradient(15, 15, size - 2, 15, 15, 15)
        glowGrad.addColorStop(0, color + '99')
        glowGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = glowGrad
        ctx.beginPath()
        ctx.arc(15, 15, 15, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(15, 15, size, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(15, 15, size * 0.5, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(15, 15 - size * 1.5)
        ctx.lineTo(15 - size * 0.6, 15 - size * 0.3)
        ctx.lineTo(15 + size * 0.6, 15 - size * 0.3)
        ctx.closePath()
        ctx.fill()

        return L.divIcon({
            html: `<img src="${canvas.toDataURL()}" width="30" height="30" style="filter:drop-shadow(0 0 6px ${color})">`,
            className: 'ship-marker-icon',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15]
        })
    }

    function addShipMarker(id, lat, lng, shipData = {}, onClick = null) {
        removeShipMarker(id)

        const shipType = shipData.ship_type || 70
        const icon = createShipIcon(shipType)

        const marker = L.marker([lat, lng], { icon })
        marker.shipId = id
        marker.shipData = shipData

        const naviLabels = { '-1': '无效', 0: '航行中', 1: '锚泊', 5: '靠泊' }
        const naviLabel = naviLabels[shipData.navistat] || '未知'

        marker.bindPopup(`
            <div class="ship-popup-inner">
                <strong>${shipData.ship_name || 'Unknown'}</strong>
                <span class="pp-cn">${shipData.ship_cnname || ''}</span>
                <hr>
                <div class="pp-body">
                    MMSI: ${shipData.mmsi || id} | IMO: ${shipData.imo || '--'}<br>
                    航速: ${shipData.sog?.toFixed(1) || '--'} 节 | 航向: ${shipData.cog?.toFixed(1) || '--'}°<br>
                    位置: ${lat?.toFixed(4)}, ${lng?.toFixed(4)}<br>
                    状态: ${naviLabel}<br>
                    目的地: ${shipData.dest || '--'}<br>
                    更新: ${shipData.last_time || '--'}
                </div>
            </div>
        `, { maxWidth: 300, className: 'ship-popup' })

        marker.on('click', () => {
            if (onClick) onClick(id, shipData)
            else if (onShipClickCallback) onShipClickCallback(id, shipData)
        })

        marker.addTo(map)
        shipMarkers.set(id, marker)
        return marker
    }

    function removeShipMarker(id) {
        const marker = shipMarkers.get(id)
        if (marker) {
            map.removeLayer(marker)
            shipMarkers.delete(id)
        }
    }

    function clearAllMarkers() {
        shipMarkers.forEach(marker => map.removeLayer(marker))
        shipMarkers.clear()
    }

    function addRoute(waypoints, color = '#00d4ff') {
        clearRoute()
        const latlngs = waypoints.map(wp => [wp.lat, wp.lng])
        routePolyline = L.polyline(latlngs, {
            color: color,
            weight: 3,
            opacity: 0.8,
            dashArray: '10, 6',
            lineCap: 'round'
        }).addTo(map)

        if (latlngs.length > 0) {
            routeStart = L.circleMarker(latlngs[0], {
                radius: 8, color: '#10b981', fillColor: '#10b981', fillOpacity: 0.8, weight: 2
            }).addTo(map).bindPopup('<b>起点</b>')
            routeEnd = L.circleMarker(latlngs[latlngs.length - 1], {
                radius: 8, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.8, weight: 2
            }).addTo(map).bindPopup('<b>终点</b>')
        }

        if (latlngs.length > 0) {
            map.fitBounds(routePolyline.getBounds(), { padding: [50, 50], maxZoom: 10 })
        }
    }

    function clearRoute() {
        if (routePolyline) {
            map.removeLayer(routePolyline)
            routePolyline = null
        }
        if (routeStart) { map.removeLayer(routeStart); routeStart = null }
        if (routeEnd) { map.removeLayer(routeEnd); routeEnd = null }
    }

    function focusOnLocation(lat, lng, zoom = 8) {
        map.setView([lat, lng], zoom, { animate: true, duration: 0.8 })
    }

    function fitAllMarkers() {
        const markers = Array.from(shipMarkers.values())
        if (markers.length > 0) {
            const group = L.featureGroup(markers)
            map.fitBounds(group.getBounds(), { padding: [30, 30], maxZoom: 12 })
        }
    }

    function setOnShipClick(callback) {
        onShipClickCallback = callback
    }

    function resize() {
        if (map) map.invalidateSize()
    }

    function getMap() {
        return map
    }

    function destroy() {
        if (map) {
            map.remove()
            map = null
        }
        shipMarkers.clear()
        isInitialized = false
    }

    return {
        init, resize, getMap, destroy,
        addShipMarker, removeShipMarker, clearAllMarkers,
        addRoute, clearRoute,
        focusOnLocation, fitAllMarkers,
        setOnShipClick,
        TILE_LAYERS, switchTileLayer
    }
})()

export default Map2D
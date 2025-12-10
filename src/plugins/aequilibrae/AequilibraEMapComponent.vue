<template lang="pug">
.aeq-map-component
  .map-container(:id="`map-${viewId}`")
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { GeoJsonLayer } from '@deck.gl/layers'
import { MapboxOverlay } from '@deck.gl/mapbox'
import maplibregl from 'maplibre-gl'
import { rgb } from 'd3-color'
import * as turf from '@turf/turf'

import globalStore from '@/store'

const BASE_URL = import.meta.env.BASE_URL

export default defineComponent({
  name: 'AequilibraEMapComponent',
  
  props: {
    features: { type: Array as PropType<any[]>, required: true },
    dark: { type: Boolean, default: false },
    viewId: { type: String, required: true },
  },

  data() {
    return {
      mymap: null as maplibregl.Map | null,
      deckOverlay: null as InstanceType<typeof MapboxOverlay> | null,
      globalState: globalStore.state,
      isMapReady: false,
    }
  },

  computed: {
    mapStyle(): string {
      return `${BASE_URL}map-styles/${this.dark ? 'dark' : 'positron'}.json`
    },

    layers() {
      if (!this.features?.length) return []

      // Separate features by geometry type for better rendering
      const points = this.features.filter(f => f.geometry?.type === 'Point')
      const lines = this.features.filter(f => 
        f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString'
      )
      const polygons = this.features.filter(f => 
        f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
      )

      const layers: any[] = []

      // Polygon layer (zones)
      if (polygons.length > 0) {
        layers.push(
          new GeoJsonLayer({
            id: `${this.viewId}-polygons`,
            data: polygons as any,
            pickable: true,
            stroked: true,
            filled: true,
            getFillColor: [100, 150, 200, 100],
            getLineColor: [80, 120, 160, 200],
            getLineWidth: 2,
            lineWidthMinPixels: 1,
            onHover: this.handleHover,
            onClick: this.handleClick,
          })
        )
      }

      // Line layer (links)
      if (lines.length > 0) {
        layers.push(
          new GeoJsonLayer({
            id: `${this.viewId}-lines`,
            data: lines as any,
            pickable: true,
            stroked: true,
            filled: false,
            getLineColor: [78, 121, 167, 220],
            getLineWidth: 3,
            lineWidthMinPixels: 1,
            lineWidthMaxPixels: 10,
            onHover: this.handleHover,
            onClick: this.handleClick,
          })
        )
      }

      // Point layer (nodes)
      if (points.length > 0) {
        layers.push(
          new GeoJsonLayer({
            id: `${this.viewId}-points`,
            data: points as any,
            pickable: true,
            stroked: true,
            filled: true,
            pointType: 'circle',
            getFillColor: [89, 161, 79, 200],
            getLineColor: [50, 100, 50, 255],
            getPointRadius: 5,
            pointRadiusMinPixels: 3,
            pointRadiusMaxPixels: 15,
            lineWidthMinPixels: 1,
            onHover: this.handleHover,
            onClick: this.handleClick,
          })
        )
      }

      return layers
    },

    initialBounds() {
      if (!this.features?.length) return null
      
      try {
        const fc = { type: 'FeatureCollection', features: this.features }
        const bbox = turf.bbox(fc as any)
        return bbox
      } catch (e) {
        console.warn('Could not calculate bounds:', e)
        return null
      }
    },
  },

  watch: {
    features: {
      handler() {
        this.updateLayers()
        if (this.mymap && this.initialBounds) {
          this.fitToBounds()
        }
      },
      deep: true,
    },

    dark() {
      this.mymap?.setStyle(this.mapStyle)
    },

    layers() {
      this.updateLayers()
    },
  },

  mounted() {
    this.setupMap()
  },

  beforeUnmount() {
    if (this.mymap) {
      this.mymap.remove()
      this.mymap = null
    }
  },

  methods: {
    async setupMap() {
      try {
        const container = document.getElementById(`map-${this.viewId}`)
        if (!container) {
          console.error('Map container not found')
          return
        }

        this.mymap = new maplibregl.Map({
          container: `map-${this.viewId}`,
          style: this.mapStyle,
          center: [0, 0],
          zoom: 2,
        })

        this.mymap.on('load', () => {
          this.isMapReady = true
          
          // Add deck.gl overlay
          this.deckOverlay = new MapboxOverlay({
            interleaved: false,
            layers: this.layers,
          })
          this.mymap!.addControl(this.deckOverlay as any)

          // Fit to bounds once map is ready
          if (this.initialBounds) {
            this.fitToBounds()
          }
        })

        // Add navigation controls
        this.mymap.addControl(new maplibregl.NavigationControl(), 'top-right')

      } catch (e) {
        console.error('Error setting up map:', e)
      }
    },

    fitToBounds() {
      if (!this.mymap || !this.initialBounds) return
      
      const [minLng, minLat, maxLng, maxLat] = this.initialBounds
      
      this.mymap.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: 50, maxZoom: 15, duration: 500 }
      )
    },

    updateLayers() {
      if (!this.deckOverlay) return
      
      this.deckOverlay.setProps({
        layers: this.layers,
      })
    },

    handleHover(info: any) {
      if (!info.object) return
      // Could emit tooltip event here
    },

    handleClick(info: any) {
      if (!info.object) {
        this.$emit('featureClick', null)
        return
      }
      
      console.log('Clicked feature:', info.object.properties)
      this.$emit('featureClick', info.object)
    },
  },
})
</script>

<style scoped lang="scss">
.aeq-map-component {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.map-container {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}
</style>

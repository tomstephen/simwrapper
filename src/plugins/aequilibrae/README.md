# AequilibraE Plugin

This plugin reads AequilibraE SQLite databases with Spatialite geometries and displays them both as tables and on a map.

## Features

- **Table View**: Browse database tables (nodes, links, zones) with schema information
- **Map View**: Visualize geometries from the database on an interactive map
- Automatic geometry extraction from Spatialite BLOB columns
- Support for Points (nodes/zones) and LineStrings (links)

## Usage

Create a YAML configuration file (e.g., `aeqviz-network.yaml`):

```yaml
title: "My AequilibraE Network"
description: "Network visualization from AequilibraE project"
database: project_database.sqlite
```

Or specify in a dashboard:

```yaml
- type: aequilibrae
  title: "Network Map"
  database: project_database.sqlite
```

## How it Works

1. **Database Loading**: Uses `spl.js` to load SQLite databases with Spatialite support
2. **Geometry Extraction**: Queries geometry columns using `AsGeoJSON()` or `ST_X()/ST_Y()`
3. **GeoJSON Conversion**: Converts Spatialite geometries to standard GeoJSON features
4. **Map Rendering**: Uses the existing GeojsonLayer component to render features

## Supported Tables

- `nodes` - Network nodes (Point geometries)
- `links` - Network links (LineString geometries)  
- `zones` - Analysis zones (Polygon/MultiPolygon geometries)

## Technical Details

### Geometry Extraction Methods

The plugin tries two approaches:

1. **Primary**: Use `AsGeoJSON(geometry)` to get GeoJSON directly from Spatialite
2. **Fallback**: Use `ST_X()` and `ST_Y()` to extract coordinates and build geometries manually

### Limitations

- Maximum 10,000 features per table (for performance)
- Geometries must be in WGS84 (EPSG:4326) or will be displayed as-is
- Requires valid Spatialite geometry BLOBs

## Future Enhancements

- [ ] Add styling controls for line colors and widths
- [ ] Add filtering by attribute values
- [ ] Add support for more geometry types
- [ ] Add data join capabilities
- [ ] Add legend configuration

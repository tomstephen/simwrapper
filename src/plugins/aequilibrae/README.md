# AequilibraE Plugin

This plugin provides visualization support for AequilibraE transportation models.

## Configuration

Create a YAML file to configure your visualization layers.

### Basic Example

```yaml
title: My Network Visualization
description: Traffic assignment results

layers:
  links:
    table: link_results
    geometry: geo
    style:
      lineWidth:
        column: volume
        range: [1, 10]
      lineColor:
        column: congestion_ratio
        scheme: YlOrRd

defaults:
  lineColor: "#4e79a7"
  lineWidth: 2
  fillColor: "#59a14f"
```

### Layer Style Options

#### Categorical Colors

Use for discrete categories (road type, zone classification, etc.):

```yaml
layers:
  roads:
    table: network
    geometry: geom
    style:
      lineColor:
        column: road_type
        scheme: Category10  # or Set2
      fillColor:
        column: land_use
        scheme: Set2
```

#### Quantitative Colors

Use for continuous numeric values:

```yaml
layers:
  zones:
    table: zone_data
    geometry: geometry
    style:
      fillColor:
        column: population
        scheme: Blues  # Sequential: YlGn, Blues, Reds, Greens, Oranges
      # Or specify custom color range:
      # fillColor:
      #   column: population
      #   colorRange: ["#ffffcc", "#006837"]
```

#### Line Width & Point Radius

Scale by numeric column:

```yaml
layers:
  links:
    table: results
    geometry: geo
    style:
      lineWidth:
        column: flow
        range: [1, 12]  # min/max pixel width
      pointRadius:
        column: demand
        range: [3, 20]  # min/max radius
```

#### 3D Extrusion (Fill Height)

```yaml
layers:
  buildings:
    table: zones
    geometry: polygon
    style:
      fillHeight:
        column: population_density
        range: [0, 500]  # height in meters
      fillColor:
        column: zone_type
        scheme: Set2
```

#### Filtering Features

Show/hide features based on attribute values:

```yaml
layers:
  roads:
    table: network
    geometry: geom
    style:
      filter:
        column: road_class
        include: ["motorway", "primary", "secondary"]
      # Or exclude certain values:
      # filter:
      #   column: road_class
      #   exclude: ["footway", "cycleway", "path"]
```

### Complete Example

```yaml
title: Traffic Assignment Results
description: Peak hour volumes and speeds

defaults:
  lineColor: "#cccccc"
  lineWidth: 1
  fillColor: "#e0e0e0"
  pointRadius: 4

layers:
  network:
    table: link_results
    geometry: geo
    style:
      lineWidth:
        column: ab_flow
        range: [1, 15]
      lineColor:
        column: v_over_c
        scheme: YlOrRd
      filter:
        column: link_type
        exclude: ["connector", "centroid"]

  zones:
    table: zone_results
    geometry: boundary
    style:
      fillColor:
        column: total_production
        scheme: Blues
      fillHeight:
        column: total_production
        range: [0, 1000]

  centroids:
    table: centroids
    geometry: point
    style:
      pointRadius:
        column: trips_generated
        range: [5, 25]
      fillColor:
        column: zone_type
        scheme: Category10
```

### Available Color Schemes

| Scheme | Type | Description |
|--------|------|-------------|
| `Category10` | Categorical | 10 distinct colors |
| `Set2` | Categorical | 8 pastel colors |
| `YlGn` | Sequential | Yellow to Green |
| `Blues` | Sequential | Light to Dark Blue |
| `Reds` | Sequential | Light to Dark Red |
| `Greens` | Sequential | Light to Dark Green |
| `Oranges` | Sequential | Light to Dark Orange |

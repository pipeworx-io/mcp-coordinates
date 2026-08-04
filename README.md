# mcp-coordinates

Coordinate geometry MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `midpoint` | Geographic (great-circle) midpoint between two lat/lon points. |
| `centroid` | Average (spherical) center of a list of lat/lon points. `points` is an array of {lat, lon}. |
| `bounding_box` | Bounding box (SW/NE corners) around a center point at a given radius. `unit` = km (default) or mi. |
| `point_in_bbox` | Test whether a lat/lon point is inside a bounding box "minLat,minLon,maxLat,maxLon". |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "coordinates": {
      "url": "https://gateway.pipeworx.io/coordinates/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Coordinates data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

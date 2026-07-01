interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Coordinate geometry MCP.
 *
 * Keyless, offline: geographic midpoint between two points, centroid of many
 * points, a bounding box around a center (given a radius), and a point-in-box
 * test. Complements `geodistance` (haversine/bearing) and `geohash`. Pure math
 * — no API, no key.
 */


const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

const tools: McpToolExport['tools'] = [
  {
    name: 'midpoint',
    description: 'Geographic (great-circle) midpoint between two lat/lon points.',
    inputSchema: { type: 'object', properties: { lat1: { type: 'number' }, lon1: { type: 'number' }, lat2: { type: 'number' }, lon2: { type: 'number' } }, required: ['lat1', 'lon1', 'lat2', 'lon2'] },
  },
  {
    name: 'centroid',
    description: 'Average (spherical) center of a list of lat/lon points. `points` is an array of {lat, lon}.',
    inputSchema: { type: 'object', properties: { points: { type: 'array', description: 'Array of {lat, lon} objects.' } }, required: ['points'] },
  },
  {
    name: 'bounding_box',
    description: 'Bounding box (SW/NE corners) around a center point at a given radius. `unit` = km (default) or mi.',
    inputSchema: { type: 'object', properties: { lat: { type: 'number' }, lon: { type: 'number' }, radius: { type: 'number', description: 'Radius from the center.' }, unit: { type: 'string', description: 'km (default) or mi.' } }, required: ['lat', 'lon', 'radius'] },
  },
  {
    name: 'point_in_bbox',
    description: 'Test whether a lat/lon point is inside a bounding box "minLat,minLon,maxLat,maxLon".',
    inputSchema: { type: 'object', properties: { lat: { type: 'number' }, lon: { type: 'number' }, bbox: { type: 'string', description: 'e.g. "20,-130,55,-60".' } }, required: ['lat', 'lon', 'bbox'] },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'midpoint': {
      const la1 = toRad(num(args, 'lat1')), lo1 = toRad(num(args, 'lon1')), la2 = toRad(num(args, 'lat2')), lo2 = toRad(num(args, 'lon2'));
      const bx = Math.cos(la2) * Math.cos(lo2 - lo1), by = Math.cos(la2) * Math.sin(lo2 - lo1);
      const la3 = Math.atan2(Math.sin(la1) + Math.sin(la2), Math.sqrt((Math.cos(la1) + bx) ** 2 + by ** 2));
      const lo3 = lo1 + Math.atan2(by, Math.cos(la1) + bx);
      return { lat: +toDeg(la3).toFixed(6), lon: +(((toDeg(lo3) + 540) % 360) - 180).toFixed(6) };
    }
    case 'centroid': {
      const pts = args.points;
      if (!Array.isArray(pts) || pts.length === 0) throw new Error('Required argument "points" must be a non-empty array of {lat, lon}.');
      let x = 0, y = 0, z = 0;
      for (const p of pts) {
        const la = toRad(Number((p as any).lat)), lo = toRad(Number((p as any).lon));
        if (!Number.isFinite(la) || !Number.isFinite(lo)) throw new Error('Each point needs numeric lat and lon.');
        x += Math.cos(la) * Math.cos(lo); y += Math.cos(la) * Math.sin(lo); z += Math.sin(la);
      }
      x /= pts.length; y /= pts.length; z /= pts.length;
      return { count: pts.length, lat: +toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))).toFixed(6), lon: +toDeg(Math.atan2(y, x)).toFixed(6) };
    }
    case 'bounding_box': {
      const lat = num(args, 'lat'), lon = num(args, 'lon'), radius = num(args, 'radius');
      const km = (typeof args.unit === 'string' && args.unit.toLowerCase() === 'mi') ? radius * 1.609344 : radius;
      const dLat = km / 111.32;
      const dLon = km / (111.32 * Math.cos(toRad(lat)) || 1e-9);
      return { center: { lat, lon }, radius_km: +km.toFixed(3), sw: { lat: +(lat - dLat).toFixed(6), lon: +(lon - dLon).toFixed(6) }, ne: { lat: +(lat + dLat).toFixed(6), lon: +(lon + dLon).toFixed(6) }, bbox: `${(lat - dLat).toFixed(6)},${(lon - dLon).toFixed(6)},${(lat + dLat).toFixed(6)},${(lon + dLon).toFixed(6)}` };
    }
    case 'point_in_bbox': {
      const lat = num(args, 'lat'), lon = num(args, 'lon');
      const parts = reqStr(args, 'bbox', '"20,-130,55,-60"').split(',').map(Number);
      if (parts.length !== 4 || parts.some((p) => !Number.isFinite(p))) return { error: 'bbox must be "minLat,minLon,maxLat,maxLon".' };
      const [minLat, minLon, maxLat, maxLon] = parts;
      return { lat, lon, inside: lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function num(args: Record<string, unknown>, key: string): number {
  const v = args[key]; const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isFinite(n)) throw new Error(`Required numeric argument "${key}" is missing or invalid.`);
  return n;
}
function reqStr(args: Record<string, unknown>, key: string, ex: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing. Pass a string like ${ex}.`);
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;

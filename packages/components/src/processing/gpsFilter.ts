import type { AnyVisComponentDefinition, ComponentOutput } from '@vistrates/types';
import { buildGpsFilterSQL, describeTable, exec } from '@vistrates/data';
import { asNumber, asString, readDataObject } from '../dataAccess.js';

interface GpsFilterData {
  readonly viewName: string;
  readonly latColumn: string;
  readonly lonColumn: string;
  readonly minLat: number;
  readonly maxLat: number;
  readonly minLon: number;
  readonly maxLon: number;
}

/** Filter a table by a GPS bounding box. */
export const gpsFilterComponent: AnyVisComponentDefinition = {
  id: 'gps-filter',
  name: 'GPS Bounding-Box Filter',
  version: '0.1.0',
  description: 'Filter rows whose lat/lon fall inside a bounding box.',
  tags: ['processing', 'gps'],
  src: { in: 'table' },
  props: [],
  defaultData: {
    viewName: 'gpsfilter_out',
    latColumn: 'lat',
    lonColumn: 'lon',
    minLat: -90,
    maxLat: 90,
    minLon: -180,
    maxLon: 180,
  },
  async update(_source) {
    const inSrc = (this.src as Readonly<Record<string, ComponentOutput | null>>)['in'];
    if (!inSrc || inSrc.kind !== 'table') return;
    const data = readDataObject<GpsFilterData>(this);
    const viewName = asString(data.viewName) ?? 'gpsfilter_out';
    const latColumn = asString(data.latColumn) ?? 'lat';
    const lonColumn = asString(data.lonColumn) ?? 'lon';
    const minLat = asNumber(data.minLat) ?? -90;
    const maxLat = asNumber(data.maxLat) ?? 90;
    const minLon = asNumber(data.minLon) ?? -180;
    const maxLon = asNumber(data.maxLon) ?? 180;
    await exec(
      buildGpsFilterSQL({
        fromTable: inSrc.tableName,
        toTable: viewName,
        latColumn,
        lonColumn,
        minLat,
        maxLat,
        minLon,
        maxLon,
      }),
    );
    const schema = await describeTable(viewName);
    this.output = { kind: 'table', tableName: viewName, schema };
  },
};

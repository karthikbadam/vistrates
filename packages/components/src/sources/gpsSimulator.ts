import type { AnyVisComponentDefinition, AnyVisController } from '@vistrates/types';
import { describeTable, startGpsSimulator, type GpsSimulatorHandle } from '@vistrates/data';
import { asNumber, asString, readDataObject } from '../dataAccess.js';

interface GpsSimulatorData {
  readonly tableName: string;
  readonly intervalMs?: number;
  readonly agents?: number;
}

const handleByController = new WeakMap<AnyVisController, GpsSimulatorHandle>();

/**
 * Stream synthetic GPS rows into a DuckDB table on a tick. Outputs the
 * table as soon as it exists; downstream components see fresh rows on
 * each tick.
 */
export const gpsSimulatorComponent: AnyVisComponentDefinition = {
  id: 'gps-simulator',
  name: 'GPS Simulator',
  version: '0.1.0',
  description: 'Generate live GPS rows into a DuckDB table on a tick.',
  tags: ['source', 'gps', 'live'],
  src: {},
  props: [],
  defaultData: { tableName: 'gps_stream', intervalMs: 200, agents: 3 },
  async init() {
    const data = readDataObject<GpsSimulatorData>(this);
    const tableName = asString(data.tableName) ?? 'gps_stream';
    const intervalMs = asNumber(data.intervalMs) ?? 200;
    const agents = asNumber(data.agents) ?? 3;

    const handle = await startGpsSimulator({ tableName, intervalMs, agents });
    handleByController.set(this, handle);

    const schema = await describeTable(tableName);
    this.output = { kind: 'table', tableName, schema };
  },
  destroy() {
    const handle = handleByController.get(this);
    handle?.stop();
    handleByController.delete(this);
  },
};

import React, { useState, useEffect } from 'react';
import {
  Box,
  Upload,
  FileCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  Table as TableIcon,
} from 'lucide-react';
import { ThreeCanvas } from '../components/ThreeCanvas';
import { api } from '../services/api';
import { StlGeometryData, TemperatureCsvData, TemperatureNodeData } from '../types/workbench';

interface GeometryPageProps {
  onComputationStart: (msg: string) => void;
  onComputationEnd: (msg: string, isError?: boolean) => void;
}

export const GeometryPage: React.FC<GeometryPageProps> = ({
  onComputationStart,
  onComputationEnd,
}) => {
  const [activeSubMode, setActiveSubMode] = useState<'stl' | 'pointcloud'>('stl');
  const [stlData, setStlData] = useState<StlGeometryData | null>(null);
  const [csvData, setCsvData] = useState<TemperatureCsvData | null>(null);
  const [selectedNode, setSelectedNode] = useState<TemperatureNodeData | null>(null);
  const [rawInputText, setRawInputText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('sample_bracket.stl');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load default sample STL on initial mount
  useEffect(() => {
    loadSampleStlFile();
  }, []);

  const loadSampleStlFile = async () => {
    try {
      onComputationStart('Loading sample bracket ASCII STL from C++ core...');
      setErrorMsg(null);
      const res = await api.loadSampleStl();
      setFileName(res.filename);
      setRawInputText(res.content);
      const parsed = await api.parseStlContent(res.content);
      setStlData(parsed);
      setActiveSubMode('stl');
      onComputationEnd(`Successfully parsed ${parsed.triangle_count} triangles from C++ STL parser.`);
    } catch (err: any) {
      setErrorMsg(err.message);
      onComputationEnd(err.message, true);
    }
  };

  const loadSampleCsvFile = async () => {
    try {
      onComputationStart('Loading sample temperature CSV dataset from C++ core...');
      setErrorMsg(null);
      const res = await api.loadSampleCsv();
      setFileName(res.filename);
      setRawInputText(res.content);
      const parsed = await api.parseTemperatureCsv(res.content);
      setCsvData(parsed);
      setActiveSubMode('pointcloud');
      onComputationEnd(`Parsed ${parsed.stats.node_count} thermal nodes. Range: ${parsed.stats.min_temp_C}°C to ${parsed.stats.max_temp_C}°C.`);
    } catch (err: any) {
      setErrorMsg(err.message);
      onComputationEnd(err.message, true);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setRawInputText(content);
      processFileContent(file.name, content);
    };
    reader.readAsText(file);
  };

  const processFileContent = async (name: string, content: string) => {
    setErrorMsg(null);
    onComputationStart(`Parsing ${name} via C++17 parser...`);

    try {
      if (name.toLowerCase().endsWith('.stl') || content.trim().startsWith('solid')) {
        const parsed = await api.parseStlContent(content);
        setStlData(parsed);
        setActiveSubMode('stl');
        onComputationEnd(`Successfully parsed ${parsed.triangle_count} triangles via C++ STL parser.`);
      } else if (name.toLowerCase().endsWith('.csv') || content.includes('node_id')) {
        const parsed = await api.parseTemperatureCsv(content);
        setCsvData(parsed);
        setActiveSubMode('pointcloud');
        onComputationEnd(`Parsed ${parsed.stats.node_count} nodes via C++ Temperature CSV parser.`);
      } else {
        throw new Error('Unrecognized file type. Please upload an ASCII .stl or .csv file.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      onComputationEnd(err.message, true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0f172a] p-4 rounded-lg border border-slate-700">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono mb-1">
            <Box className="w-3.5 h-3.5" />
            <span>TASK B • 3D GEOMETRY & THERMAL POINT CLOUD</span>
          </div>
          <h2 className="text-lg font-bold text-white">Interactive 3D Geometry Viewer</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Parses and strictly validates ASCII STL triangulated meshes and 5-column temperature nodal distributions in C++.
          </p>
        </div>

        {/* Mode Selector and Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md bg-slate-900 p-1 border border-slate-700 text-xs font-mono">
            <button
              onClick={() => setActiveSubMode('stl')}
              className={`px-3 py-1 rounded transition ${
                activeSubMode === 'stl'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ASCII STL Mesh
            </button>
            <button
              onClick={() => setActiveSubMode('pointcloud')}
              className={`px-3 py-1 rounded transition ${
                activeSubMode === 'pointcloud'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Temperature Point Cloud
            </button>
          </div>

          <button
            onClick={loadSampleStlFile}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-mono flex items-center gap-1.5 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Sample STL
          </button>

          <button
            onClick={loadSampleCsvFile}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-mono flex items-center gap-1.5 transition"
          >
            <TableIcon className="w-3.5 h-3.5 text-emerald-400" />
            Sample CSV
          </button>

          <label className="px-3 py-1.5 rounded bg-cyan-700 hover:bg-cyan-600 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer transition">
            <Upload className="w-3.5 h-3.5" />
            Upload File
            <input
              type="file"
              accept=".stl,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Error Banner if validation fails */}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs font-mono flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">C++ VALIDATION ERROR: </span>
            {errorMsg}
          </div>
        </div>
      )}

      {/* Main Grid: 3D Canvas on Left, Details & Inspection on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Three.js Viewport */}
        <div className="lg:col-span-2 h-[520px]">
          <ThreeCanvas
            mode={activeSubMode}
            stlData={stlData}
            csvData={csvData}
            onSelectNode={(n) => setSelectedNode(n)}
          />
        </div>

        {/* Right 1 Col: Metadata, Bounding Box, & Node Inspector */}
        <div className="space-y-4">
          {/* Active File Metadata Card */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 text-xs font-mono space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">ACTIVE DATASET:</span>
              <span className="text-cyan-400 font-bold truncate max-w-[160px]">{fileName}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">PARSER ENGINE:</span>
              <span className="text-emerald-400 font-semibold">C++17 StlParser</span>
            </div>

            {activeSubMode === 'stl' && stlData && (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">SOLID NAME:</span>
                  <span className="text-white font-semibold">{stlData.solid_name || 'unnamed'}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">TRIANGLE COUNT:</span>
                  <span className="text-cyan-400 font-bold">{stlData.triangle_count.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">SURFACE AREA:</span>
                  <span className="text-white font-semibold">
                    {stlData.surface_area.toFixed(4)} m²
                  </span>
                </div>
              </>
            )}

            {activeSubMode === 'pointcloud' && csvData && (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">TOTAL NODES:</span>
                  <span className="text-cyan-400 font-bold">{csvData.stats.node_count} nodes</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">TEMPERATURE MIN:</span>
                  <span className="text-blue-400 font-bold">{csvData.stats.min_temp_C.toFixed(2)} °C</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">TEMPERATURE MAX:</span>
                  <span className="text-rose-400 font-bold">{csvData.stats.max_temp_C.toFixed(2)} °C</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">TEMPERATURE MEAN:</span>
                  <span className="text-amber-400 font-bold">{csvData.stats.mean_temp_C.toFixed(2)} °C</span>
                </div>
              </>
            )}
          </div>

          {/* Bounding Box Information */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 text-xs font-mono space-y-2">
            <h4 className="text-slate-300 font-bold uppercase tracking-wider pb-1 border-b border-slate-800 flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-cyan-400" />
              Calculated Bounding Box
            </h4>

            {((activeSubMode === 'stl' && stlData?.bbox) ||
              (activeSubMode === 'pointcloud' && csvData?.stats?.bbox)) ? (
              <div className="space-y-2 text-[11px] pt-1">
                {(() => {
                  const bbox =
                    activeSubMode === 'stl' ? stlData!.bbox : csvData!.stats.bbox;
                  return (
                    <>
                      <div className="flex justify-between text-slate-400">
                        <span>Min (X, Y, Z):</span>
                        <span className="text-slate-200">
                          [{bbox.min.x.toFixed(3)}, {bbox.min.y.toFixed(3)}, {bbox.min.z.toFixed(3)}] m
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Max (X, Y, Z):</span>
                        <span className="text-slate-200">
                          [{bbox.max.x.toFixed(3)}, {bbox.max.y.toFixed(3)}, {bbox.max.z.toFixed(3)}] m
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Span (ΔX, ΔY, ΔZ):</span>
                        <span className="text-cyan-400 font-semibold">
                          [{bbox.dimensions.x.toFixed(3)}, {bbox.dimensions.y.toFixed(3)}, {bbox.dimensions.z.toFixed(3)}] m
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="text-slate-500 italic py-2">No bounding box calculated</p>
            )}
          </div>

          {/* Node Inspector (Click/Hover in Point Cloud mode) */}
          {activeSubMode === 'pointcloud' && (
            <div className="bg-[#0f172a] border border-cyan-800/60 rounded-lg p-4 text-xs font-mono space-y-2">
              <h4 className="text-cyan-300 font-bold uppercase tracking-wider pb-1 border-b border-slate-800">
                Point Cloud Inspector
              </h4>
              {selectedNode ? (
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Selected Node ID:</span>
                    <span className="text-white font-bold">#{selectedNode.node_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coordinate X:</span>
                    <span className="text-slate-200">{selectedNode.x_m.toFixed(4)} m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coordinate Y:</span>
                    <span className="text-slate-200">{selectedNode.y_m.toFixed(4)} m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coordinate Z:</span>
                    <span className="text-slate-200">{selectedNode.z_m.toFixed(4)} m</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-800">
                    <span className="text-slate-400 font-semibold">Nodal Temperature:</span>
                    <span className="text-amber-300 font-bold text-sm">
                      {selectedNode.temperature_C.toFixed(2)} °C
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 italic text-[11px] py-1">
                  Hover or click on any 3D node in the viewport to inspect its spatial coordinates and temperature.
                </p>
              )}
            </div>
          )}

          {/* Data Provenance & Units Note */}
          <div className="p-3 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400 leading-relaxed font-sans">
            <span className="font-bold text-slate-300 block mb-0.5">Dataset Provenance & Standards:</span>
            • <strong>sample_bracket.stl</strong>: Synthesized solid CAD bracket adhering to standard ASCII STL format with facet normals and outer loops.
            <br />
            • <strong>sample_temperature_field.csv</strong>: Synthetic 45-node thermal field generated from finite-element heat conduction across a 3D prism. Units: meters [m] and degrees Celsius [°C].
          </div>
        </div>
      </div>
    </div>
  );
};

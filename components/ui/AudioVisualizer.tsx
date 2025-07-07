import React from "react"

export const AudioVisualizer = () => {
    return (
        <div id="webcrumbs">
            <div className="w-[800px] p-8 bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">Audio Visualizer</h2>
                    <p className="text-gray-400">Real-time audio frequency visualization</p>
                </div>

                <div className="bg-gray-800 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                            <button className="w-12 h-12 bg-primary-500 hover:bg-primary-600 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110">
                                <span className="material-symbols-outlined text-white">play_arrow</span>
                            </button>
                            <button className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110">
                                <span className="material-symbols-outlined text-white">pause</span>
                            </button>
                            <button className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110">
                                <span className="material-symbols-outlined text-white">stop</span>
                            </button>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="material-symbols-outlined text-gray-400">volume_up</span>
                            <div className="w-24 h-2 bg-gray-700 rounded-full">
                                <div className="w-16 h-2 bg-primary-500 rounded-full"></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-black rounded-lg p-4 mb-4 h-64 relative overflow-hidden">
                        <div className="flex items-center justify-center h-full">
                            <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                                <path
                                    d="M0,100 C20,80 40,120 60,90 C80,60 100,140 120,100 C140,60 160,130 180,100 C200,70 220,110 240,90 C260,70 280,120 300,100 C320,80 340,130 360,110 C380,90 400,120 420,90 C440,60 460,130 480,100 C500,70 520,120 540,90 C560,60 580,130 600,110 C620,90 640,110 660,90 C680,70 700,120 720,100 C740,80 760,110 780,100 L800,100"
                                    fill="none"
                                    stroke="rgb(167, 139, 250)"
                                    strokeWidth="3"
                                    className="animate-pulse"
                                />
                                <path
                                    d="M0,100 C20,90 40,110 60,80 C80,50 100,150 120,100 C140,50 160,140 180,90 C200,60 220,120 240,80 C260,60 280,130 300,90 C320,70 340,140 360,100 C380,80 400,130 420,80 C440,50 460,140 480,90 C500,60 520,130 540,80 C560,50 580,140 600,100 C620,80 640,120 660,80 C680,60 700,130 720,90 C740,70 760,120 780,90 L800,100"
                                    fill="none"
                                    stroke="rgb(139, 92, 246)"
                                    strokeWidth="2"
                                    strokeDasharray="5,5"
                                    className="animate-[pulse_1.5s_ease-in-out_infinite]"
                                />
                            </svg>
                        </div>

                        <div className="absolute top-4 left-4 text-primary-400 text-sm font-mono">FREQ: 440 Hz</div>
                        <div className="absolute top-4 right-4 text-primary-400 text-sm font-mono">AMP: 75 dB</div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                        <span>0:00</span>
                        <div className="flex-1 mx-4 h-1 bg-gray-700 rounded-full">
                            <div className="w-1/3 h-1 bg-primary-500 rounded-full"></div>
                        </div>
                        <span>3:24</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-800 rounded-lg p-4">
                        <h3 className="text-white font-semibold mb-3">Frequency Bands</h3>
                        <div className="space-y-2">
                            {["Bass", "Mid", "Treble"].map((band, i) => (
                                <div key={band} className="flex items-center justify-between">
                                    <span className="text-gray-400 text-sm">{band}</span>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-16 h-2 bg-gray-700 rounded-full">
                                            <div
                                                className="h-2 bg-primary-500 rounded-full transition-all duration-300"
                                                style={{width: `${60 + i * 15}%`}}
                                            ></div>
                                        </div>
                                        <span className="text-primary-400 text-xs font-mono w-8">{60 + i * 15}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4">
                        <h3 className="text-white font-semibold mb-3">Audio Info</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-400 text-sm">Sample Rate</span>
                                <span className="text-white text-sm font-mono">44.1 kHz</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400 text-sm">Bit Depth</span>
                                <span className="text-white text-sm font-mono">16 bit</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400 text-sm">Channels</span>
                                <span className="text-white text-sm font-mono">Stereo</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <button className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors duration-300">
                            <span className="material-symbols-outlined text-sm mr-2">mic</span>
                            Live Input
                        </button>
                        <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-300">
                            <span className="material-symbols-outlined text-sm mr-2">upload_file</span>
                            Upload
                        </button>
                    </div>

                    <div className="flex items-center space-x-2">
                        <span className="text-gray-400 text-sm">Visualization:</span>
                        <details className="relative">
                            <div className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded cursor-pointer transition-colors duration-300">
                                Wave
                            </div>

                            <div className="absolute right-0 top-full mt-1 bg-gray-700 rounded-lg shadow-lg z-10 min-w-24">
                                <div className="p-1">
                                    <div className="px-3 py-1 text-white text-sm hover:bg-gray-600 rounded cursor-pointer">
                                        Wave
                                    </div>

                                    <div className="px-3 py-1 text-white text-sm hover:bg-gray-600 rounded cursor-pointer">
                                        Wave
                                    </div>
                                    <div className="px-3 py-1 text-white text-sm hover:bg-gray-600 rounded cursor-pointer">
                                        Circle
                                    </div>
                                </div>
                            </div>
                        </details>

                        <div className="mt-4">
                            <div className="flex space-x-2 text-gray-400 text-xs">
                                <span className="flex items-center">
                                    <span className="inline-block w-2 h-2 bg-primary-400 rounded-full mr-1"></span>{" "}
                                    Current
                                </span>
                                <span className="flex items-center">
                                    <span className="inline-block w-2 h-2 bg-primary-600 rounded-full mr-1"></span> Peak
                                </span>
                            </div>
                            {/* Next: "Add waveform customization options (frequency range, smoothing)" */}
                        </div>
                    </div>
                </div>

                {/* Next: "Add waveform display mode with smooth animations" */}
                {/* Next: "Add real-time audio input capture functionality" */}
                {/* Next: "Add customizable color themes for visualizer" */}
            </div>
        </div>
    )
}

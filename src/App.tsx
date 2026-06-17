import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Layers, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Maximize2, 
  Image as ImageIcon, 
  BookOpen, 
  Palette, 
  Fingerprint, 
  Info,
  ExternalLink,
  ChevronRight,
  Eye,
  FileText
} from "lucide-react";
import { BrandPlan, MediumExecution, BrandSuggestionPreset } from "./types";

// Design presets for fast brand ideation
const BRAND_PRESETS: BrandSuggestionPreset[] = [
  {
    title: "EcoSmart Smart-Flask",
    description: "A cylinder-shaped vacuum smart thermos with a brushed sand-beige finish, minimalist wave emblem, and subtle organic wood cap.",
    brandName: "AURA BOTTLE",
    colors: ["#E6DFD3", "#8C9B8C", "#4A524A"],
    styleCue: "Nordic Japandi style, organic textures, functional wood matte finishes"
  },
  {
    title: "Zero-Waste Shampoo Bar",
    description: "A pebble-shaped cold-pressed shampoo block made of oatmeal and organic clays, with a stamped circular emblem in raw clay texture.",
    brandName: "TERRA CLEANSE",
    colors: ["#DFD5C6", "#D7BCA3", "#827161"],
    styleCue: "Raw organic brutalist wash design, earthy clay textures, high tactile focus"
  },
  {
    title: "Bamboo Active Headphones",
    description: "Sleek over-ear wireless headphones made from micro-grooved light bamboo veneer with soft grey recycled felt padded earcups.",
    brandName: "CANOPY ACOUSTICS",
    colors: ["#EBF1EB", "#A3BCA3", "#3C443C"],
    styleCue: "Minimalist modern eco-acoustic gear, raw plant fibers, soft organic contours"
  },
  {
    title: "Modular Slate Keyboard",
    description: "An ultra-thin metal hardware mechanical keyboard with anodized matte slate-grey shell and translucent dark-emerald keycaps.",
    brandName: "CHRONOS KEYBOARD",
    colors: ["#3D434A", "#1C4E43", "#F2F3F5"],
    styleCue: "Sleek tactical hardware, high metallic focus, industrial geometry"
  }
];

const POPULAR_COLORS = [
  { name: "Sage Green", value: "#8C9B8C", text: "text-emerald-700 bg-emerald-50" },
  { name: "Warm Sand", value: "#D8C3A5", text: "text-amber-700 bg-amber-50" },
  { name: "Slate Obsidian", value: "#3E4444", text: "text-slate-700 bg-slate-100" },
  { name: "Ocean Teal", value: "#4682B4", text: "text-sky-700 bg-sky-50" },
  { name: "Clay Terracotta", value: "#E07A5F", text: "text-orange-700 bg-orange-50" },
  { name: "Pure Minimalist", value: "#FFFFFF", text: "text-zinc-700 bg-white border border-zinc-200" }
];

export default function App() {
  // Input form state
  const [productDescription, setProductDescription] = useState("");
  const [brandName, setBrandName] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [extraStyle, setExtraStyle] = useState("");
  
  // App state workflow
  const [isBlueprinting, setIsBlueprinting] = useState(false);
  const [blueprintError, setBlueprintError] = useState<string | null>(null);
  const [brandPlan, setBrandPlan] = useState<BrandPlan | null>(null);

  // Individual advertising medium executions states
  const [mediumExecutions, setMediumExecutions] = useState<Record<string, MediumExecution>>({
    billboard: { loading: false },
    newspaper: { loading: false },
    social: { loading: false }
  });

  // Modal review state
  const [activeFullImage, setActiveFullImage] = useState<{ url: string; title: string; prompt: string } | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);

  // Apply a preset directly to inputs
  const applyPreset = (preset: BrandSuggestionPreset) => {
    setProductDescription(preset.description);
    setBrandName(preset.brandName);
    setSelectedColors(preset.colors);
    setExtraStyle(preset.styleCue);
  };

  // Toggle color capsule
  const toggleColor = (colorVal: string) => {
    if (selectedColors.includes(colorVal)) {
      setSelectedColors(selectedColors.filter(c => c !== colorVal));
    } else {
      setSelectedColors([...selectedColors, colorVal]);
    }
  };

  // Step 1: Request Gemini 3.5 Flash blueprint & creative prompts
  const generateBlueprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productDescription.trim()) return;

    setIsBlueprinting(true);
    setBlueprintError(null);
    setBrandPlan(null);

    try {
      const res = await fetch("/api/brand/generate-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productDescription,
          brandName,
          primaryColors: selectedColors,
          extraInstructions: extraStyle
        })
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Failed to generate brand setup.");
      }

      const plan: BrandPlan = await res.json();
      setBrandPlan(plan);

      // Initialize execution configurations with suggestions from Gemini
      setMediumExecutions({
        billboard: { 
          loading: false, 
          customPrompt: plan.mediums.billboard.imagePrompt 
        },
        newspaper: { 
          loading: false, 
          customPrompt: plan.mediums.newspaper.imagePrompt 
        },
        social: { 
          loading: false, 
          customPrompt: plan.mediums.social.imagePrompt 
        }
      });
    } catch (err: any) {
      console.error(err);
      setBlueprintError(err.message || "An unexpected error occurred during brand strategy generation.");
    } finally {
      setIsBlueprinting(false);
    }
  };

  // Step 2: Request image generation using the Nano-Banana model
  const executeImageGeneration = async (mediumKey: "billboard" | "newspaper" | "social") => {
    const execution = mediumExecutions[mediumKey];
    const promptToSend = execution.customPrompt || brandPlan?.mediums[mediumKey].imagePrompt;

    if (!promptToSend) return;

    // Set loading
    setMediumExecutions(prev => ({
      ...prev,
      [mediumKey]: { ...prev[mediumKey], loading: true, error: undefined }
    }));

    try {
      const res = await fetch("/api/brand/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToSend,
          medium: mediumKey
        })
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Image generation failed.");
      }

      const data = await res.json();
      
      setMediumExecutions(prev => ({
        ...prev,
        [mediumKey]: { ...prev[mediumKey], loading: false, imageUrl: data.imageUrl }
      }));
    } catch (err: any) {
      console.error(err);
      setMediumExecutions(prev => ({
        ...prev,
        [mediumKey]: { ...prev[mediumKey], loading: false, error: err.message || "Failed to connect to image model." }
      }));
    }
  };

  // Execute all shots sequentially
  const imagineAllMediums = async () => {
    if (!brandPlan) return;
    await executeImageGeneration("billboard");
    await executeImageGeneration("newspaper");
    await executeImageGeneration("social");
  };

  // Reset work and go back to blueprint builder page
  const resetWorkspace = () => {
    setBrandPlan(null);
    setProductDescription("");
    setBrandName("");
    setSelectedColors([]);
    setExtraStyle("");
    setMediumExecutions({
      billboard: { loading: false },
      newspaper: { loading: false },
      social: { loading: false }
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#C4FF00] selection:text-black">
      {/* Visual Header */}
      <header className="border-b border-[#333] bg-[#0A0A0A]/80 px-6 py-4 sticky top-0 backdrop-blur-md z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-[#111] border border-[#333] flex items-center justify-center text-white" id="appLogo">
              <div className="w-3 h-3 rounded-full bg-[#C4FF00] animate-pulse"></div>
            </div>
            <div>
              <span className="font-display font-black tracking-tight text-lg italic uppercase block underline decoration-[#C4FF00] decoration-2">BRAND BUILDER</span>
              <span className="text-[10px] text-[#C4FF00] block font-mono tracking-widest uppercase font-bold">Ad-Visualization Lab</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 bg-[#C4FF00]/10 border border-[#C4FF00]/30 px-3 py-1.5 rounded-full text-[10px] text-[#C4FF00] font-mono uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C4FF00] animate-ping"></span>
              <span className="font-bold">Nano-Banana Engine Active</span>
            </div>
            {brandPlan && (
              <button 
                onClick={resetWorkspace}
                className="text-xs font-bold px-3.5 py-1.5 rounded-lg border border-[#333] bg-[#111] hover:border-[#C4FF00] hover:text-[#C4FF00] transition-colors uppercase tracking-widest font-mono text-zinc-300"
                id="resetBtn"
              >
                New Concept
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {!brandPlan ? (
            // Form & Setup Panel
            <motion.div
              key="designer-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Introduction Sidebar */}
              <div className="lg:col-span-4 space-y-6">
                <div>
                  <h1 className="font-display font-light text-4xl leading-tight tracking-tight text-white">
                    Imagine your product across the <span className="text-[#C4FF00] font-black italic">commercial landscape.</span>
                  </h1>
                  <p className="mt-4 text-zinc-400 text-sm leading-relaxed">
                    Instantly layout and test your physical product concept in multiple environments. Our engine builds a strict product design descriptor, then uses the <strong className="text-white hover:text-[#C4FF00] transition-colors">Nano-Banana model</strong> to run consistent advertising shoots across media assets.
                  </p>
                </div>

                <div className="bg-[#111] border border-[#333] rounded-xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center space-x-2 text-[#C4FF00] font-semibold text-xs font-mono uppercase tracking-wider">
                    <div className="w-2 h-2 rounded-full bg-[#C4FF00] animate-pulse" />
                    <span>Creative Directives</span>
                  </div>
                  <ul className="space-y-3.5 text-xs text-zinc-400 leading-relaxed">
                    <li className="flex items-start space-x-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C4FF00] mt-1.5 shrink-0" />
                      <span><strong className="text-zinc-200">Product Consistency:</strong> Generates cohesive geometries and finishes, copy-pasting structured physical parameters to keep the product identical.</span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C4FF00] mt-1.5 shrink-0" />
                      <span><strong className="text-zinc-200">Zero Humans Rule:</strong> Filter protocols are locked to guarantee absolutely no people, hands, faces, or silhouettes appear.</span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C4FF00] mt-1.5 shrink-0" />
                      <span><strong className="text-zinc-200">Multiverse Mockups:</strong> Visualize on huge public city Billboards, raster-ink Newspaper layouts, and modern Social feeds.</span>
                    </li>
                  </ul>
                </div>

                {/* Directives Notification regarding Paid model settings */}
                <div className="bg-[#111] border border-[#333] rounded-xl p-4 flex items-start space-x-3 text-xs text-zinc-300">
                  <Info className="w-4 h-4 text-[#C4FF00] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5 text-white">Model Verification Notice</span>
                    <span>This application implements the <code className="bg-[#1c1c1c] text-[#C4FF00] px-1 py-0.5 rounded text-[11px] font-mono font-bold">gemini-2.5-flash-image</code> model (the Nano-Banana renderer). Users with custom billing may activate higher-tier configs in the AI Studio settings.</span>
                  </div>
                </div>
              </div>

              {/* Central Studio form */}
              <div className="lg:col-span-8 bg-[#0A0A0A] border border-[#333] rounded-2xl shadow-sm p-6 sm:p-8 space-y-8">
                {/* Visual Preset Selection */}
                <div>
                  <span className="text-[11px] uppercase font-mono tracking-widest text-[#666] block mb-3 font-bold">
                    Step 1: Choose a concept starter or describe your own
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="presetsGrid">
                    {BRAND_PRESETS.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="p-4 rounded-xl border border-[#333] bg-[#111] text-left hover:border-[#C4FF00] hover:bg-[#151515] transition-all group relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-display font-bold text-white group-hover:text-[#C4FF00] text-sm transition-colors">
                            {p.title}
                          </span>
                          <span className="text-[9px] bg-[#222] text-[#C4FF00] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider group-hover:bg-[#C4FF00] group-hover:text-black transition-colors">
                            Preset
                          </span>
                        </div>
                        <p className="text-zinc-400 text-xs line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                        <div className="mt-3 flex items-center space-x-1">
                          {p.colors.map((c, ci) => (
                            <span 
                              key={ci} 
                              className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs" 
                              style={{ backgroundColor: c }}
                            />
                          ))}
                          <span className="text-[10px] font-mono text-zinc-500 ml-2 italic group-hover:text-white transition-colors">
                            Apply settings &rarr;
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={generateBlueprint} className="space-y-6">
                  {/* Detailed Description */}
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase font-mono tracking-widest text-[#666] block font-bold">
                      Step 2: Describe the physical product details
                    </label>
                    <textarea
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      required
                      placeholder="e.g. A sleek, cylindrical wellness cylinder made of sandblasted white clay, with a subtle grooved bamboo cap, minimalist stamping, and a modern cork-textured sleeve near the base."
                      rows={4}
                      className="w-full text-sm p-4 rounded-xl bg-[#111] border border-[#333] focus:outline-none focus:border-[#C4FF00] focus:ring-1 focus:ring-[#C4FF00]/50 transition-all font-sans leading-relaxed text-zinc-200 placeholder-zinc-600 italic"
                    />
                    <span className="text-xs text-zinc-500 block leading-normal font-mono">
                      Be descriptive about shapes, textures, materials, caps, or buttons. The more visual details, the easier it is for the planners to synchronize consistent visual prompts.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Brand Name Input */}
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase font-mono tracking-widest text-[#666] block font-bold">
                        Brand Name <span className="text-zinc-500 font-normal font-mono lowercase">(Optional)</span>
                      </label>
                      <input
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="e.g. ORA WELLNESS"
                        className="w-full text-sm p-3.5 rounded-xl bg-[#111] border border-[#333] focus:outline-none focus:ring-1 focus:ring-[#C4FF00]/50 focus:border-[#C4FF00] transition-all text-white font-medium"
                      />
                      <span className="text-xs text-zinc-500 block">
                        Leave blank to let our design directors design a memorable trade name!
                      </span>
                    </div>

                    {/* Extra Style Directions */}
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase font-mono tracking-widest text-[#666] block font-semibold">
                        Creative Theme / Vibe Style
                      </label>
                      <input
                        value={extraStyle}
                        onChange={(e) => setExtraStyle(e.target.value)}
                        placeholder="e.g. Minimalist Zen, Bauhaus geometry, tactile eco-tech"
                        className="w-full text-sm p-3.5 rounded-xl bg-[#111] border border-[#333] focus:outline-none focus:ring-1 focus:ring-[#C4FF00]/50 focus:border-[#C4FF00] transition-all text-white"
                      />
                      <span className="text-xs text-zinc-500 block">
                        Directs composition style, environmental backgrounds, or lighting.
                      </span>
                    </div>
                  </div>

                  {/* Color Scheme Picker */}
                  <div className="space-y-3 pt-2">
                    <label className="text-[11px] uppercase font-mono tracking-widest text-[#666] block font-bold">
                      Step 3: Signature Color Scheme <span className="text-zinc-500 font-normal font-mono lowercase">(Optional)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_COLORS.map((col, index) => {
                        const isSelected = selectedColors.includes(col.name);
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => toggleColor(col.name)}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold font-mono transition-all border ${
                              isSelected 
                                ? "border-[#C4FF00] bg-[#C4FF00]/10 text-[#C4FF00] ring-1 ring-[#C4FF00]/20" 
                                : "border-[#333] bg-[#111] text-zinc-400 hover:border-[#666] hover:text-white"
                            }`}
                          >
                            {col.value !== "#FFFFFF" ? (
                              <span 
                                className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" 
                                style={{ backgroundColor: col.value }}
                              />
                            ) : (
                              <span className="w-3.5 h-3.5 rounded-full border border-zinc-700 bg-gradient-to-tr from-rose-400 via-emerald-400 to-sky-400 shrink-0" />
                            )}
                            <span>{col.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedColors.length > 0 && (
                      <div className="flex items-center space-x-2 text-xs bg-[#111] border border-[#333] px-3 py-2 rounded-lg text-zinc-300 max-w-fit font-mono">
                        <Palette className="w-3.5 h-3.5 text-[#C4FF00]" />
                        <span>Selected Theme Capsule: <strong className="text-white">{selectedColors.join(", ")}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Submission and error state */}
                  {blueprintError && (
                    <div className="bg-rose-950/20 border border-rose-950 rounded-xl p-4 flex items-start space-x-3 text-xs text-rose-300 animate-slide-up">
                      <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block mb-0.5">Blueprint System Error</span>
                        <span>{blueprintError}</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-[#333]">
                    <button
                      type="submit"
                      disabled={isBlueprinting || !productDescription.trim()}
                      className="w-full flex items-center justify-center space-x-3 px-6 py-4 rounded-xl bg-[#C4FF00] text-black hover:bg-white active:scale-[0.99] transition-all font-black font-display tracking-widest text-xs uppercase disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed shadow-xl cursor-pointer group"
                      id="submitBtn"
                    >
                      {isBlueprinting ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin text-black" />
                          <span className="font-mono text-xs tracking-widest font-black text-black">GENERATING BLUEPRINT PROMPTS...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 text-black group-hover:rotate-12 transition-transform" />
                          <span>INITIATE BRAND BLUEPRINT</span>
                          <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          ) : (
            // App Studio Workspace
            <motion.div
              key="designer-workspace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              {/* Brand Header Overview */}
              <div className="bg-[#0A0A0A] border border-[#333] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-bl from-[#C4FF00]/5 via-transparent to-transparent pointer-events-none rounded-bl-full" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-[10px] bg-[#C4FF00] text-black font-mono uppercase tracking-widest px-2.5 py-0.5 rounded font-black">
                        STUDIO PORTFOLIO
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C4FF00] animate-ping" />
                      <span className="text-[10px] uppercase font-mono tracking-widest text-[#C4FF00] font-bold">Blueprint Active</span>
                    </div>
                    <h2 className="font-display font-black italic uppercase tracking-tighter text-3xl sm:text-4xl text-white underline decoration-[#C4FF00] decoration-2">
                      {brandPlan.brandName}
                    </h2>
                    <p className="font-display italic text-zinc-400 font-medium text-lg leading-relaxed mt-1">
                      &ldquo;{brandPlan.slogan}&rdquo;
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={imagineAllMediums}
                      disabled={Object.values(mediumExecutions).some((e: any) => e.loading)}
                      className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-[#C4FF00] text-black hover:bg-white font-black uppercase text-xs tracking-widest shadow-lg transition-all cursor-pointer disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="w-4 h-4 text-black" />
                      <span>RE-IMAGINE ALL MEDIUMS</span>
                    </button>
                    <button
                      onClick={resetWorkspace}
                      className="flex items-center space-x-2 px-5 py-3 rounded-xl border border-[#333] bg-[#111] text-zinc-300 hover:border-[#C4FF00] hover:text-white font-bold tracking-wide text-xs transition-colors duration-200 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>START NEW BRAND</span>
                    </button>
                  </div>
                </div>

                {/* Subtitle Style Guide parameters */}
                <div className="mt-8 pt-6 border-t border-[#333] grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                  <div className="lg:col-span-8 space-y-2">
                    <div className="flex items-center space-x-2 text-zinc-200 font-bold font-mono text-xs uppercase tracking-wider">
                      <BookOpen className="w-4 h-4 text-[#C4FF00]" />
                      <span>Consistent Product Style Guide</span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-mono bg-[#111] p-4 rounded-xl border border-[#333]">
                      {brandPlan.productStyleGuide}
                    </p>
                    <span className="text-[10px] text-zinc-500 block italic leading-normal font-mono">
                      The parameters above represent physical markers stamped into every single Nano-Banana prompt request to ensure geometry preservation cross-campaign.
                    </span>
                  </div>

                  <div className="lg:col-span-4 bg-[#111] p-4 rounded-xl border border-[#333] flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold font-mono uppercase tracking-widest text-[#666] block mb-2">
                        Execution Parameters
                      </span>
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400">Render Engine</span>
                          <span className="font-mono bg-[#C4FF00]/10 text-[#C4FF00] border border-[#C4FF00]/20 px-1.5 py-0.5 rounded text-[11px] font-bold">Nano-Banana (2.5e)</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400">Anti-Human Safeguard</span>
                          <span className="font-mono font-bold text-[#C4FF00] bg-[#C4FF00]/10 border border-[#C4FF00]/20 px-1.5 py-0.5 rounded text-[11px]">Strict Active</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400">Consistency Level</span>
                          <span className="font-mono text-[#C4FF00] font-bold">98% Descriptor Sync</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid of Mediums Mockups */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* MEDIUM A: BILLBOARD (16:9) - Landscape scale */}
                <div className="lg:col-span-12 bg-[#0A0A0A] border border-[#333] rounded-2xl shadow-sm overflow-hidden" id="billboardContainer">
                  <div className="border-b border-[#333] px-6 py-4 bg-[#111] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono bg-[#C4FF00] text-black px-2.5 py-0.5 rounded font-black uppercase tracking-widest">Medium 01</span>
                        <h3 className="font-display font-black text-white text-lg uppercase italic tracking-tight">Digital City Highway Billboard</h3>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 font-mono uppercase tracking-wider">Generates landscape advertising mockups (16:9 ratio)</p>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <button
                        onClick={() => executeImageGeneration("billboard")}
                        disabled={mediumExecutions.billboard.loading}
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#C4FF00] hover:bg-white text-black text-xs font-black font-mono tracking-widest uppercase transition-colors disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {mediumExecutions.billboard.loading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Rendering...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>{mediumExecutions.billboard.imageUrl ? "Regenerate Shot" : "Generate Outdoor Image"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0A0A0A]">
                    {/* Prompt customization */}
                    <div className="lg:col-span-4 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold font-mono text-zinc-500 uppercase tracking-widest">
                          Visual Image Prompt Config
                        </label>
                        <textarea
                          value={mediumExecutions.billboard.customPrompt}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMediumExecutions(p => ({
                              ...p,
                              billboard: { ...p.billboard, customPrompt: val }
                            }));
                          }}
                          rows={6}
                          className="w-full text-xs p-3.5 rounded-xl border border-[#333] bg-[#111] focus:outline-none focus:border-[#C4FF00] font-mono text-zinc-350 leading-relaxed placeholder-zinc-650"
                        />
                      </div>

                      <div className="p-4 rounded-xl bg-[#C4FF00]/5 border border-[#C4FF00]/25 space-y-1.5">
                        <div className="flex items-center space-x-1.5 text-xs text-[#C4FF00] font-black uppercase tracking-widest font-mono">
                          <FileText className="w-4 h-4 text-[#C4FF00]" />
                          <span>Billboard Copysheet</span>
                        </div>
                        <p className="text-xs text-zinc-300 font-mono">
                          Ad Text: &ldquo;{brandPlan.mediums.billboard.copyText}&rdquo;
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-[#333] bg-[#111] text-[11px] text-zinc-400 flex items-start space-x-2 font-mono">
                        <div className="w-2 h-2 rounded-full bg-[#C4FF00] mt-1 shrink-0 animate-pulse" />
                        <span>Filter Guarantee: Strict anti-human restrictions appended on generation to guarantee no passengers, drivers, or viewers are rendered.</span>
                      </div>
                    </div>

                    {/* Rendering Visual space (Mockup Frame) */}
                    <div className="lg:col-span-8 flex flex-col justify-center items-center py-4 bg-[#111] rounded-2xl border border-[#333] overflow-hidden relative min-h-[350px]">
                      {mediumExecutions.billboard.loading ? (
                        // Loader structure
                        <div className="text-center space-y-3">
                          <div className="relative inline-block">
                            <span className="flex h-10 w-10 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C4FF00] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-10 w-10 bg-[#C4FF00] items-center justify-center text-black">
                                <Sparkles className="w-5 h-5 text-black" />
                              </span>
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-black font-mono tracking-widest block text-white text-center uppercase">Nano-Banana Renderer</span>
                            <span className="text-[11px] text-[#C4FF00] block italic font-mono mt-1">Simulating physical billboard layout structure (16:9)...</span>
                          </div>
                        </div>
                      ) : mediumExecutions.billboard.imageUrl ? (
                        // Rendered item
                        <div className="w-full h-full px-4 flex flex-col items-center">
                          {/* Billboard frame container */}
                          <div className="relative w-full max-w-2xl bg-[#0F0F0F] rounded-lg shadow-2xl overflow-hidden p-2 border-4 border-[#333]">
                            <div className="aspect-[16/9] relative bg-black overflow-hidden rounded group/image">
                              <img
                                src={mediumExecutions.billboard.imageUrl}
                                alt="Billboard Campaign"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover rounded"
                              />
                              {/* Overlay copy */}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent p-4 flex items-end justify-between">
                                <p className="text-white font-display font-black text-sm sm:text-base tracking-wide uppercase italic">
                                  {brandPlan.mediums.billboard.copyText}
                                </p>
                                <span className="text-[9px] font-mono bg-[#C4FF00] text-black px-2 py-0.5 rounded font-black uppercase shrink-0">
                                  16:9 NANO-IMAGE
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Structural pillars mimicking real outdoor scene */}
                          <div className="flex justify-between w-full max-w-[200px] -mt-1 h-14 relative z-0">
                            <div className="w-4 bg-[#262626]" />
                            <div className="w-4 bg-[#262626]" />
                          </div>
                          <div className="w-full max-w-[260px] h-1 bg-[#1a1a1a] -mt-1 rounded z-10" />

                          <div className="mt-4 flex items-center space-x-3">
                            <button
                              onClick={() => {
                                if (mediumExecutions.billboard.imageUrl) {
                                  setActiveFullImage({
                                    url: mediumExecutions.billboard.imageUrl,
                                    title: `${brandPlan.brandName} - Outdoor Billboard`,
                                    prompt: mediumExecutions.billboard.customPrompt || brandPlan.mediums.billboard.imagePrompt
                                  });
                                }
                              }}
                              className="text-xs text-zinc-300 hover:text-white font-bold flex items-center space-x-1 border border-[#333] bg-[#1a1a1a] px-3.5 py-1.5 rounded transition-colors duration-200 cursor-pointer"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span className="p-1 font-mono uppercase tracking-wider text-[10px]">Inspect Shot</span>
                            </button>
                            <a 
                              href={mediumExecutions.billboard.imageUrl} 
                              download={`${brandPlan.brandName}_billboard.png`} 
                              className="text-xs text-zinc-300 hover:text-white font-bold flex items-center space-x-1 border border-[#333] bg-[#1a1a1a] px-3.5 py-1.5 rounded transition-colors duration-200 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="p-1 font-mono uppercase tracking-wider text-[10px]">Download Source</span>
                            </a>
                          </div>
                        </div>
                      ) : (
                        // Idle frame trigger state
                        <div className="text-center p-8 max-w-sm space-y-4">
                          <div className="w-16 h-16 rounded-full bg-[#1c1c1c] border border-[#333] flex items-center justify-center mx-auto text-[#C4FF00]">
                            <ImageIcon className="w-7 h-7" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-display font-black uppercase text-base text-white tracking-widest italic">Outdoor campaign idle</h4>
                            <p className="text-xs text-zinc-400 font-mono">Press the trigger to call the Nano-Banana model. It creates a landscape city advertisement shot without people.</p>
                          </div>
                          <button
                            onClick={() => executeImageGeneration("billboard")}
                            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#C4FF00] hover:bg-white text-black rounded-lg text-xs font-black transition-colors font-mono uppercase tracking-widest cursor-pointer"
                          >
                            <span>Trigger Generation</span>
                          </button>
                        </div>
                      )}

                      {/* Display execution errors */}
                      {mediumExecutions.billboard.error && (
                        <div className="absolute inset-x-4 bottom-4 p-3 bg-rose-950/20 border border-rose-950 text-xs rounded-xl text-rose-300 font-mono">
                          <strong>Execution Failed:</strong> {mediumExecutions.billboard.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* TWO COLUMN MEDIUMS PANEL: NEWSPAPER (3:4) & SOCIAL (1:1) */}
                <div className="lg:col-span-6 bg-[#0A0A0A] border border-[#333] rounded-2xl shadow-sm overflow-hidden" id="newspaperContainer">
                  <div className="border-[#333] border-b px-6 py-4 bg-[#111] flex overflow-hidden items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono bg-[#C4FF00] text-black px-2.5 py-0.5 rounded font-black uppercase tracking-widest">Medium 02</span>
                        <h3 className="font-display font-black text-white text-lg uppercase italic">Social Media Post</h3>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 font-mono uppercase tracking-wider">Captivating studio product placement (1:1 square ratio)</p>
                    </div>

                    <button
                      onClick={() => executeImageGeneration("social")}
                      disabled={mediumExecutions.social.loading}
                      className="flex items-center justify-center rounded-xl p-2.5 bg-[#1a1a1a] border border-[#333] text-zinc-400 hover:text-[#C4FF00] hover:border-[#C4FF00] transition-colors shrink-0 cursor-pointer"
                      title="Trigger Generation"
                    >
                      <RefreshCw className={`w-4 h-4 ${mediumExecutions.social.loading ? "animate-spin text-[#C4FF00]" : ""}`} />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Prompt customization */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold font-mono text-zinc-500 uppercase tracking-widest block">
                        Visual Image Prompt Config (1:1 Key)
                      </label>
                      <textarea
                        value={mediumExecutions.social.customPrompt}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMediumExecutions(p => ({
                            ...p,
                            social: { ...p.social, customPrompt: val }
                            }));
                          }}
                        rows={3}
                        className="w-full text-xs p-3.5 rounded-xl border border-[#333] bg-[#111] focus:outline-none focus:border-[#C4FF00] font-mono text-zinc-350 leading-relaxed placeholder-zinc-650"
                      />
                    </div>

                    {/* Mockup smartphone wrapper */}
                    <div className="bg-[#111] rounded-2xl border border-[#333] p-4 sm:p-6 flex justify-center items-center relative min-h-[320px]">
                      {mediumExecutions.social.loading ? (
                        <div className="text-center space-y-3">
                          <span className="flex h-8 w-8 relative mx-auto">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C4FF00] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-8 w-8 bg-[#C4FF00] items-center justify-center text-black text-xs font-black">
                              <Sparkles className="w-4 h-4 text-black" />
                            </span>
                          </span>
                          <span className="text-[11px] font-mono tracking-widest text-[#C4FF00] uppercase block">Rendering 1:1 Social Studio Shot...</span>
                        </div>
                      ) : mediumExecutions.social.imageUrl ? (
                        <div className="w-full max-w-[280px] bg-[#161618] rounded-2xl shadow-2xl border border-[#333] overflow-hidden text-left font-sans">
                          {/* Inner Instagram style feed */}
                          <div className="p-3 flex items-center space-x-2 border-b border-[#2d2d2f]">
                            <div className="w-6 h-6 rounded-full bg-[#C4FF00] flex items-center justify-center text-[10px] text-black font-mono font-bold">
                              {brandName ? brandName.substring(0, 2).toUpperCase() : "BB"}
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-white tracking-tight uppercase">
                                {brandPlan.brandName}
                              </p>
                              <p className="text-[9px] text-[#C4FF00] font-bold leading-normal uppercase font-mono tracking-wider">Sponsored Post</p>
                            </div>
                          </div>

                          <div className="aspect-square bg-black overflow-hidden relative">
                            <img
                              src={mediumExecutions.social.imageUrl}
                              alt="Social Product Feed"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute top-2 right-2 text-[9px] font-mono bg-black/80 text-[#C4FF00] border border-[#C4FF00]/20 px-1.5 py-0.5 rounded font-black uppercase">
                              1:1 SHOT
                            </span>
                          </div>

                          <div className="p-3 space-y-2">
                            <div className="flex items-center space-x-3 text-zinc-300">
                              <span className="text-xs font-mono">&hearts; <span className="font-bold text-[#C4FF00]">1,482 Likes</span></span>
                            </div>
                            <p className="text-xs text-zinc-300 leading-normal font-mono">
                              <strong className="text-white mr-1.5 uppercase font-bold">{brandPlan.brandName}</strong>
                              {brandPlan.mediums.social.copyText}
                            </p>
                          </div>

                          <div className="border-t border-[#2d2d2f] px-3 py-2 bg-[#1c1c1f] flex justify-between">
                            <button
                              onClick={() => {
                                if (mediumExecutions.social.imageUrl) {
                                  setActiveFullImage({
                                    url: mediumExecutions.social.imageUrl,
                                    title: `${brandPlan.brandName} - Social Feed Post`,
                                    prompt: mediumExecutions.social.customPrompt || brandPlan.mediums.social.imagePrompt
                                  });
                                }
                              }}
                              className="text-[10px] text-zinc-400 hover:text-white font-bold flex items-center space-x-1 cursor-pointer transition-colors font-mono uppercase tracking-wider"
                            >
                              <Maximize2 className="w-3 h-3" />
                              <span>Inspect</span>
                            </button>
                            <a
                              href={mediumExecutions.social.imageUrl}
                              download={`${brandPlan.brandName}_social.png`}
                              className="text-[10px] text-zinc-400 hover:text-white font-bold flex items-center space-x-1 cursor-pointer transition-colors font-mono uppercase tracking-wider"
                            >
                              <Download className="w-3 h-3" />
                              <span>Save PNG</span>
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-6 space-y-3">
                          <span className="text-[10px] bg-[#1a1a1a] border border-[#333] text-zinc-400 px-3/2 py-1 rounded font-mono uppercase tracking-widest block mx-auto max-w-fit font-bold">Social Idle</span>
                          <button
                            onClick={() => executeImageGeneration("social")}
                            className="text-xs underline font-black uppercase tracking-widest text-[#C4FF00] hover:text-white transition-colors cursor-pointer block font-mono"
                          >
                            Generate Studio Ad
                          </button>
                        </div>
                      )}

                      {/* Display execution errors */}
                      {mediumExecutions.social.error && (
                        <div className="absolute inset-x-4 bottom-4 p-2 bg-rose-955/20 border border-rose-950 text-xs rounded-xl text-rose-300 font-mono">
                          {mediumExecutions.social.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-[#0A0A0A] border border-[#333] rounded-2xl shadow-sm overflow-hidden" id="socialContainer">
                  <div className="border-[#333] border-b px-6 py-4 bg-[#111] flex overflow-hidden items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono bg-[#C4FF00] text-black px-2.5 py-0.5 rounded font-black uppercase tracking-widest">Medium 03</span>
                        <h3 className="font-display font-black text-white text-lg uppercase italic">Newspaper Press Print</h3>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 font-mono uppercase tracking-wider">Retro monochrome editorial raster style (3:4 ratio)</p>
                    </div>

                    <button
                      onClick={() => executeImageGeneration("newspaper")}
                      disabled={mediumExecutions.newspaper.loading}
                      className="flex items-center justify-center rounded-xl p-2.5 bg-[#1a1a1a] border border-[#333] text-zinc-400 hover:text-[#C4FF00] hover:border-[#C4FF00] transition-colors shrink-0 cursor-pointer"
                      title="Trigger Generation"
                    >
                      <RefreshCw className={`w-4 h-4 ${mediumExecutions.newspaper.loading ? "animate-spin text-[#C4FF00]" : ""}`} />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Prompt customization */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold font-mono text-zinc-500 uppercase tracking-widest block">
                        Visual Image Prompt Config (3:4 Portrait)
                      </label>
                      <textarea
                        value={mediumExecutions.newspaper.customPrompt}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMediumExecutions(p => ({
                            ...p,
                            newspaper: { ...p.newspaper, customPrompt: val }
                          }));
                        }}
                        rows={3}
                        className="w-full text-xs p-3.5 rounded-xl border border-[#333] bg-[#111] focus:outline-none focus:border-[#C4FF00] font-mono text-zinc-350 leading-relaxed placeholder-zinc-650"
                      />
                    </div>

                    {/* Newspaper printed mockup frame (Grayscale columns style) */}
                    <div className="bg-[#111] rounded-2xl border border-[#333] p-4 sm:p-6 flex justify-center items-center relative min-h-[320px]">
                      {mediumExecutions.newspaper.loading ? (
                        <div className="text-center space-y-3">
                          <span className="flex h-8 w-8 relative mx-auto">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C4FF00] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-8 w-8 bg-[#C4FF00] items-center justify-center text-black text-xs font-black">
                              <Sparkles className="w-4 h-4 text-black" />
                            </span>
                          </span>
                          <span className="text-[11px] font-mono tracking-widest text-[#C4FF00] uppercase block">Drafting Printed News Engraving...</span>
                        </div>
                      ) : mediumExecutions.newspaper.imageUrl ? (
                        <div className="w-full max-w-[270px] bg-[#FAF8F5] text-zinc-900 p-4 rounded border border-zinc-300 shadow-2xl font-serif leading-relaxed text-left relative overflow-hidden">
                          {/* Aged overlay effect */}
                          <div className="absolute inset-0 bg-amber-800/2 opacity-5 pointer-events-none" />

                          {/* Newspaper headline tag */}
                          <div className="border-b-2 border-double border-zinc-700 pb-1.5 mb-2.5 flex justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold">
                            <span>THE FINANCIAL REPORT</span>
                            <span>AESTHETICS</span>
                          </div>

                          <h4 className="font-display font-black text-xs leading-snug tracking-tight mb-2 uppercase text-zinc-900">
                            {brandPlan.brandName} REDEFINES {brandName ? "MARKETPLACE" : "MODERN DESIGN"}
                          </h4>

                          {/* Newspaper Image with halftone grid grayscale overlay */}
                          <div className="aspect-[3/4] bg-zinc-200 outline outline-offset-1 outline-1 outline-zinc-300 overflow-hidden relative grayscale contrast-115 brightness-95 mb-3">
                            <img
                              src={mediumExecutions.newspaper.imageUrl}
                              alt="Newspaper printed ad"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-radial-dots opacity-15 pointer-events-none" />
                            <span className="absolute bottom-1 right-1 text-[8px] font-mono bg-zinc-900 text-[#FBFBF9] px-1 py-0.2">
                              PRESS PROTOCOL
                            </span>
                          </div>

                          <p className="text-[10px] text-[#222] leading-normal mb-2 pt-1 border-t border-zinc-300 border-dotted font-mono">
                            {brandPlan.mediums.newspaper.copyText}
                          </p>

                          <div className="border-t border-zinc-300 pt-2.5 mt-2.5 flex justify-between font-mono text-[9px] text-zinc-500 font-bold">
                            <button
                              onClick={() => {
                                if (mediumExecutions.newspaper.imageUrl) {
                                  setActiveFullImage({
                                    url: mediumExecutions.newspaper.imageUrl,
                                    title: `${brandPlan.brandName} - Newspaper Column Print`,
                                    prompt: mediumExecutions.newspaper.customPrompt || brandPlan.mediums.newspaper.imagePrompt
                                  });
                                }
                              }}
                              className="hover:text-black font-black flex items-center space-x-1 cursor-pointer"
                            >
                              <Maximize2 className="w-2.5 h-2.5 text-zinc-700" />
                              <span>INSPECT</span>
                            </button>
                            <a
                              href={mediumExecutions.newspaper.imageUrl}
                              download={`${brandPlan.brandName}_press.png`}
                              className="hover:text-black font-black flex items-center space-x-1 cursor-pointer"
                            >
                              <Download className="w-2.5 h-2.5 text-zinc-700" />
                              <span>EXPORT</span>
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-6 space-y-3">
                          <span className="text-[10px] bg-[#1a1a1a] border border-[#333] text-zinc-400 px-3/2 py-1 rounded font-mono uppercase tracking-widest block mx-auto max-w-fit font-bold">Press Idle</span>
                          <button
                            onClick={() => executeImageGeneration("newspaper")}
                            className="text-xs underline font-black uppercase tracking-widest text-[#C4FF00] hover:text-white transition-colors cursor-pointer block font-mono"
                          >
                            Generate Press Render
                          </button>
                        </div>
                      )}

                      {/* Display execution errors */}
                      {mediumExecutions.newspaper.error && (
                        <div className="absolute inset-x-4 bottom-4 p-2 bg-rose-955/20 border border-rose-950 text-xs rounded-xl text-rose-300 font-mono">
                          {mediumExecutions.newspaper.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Fullscreen Photo Inspector Modal */}
      <AnimatePresence>
        {activeFullImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#060606]/95 backdrop-blur-md p-4 sm:p-8 flex items-center justify-center overflow-y-auto"
          >
            <div className="bg-[#0A0A0A] border border-[#333] rounded-2xl max-w-3xl w-full max-h-full overflow-hidden flex flex-col shadow-2xl relative">
              <button
                onClick={() => setActiveFullImage(null)}
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-zinc-800 hover:bg-[#C4FF00] text-zinc-400 hover:text-black flex items-center justify-center text-lg font-black transition-all cursor-pointer border border-[#333]"
                title="Close"
              >
                &times;
              </button>

              <div className="overflow-y-auto p-6 sm:p-8 space-y-6">
                <div className="space-y-1 mt-2">
                  <span className="text-[9px] bg-[#C4FF00] text-black font-mono px-2 py-0.5 rounded font-black uppercase tracking-widest">
                    Model: Nano-Banana (gemini-2.5-flash-image)
                  </span>
                  <h3 className="font-display font-black text-2xl text-white tracking-tight uppercase italic mt-1.5">
                    {activeFullImage.title}
                  </h3>
                </div>

                {/* Main image container */}
                <div className="bg-black p-2 sm:p-4 rounded-xl border border-[#333] max-h-[400px] flex justify-center items-center overflow-hidden">
                  <img
                    src={activeFullImage.url}
                    alt="Active Full Campaign Frame"
                    referrerPolicy="no-referrer"
                    className="max-h-[380px] object-contain rounded-lg shadow-2xl border border-[#222]"
                  />
                </div>

                {/* Meta properties */}
                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 block font-bold">
                      Full Compiled Prompt Payload
                    </span>
                    <p className="text-xs font-mono bg-[#111] p-4 rounded-xl text-zinc-300 leading-relaxed border border-[#333] max-h-36 overflow-y-auto">
                      {activeFullImage.prompt}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <a
                      href={activeFullImage.url}
                      download="campaign_concept.png"
                      className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#C4FF00] hover:bg-white text-black text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Clean Image Bytes</span>
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeFullImage.prompt);
                        setPromptCopied(true);
                        setTimeout(() => setPromptCopied(false), 2000);
                      }}
                      className="flex items-center space-x-2 px-4 py-2.5 rounded-lg border border-[#333] bg-[#111] hover:border-[#C4FF00] hover:bg-[#C4FF00]/10 text-white hover:text-[#C4FF00] text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <span>{promptCopied ? "Prompt Copied! ✓" : "Copy Prompt"}</span>
                    </button>
                    <button
                      onClick={() => setActiveFullImage(null)}
                      className="flex items-center space-x-2 px-4 py-2.5 text-zinc-400 hover:text-white text-xs font-bold cursor-pointer transition-colors"
                    >
                      <span>Dismiss Inspector</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual Footer credit */}
      <footer className="border-t border-[#333] bg-[#0A0A0A] py-8 px-6 mt-16 text-center text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto space-y-2">
          <p className="tracking-widest uppercase font-bold text-zinc-400">Brand Builder Studio &copy; {new Date().getFullYear()}</p>
          <p className="text-zinc-600">Powered by Gemini 3.5 Flash and Nano-Banana Renderers. Strictly No Humans rendering allowed.</p>
        </div>
      </footer>
    </div>
  );
}

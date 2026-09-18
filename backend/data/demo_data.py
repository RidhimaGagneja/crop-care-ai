from typing import Dict, Any, List

SUPPORTED_CROPS: List[str] = ["Tomato", "Potato", "Maize", "Grape", "Apple"]

SUPPORTED_ANALYSIS_TYPES: List[str] = ["disease", "pest", "both"]

ALLOWED_IMAGE_TYPES: List[str] = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
]

CROP_DEMO_DATA: Dict[str, List[Dict[str, Any]]] = {
    "Tomato": [
        {
            "condition": "Early Blight",
            "type": "disease",
            "confidence_range": (0.88, 0.97),
            "severity": "High",
            "risk": "High",
            "symptoms": [
                "Dark brown spots with concentric rings on lower leaves",
                "Yellowing of leaf tissue surrounding spots",
                "Leaf curling and premature defoliation",
                "Stem lesions at soil line (collar rot)",
            ],
            "immediate_actions": [
                "Remove and destroy all infected plant debris",
                "Apply fungicide containing chlorothalonil or mancozeb",
                "Ensure proper plant spacing for air circulation",
                "Water at the base of plants to avoid wetting leaves",
            ],
            "prevention": [
                "Use disease-resistant tomato varieties",
                "Practice crop rotation every 2-3 years",
                "Apply mulch to prevent soil splashback",
                "Monitor plants weekly, especially during wet periods",
            ],
            "environmental_factors": [
                "High humidity (>85%) favors disease development",
                "Optimal temperature: 24-29°C (75-85°F)",
                "Frequent rainfall or overhead irrigation triggers outbreaks",
                "Poor air circulation increases disease severity",
            ],
        },
        {
            "condition": "Late Blight",
            "type": "disease",
            "confidence_range": (0.85, 0.96),
            "severity": "High",
            "risk": "High",
            "symptoms": [
                "Water-soaked lesions on leaves that turn brown to purple",
                "White fuzzy growth on underside of leaves in humid conditions",
                "Brown lesions on stems",
                "Firm, brown rot on green or ripe fruit",
            ],
            "immediate_actions": [
                "Remove infected plants immediately if found early",
                "Apply preventative fungicide with copper or mefenoxam",
                "Avoid overhead watering; use drip irrigation",
                "Harvest fruit immediately and inspect for lesions",
            ],
            "prevention": [
                "Plant resistant cultivars when available",
                "Ensure excellent soil drainage",
                "Space plants wide apart for air movement",
                "Use certified disease-free seed/transplants",
            ],
            "environmental_factors": [
                "Cool (10-20°C / 50-68°F) and wet weather",
                "Leaf wetness >4 hours required for infection",
                "Foggy mornings and rainy days accelerate spread",
                "Wind-dispersed sporangia travel long distances",
            ],
        },
    ],
    "Potato": [
        {
            "condition": "Late Blight",
            "type": "disease",
            "confidence_range": (0.86, 0.96),
            "severity": "High",
            "risk": "High",
            "symptoms": [
                "Dark water-soaked spots on leaf edges, expanding rapidly",
                "Pale green to yellow halo around lesions",
                "White mold growth on leaf undersides during humid nights",
                "Tuber rot: reddish-brown granular dry rot under skin",
            ],
            "immediate_actions": [
                "Apply protective fungicide immediately (contact + systemic)",
                "Kill vines 2-3 weeks before harvest to prevent tuber infection",
                "Destroy all cull piles and volunteer potatoes",
                "Avoid harvesting wet tubers; cure at 10-13°C with ventilation",
            ],
            "prevention": [
                "Plant certified seed potatoes free of late blight",
                "Use resistant potato varieties where available",
                "Hill plants well to protect tubers from sporangia",
                "Monitor fields weekly and apply protectants on schedule",
            ],
            "environmental_factors": [
                "High relative humidity (>90%) overnight",
                "Moderate temperatures 15-22°C (59-72°F)",
                "Frequent dew, rain, or overhead irrigation",
                "Sporangia spread by wind and splashing rain",
            ],
        },
        {
            "condition": "Colorado Potato Beetle Damage",
            "type": "pest",
            "confidence_range": (0.84, 0.94),
            "severity": "Medium",
            "risk": "Medium",
            "symptoms": [
                "Skeletonized leaves with only veins remaining",
                "Orange-yellow egg clusters on leaf undersides",
                "Reddish larvae with black heads defoliating foliage",
                "Yellow-black striped adult beetles present on plants",
            ],
            "immediate_actions": [
                "Handpick adults and crush egg clusters if population is small",
                "Apply Bacillus thuringiensis (Bt) tenebrionis against young larvae",
                "Use neem oil or spinosad for organic control",
                "Rotate insecticide classes to prevent resistance",
            ],
            "prevention": [
                "Crop rotation to non-host fields (at least 0.5 km)",
                "Deep plowing in spring to kill overwintering adults",
                "Use floating row covers at planting time",
                "Plant trap crops (potato perimeter rows) early to attract beetles",
            ],
            "environmental_factors": [
                "Overwinters as adult in soil 10-20cm deep",
                "Warm spring temperatures trigger emergence (>15°C / 59°F)",
                "Favors sunny, dry conditions",
                "Multiple generations per season in warm climates",
            ],
        },
    ],
    "Maize": [
        {
            "condition": "Northern Corn Leaf Blight",
            "type": "disease",
            "confidence_range": (0.83, 0.95),
            "severity": "Medium",
            "risk": "Medium",
            "symptoms": [
                "Long, elliptical, gray-green to tan lesions (2-15 cm long)",
                "Lesions run parallel to leaf veins, cigar-shaped",
                "Lesions merge to kill large areas of leaf tissue",
                "Severe infection produces blighted appearance above ear",
            ],
            "immediate_actions": [
                "Apply foliar fungicide during tasseling/silking if threshold met",
                "Prioritize hybrids with Ht resistance genes",
                "Reduce plant stress by ensuring adequate fertility",
            ],
            "prevention": [
                "Rotate maize with non-host crops (soy, small grains)",
                "Bury crop residue through tillage to reduce inoculum",
                "Plant resistant hybrids adapted to your region",
                "Avoid planting continuous maize in same field",
            ],
            "environmental_factors": [
                "Moderate temperatures (18-27°C / 64-81°F)",
                "Prolonged periods of leaf wetness (6-18 hrs dew/rain)",
                "High humidity (>90%) during vegetative growth",
                "Conidia spread by wind and splashing water",
            ],
        },
        {
            "condition": "Fall Armyworm Infestation",
            "type": "pest",
            "confidence_range": (0.85, 0.95),
            "severity": "High",
            "risk": "High",
            "symptoms": [
                "Young larvae create 'window-pane' skeletonizing on leaves",
                "Larger larvae produce ragged, large holes with lots of frass",
                "Larvae bore into whorl and tassel, destroying growing point",
                "Later instars attack ears, tunneling into kernels",
            ],
            "immediate_actions": [
                "Scout weekly; treat when 20%+ plants show feeding damage",
                "Apply Bt kurstaki or spinetoram on young larvae (<1cm)",
                "Target sprays to whorl where larvae feed",
                "Release egg parasitoids (Trichogramma species)",
            ],
            "prevention": [
                "Push-pull system: intercrop with Desmodium + Napier grass borders",
                "Early planting to escape peak moth migration",
                "Conserve natural enemies (ladybugs, lacewings, parasitoid wasps)",
                "Use Bt maize hybrids expressing Cry1F/Vip3A toxins",
            ],
            "environmental_factors": [
                "Moths migrate with wind fronts, travel hundreds of km/night",
                "Prefers warm, humid tropical/subtropical conditions",
                "Development fastest at 25-30°C (77-86°F)",
                "Multiple overlapping generations per year in warm zones",
            ],
        },
    ],
    "Wheat": [
        {
            "condition": "Yellow Rust / Stripe Rust",
            "type": "disease",
            "confidence_range": (0.82, 0.94),
            "severity": "High",
            "risk": "High",
            "symptoms": [
                "Bright yellow-orange pustules arranged in neat stripes parallel to veins",
                "Pustules erupt through upper leaf epidermis",
                "Severe infection causes leaf death and reduced grain fill",
                "Later stages develop dark telial pustules on leaf undersides",
            ],
            "immediate_actions": [
                "Apply fungicide immediately at first detection of stripe rust",
                "Use triazole or strobilurin + triazole mixture at label rates",
                "Prioritize flag leaf protection as it contributes 40%+ of yield",
            ],
            "prevention": [
                "Grow resistant wheat cultivars with Yr resistance genes",
                "Avoid very early sowing (increases autumn infection)",
                "Remove volunteer wheat and alternate hosts (barberry)",
                "Split nitrogen applications, avoid excessive lush growth",
            ],
            "environmental_factors": [
                "Cool, moist conditions 7-15°C (45-59°F) favor infection",
                "Requires 4-6 hrs leaf wetness and dew",
                "Over-summers on volunteer wheat or grasses",
                "Windborne urediniospores move thousands of kilometers",
            ],
        },
        {
            "condition": "Aphid Infestation (English Grain Aphid)",
            "type": "pest",
            "confidence_range": (0.80, 0.92),
            "severity": "Medium",
            "risk": "Medium",
            "symptoms": [
                "Clusters of pale green to reddish-brown aphids on flag leaf and ears",
                "Sticky honeydew deposits encouraging sooty mold",
                "Curling and yellowing of upper leaves",
                "Possible BYDV transmission: yellowing/reddening of leaf tips, stunting",
            ],
            "immediate_actions": [
                "Treat when threshold reached (>5 aphids per ear at milky ripe)",
                "Apply selective insecticides (pymetrozine, flonicamid) to preserve beneficials",
                "Consider pirimicarb for aphid-specific control",
            ],
            "prevention": [
                "Delay autumn sowing to reduce migration of alate aphids",
                "Conserve parasitoids (Aphidius) and ladybird beetles",
                "Use seed treatment with neonicotinoid in high-risk BYDV seasons",
                "Maintain balanced nutrition; avoid over-fertilizing with nitrogen",
            ],
            "environmental_factors": [
                "Mild winters and warm, dry springs favor aphid build-up",
                "Rapid reproduction above 18°C (64°F)",
                "Winged forms migrate on warm winds, spreading BYDV",
                "Heavy rain reduces populations through dislodgement and fungal epizootics",
            ],
        },
    ],
    "Rice": [
        {
            "condition": "Blast Disease",
            "type": "disease",
            "confidence_range": (0.83, 0.95),
            "severity": "High",
            "risk": "High",
            "symptoms": [
                "Spindle-shaped leaf spots with gray-white center and brown border",
                "Blackened, rotten nodes causing stem breakage",
                "Panicles partially or completely blank (whiteheads)",
                "Neck rot: dark brown to black girdling at base of panicle",
            ],
            "immediate_actions": [
                "Apply fungicide at booting and heading stages (triazoles + strobilurins)",
                "Drain field for short periods (2-3 days) to reduce humidity",
                "Stop excessive nitrogen applications that favor blast",
            ],
            "prevention": [
                "Use blast-resistant rice varieties adapted to your area",
                "Maintain proper water depth during critical stages (5-10 cm)",
                "Avoid late or excessive N fertilization; split applications",
                "Remove rice straw and stubble after harvest; destroy weed hosts",
            ],
            "environmental_factors": [
                "Optimum temperature 25-28°C (77-82°F) with high humidity (>90%)",
                "Night temperatures <26°C with dew formation on leaves",
                "Extended leaf wetness (>10 hrs/day) promotes epidemic",
                "Upland and intermittently irrigated rice at highest risk",
            ],
        },
        {
            "condition": "Brown Planthopper Damage",
            "type": "pest",
            "confidence_range": (0.81, 0.93),
            "severity": "High",
            "risk": "High",
            "symptoms": [
                "Hopperburn: leaves yellow, then dry up with burnt appearance",
                "Complete drying of plant in circular 'hopperburn' patches",
                "Nymphs and adults congregate at base of tillers, sucking sap",
                "Eggs laid in rows inside leaf sheaths and midribs",
            ],
            "immediate_actions": [
                "Drain water 2-3 cm to expose base, delay reproduction",
                "Spray imidacloprid or dinotefuran early if nymphs >10/hill",
                "Avoid pyrethroids and synthetic insecticides that kill natural enemies",
                "Release egg parasitoid Anagrus nilaparvatae where available",
            ],
            "prevention": [
                "Plant resistant rice varieties carrying Bph genes (Bph32, etc.)",
                "Use wider spacing and avoid over-dense seeding",
                "Split N fertilizer into multiple light applications",
                "Conserve mirid bug (Cyrtorhinus) and spiders through IPM",
            ],
            "environmental_factors": [
                "Thrives in high temperature 26-32°C (79-90°F) with >80% RH",
                "Closed canopy with high humidity favors build-up",
                "Continuous submerged irrigation plus excess N is ideal",
                "Long-winged macropters colonize new fields via monsoon winds",
            ],
        },
    ],
}

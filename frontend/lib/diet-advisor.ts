import type { HealthRecord, Lang, Profile } from "./types";
import { isOut, latestTests } from "./clinical";

export type DietIconName =
  | "plant"
  | "drop"
  | "bowl"
  | "grain"
  | "cooking"
  | "sparkle"
  | "heart"
  | "scales"
  | "salad"
  | "coffee"
  | "prohibit";

export type MealTimeSlot = "morning" | "breakfast" | "lunch" | "snack" | "dinner" | "bedtime";

export type FoodRecommendation = {
  id: string;
  name: { en: string; hi: string; te: string };
  reason: { en: string; hi: string; te: string };
  howToTake: { en: string; hi: string; te: string };
  category: "grain" | "superfood" | "vegetable" | "drink" | "protein";
  badge: { en: string; hi: string; te: string };
  iconName: DietIconName;
  emoji: string;
  mealTime: MealTimeSlot;
  portion: { en: string; hi: string; te: string };
  biomarker: { en: string; hi: string; te: string };
  tags: { en: string; hi: string; te: string }[];
  glycemicImpact?: "very-low" | "low" | "medium";
};

export type FoodRestriction = {
  id: string;
  name: { en: string; hi: string; te: string };
  risk: { en: string; hi: string; te: string };
  swapFor: { en: string; hi: string; te: string };
  swapReason: { en: string; hi: string; te: string };
  iconName: DietIconName;
  swapIconName: DietIconName;
  emoji: string;
  avoidReasonBadge: { en: string; hi: string; te: string };
  swapAdvantageBadge: { en: string; hi: string; te: string };
  biomarker: { en: string; hi: string; te: string };
};

export type LifestyleHabit = {
  id: string;
  title: { en: string; hi: string; te: string };
  desc: { en: string; hi: string; te: string };
  iconName: "walk" | "water" | "mind" | "sleep" | "sun";
  badge: { en: string; hi: string; te: string };
  timing: { en: string; hi: string; te: string };
  evidence: { en: string; hi: string; te: string };
};

export type PatientDietPlan = {
  focusTitle: { en: string; hi: string; te: string };
  focusSubtitle: { en: string; hi: string; te: string };
  triggeredBy: { en: string; hi: string; te: string }[];
  eat: FoodRecommendation[];
  avoid: FoodRestriction[];
  habits: LifestyleHabit[];
};

/**
 * Analyzes patient diagnoses and out-of-range lab reports to synthesize an evidence-based
 * Indian dietary and lifestyle plan tailored specifically to their clinical flags.
 */
export function generateDietPlan(records: HealthRecord[], profile: Profile): PatientDietPlan {
  const own = records.filter((r) => r.name_check !== "mismatch");
  const conditions = own.flatMap((r) => r.extracted.diagnoses.map((d) => d.toLowerCase()));
  const allTests = latestTests(own);
  const outTests = allTests.filter(({ o }) => isOut(o.flag));

  // Diagnostic flags
  const isDiabetic =
    conditions.some((c) => c.includes("diabet") || c.includes("sugar") || c.includes("dm2") || c.includes("t2d")) ||
    outTests.some(
      ({ o }) =>
        (o.test_name.toLowerCase().includes("hba1c") ||
          o.test_name.toLowerCase().includes("glucose") ||
          o.test_name.toLowerCase().includes("sugar")) &&
        o.flag === "HIGH"
    );

  const isAnemic =
    conditions.some((c) => c.includes("anaemia") || c.includes("anemia") || c.includes("iron")) ||
    outTests.some(
      ({ o }) =>
        (o.test_name.toLowerCase().includes("hgb") ||
          o.test_name.toLowerCase().includes("hemoglobin") ||
          o.test_name.toLowerCase().includes("rbc")) &&
        o.flag === "LOW"
    );

  const isCardiacOrHypertensive =
    conditions.some(
      (c) =>
        c.includes("hypertens") ||
        c.includes("bp") ||
        c.includes("cardiac") ||
        c.includes("heart") ||
        c.includes("infarct") ||
        c.includes("stent") ||
        c.includes("lipid") ||
        c.includes("cholesterol")
    ) ||
    outTests.some(
      ({ o }) =>
        o.test_name.toLowerCase().includes("cholesterol") ||
        o.test_name.toLowerCase().includes("triglyceride") ||
        o.test_name.toLowerCase().includes("ldl")
    );

  const isLiverOrInfection =
    conditions.some((c) => c.includes("liver") || c.includes("hepat") || c.includes("jaundice")) ||
    outTests.some(
      ({ o }) =>
        (o.test_name.toLowerCase().includes("sgpt") ||
          o.test_name.toLowerCase().includes("sgot") ||
          o.test_name.toLowerCase().includes("bilirubin") ||
          o.test_name.toLowerCase().includes("esr") ||
          o.test_name.toLowerCase().includes("wbc")) &&
        o.flag === "HIGH"
    );

  const triggeredBy: { en: string; hi: string; te: string }[] = [];
  const eat: FoodRecommendation[] = [];
  const avoid: FoodRestriction[] = [];
  const habits: LifestyleHabit[] = [];

  // 1. DIABETES / BLOOD SUGAR
  if (isDiabetic) {
    triggeredBy.push({
      en: "Elevated Blood Glucose / HbA1c",
      hi: "बढ़ा हुआ ब्लड शुगर / HbA1c",
      te: "అధిక రక్తంలో చక్కెర / HbA1c",
    });

    eat.push({
      id: "methi-seeds",
      iconName: "plant",
      emoji: "🌱",
      name: {
        en: "Methi (Fenugreek) Seeds",
        hi: "मेथी दाना (Fenugreek)",
        te: "మెంతులు (Fenugreek Seeds)",
      },
      reason: {
        en: "Galactomannan soluble fiber slows carbohydrate absorption and cuts post-meal glucose spikes.",
        hi: "मेथी में घुलनशील फाइबर होता है जो ग्लूकोज अवशोषण को धीमा कर शुगर स्पाइक रोकता है।",
        te: "మెంతులలోని ఫైబర్ కార్బోహైడ్రేట్ జీర్ణక్రియను నెమ్మదింపజేసి షుగర్ పెరగకుండా నియంత్రిస్తుంది.",
      },
      howToTake: {
        en: "Soak 1 tsp in warm water overnight; drink the water and chew seeds first thing in the morning. Can add to sugar-lowering medicines; watch for low sugar.",
        hi: "रात को 1 चम्मच मेथी दाना गुनगुने पानी में भिगोएं, सुबह खाली पेट पानी पिएं और दाने चबाएं। शुगर की दवाओं का असर बढ़ा सकता है; शुगर ज़्यादा कम होने पर ध्यान दें।",
        te: "రాత్రి 1 స్పూన్ మెంతులను నీటిలో నానబెట్టి, ఉదయం ఖాళీ కడుపుతో ఆ నీటిని తాగి గింజలను నమలండి. షుగర్ మందుల ప్రభావాన్ని పెంచవచ్చు; షుగర్ మరీ తగ్గకుండా జాగ్రత్త.",
      },
      category: "superfood",
      badge: { en: "Fibre for sugar", hi: "शुगर के लिए फाइबर", te: "షుగర్‌కు ఫైబర్" },
      mealTime: "morning",
      portion: { en: "1 tsp soaked", hi: "1 चम्मच भिगोया हुआ", te: "1 చెంచా నానబెట్టినవి" },
      biomarker: { en: "HbA1c & Fasting Sugar", hi: "HbA1c व खाली पेट शुगर", te: "HbA1c & ఫాస్టింగ్ షుగర్" },
      tags: [
        { en: "Soluble Fiber", hi: "घुलनशील फाइबर", te: "సాల్యుబుల్ ఫైబర్" },
        { en: "Low GI", hi: "कम जीआई", te: "తక్కువ GI" },
        { en: "Insulin Sensitizer", hi: "इंसुलिन सक्रियक", te: "ఇన్సులిన్ సెన్సిటైజర్" },
      ],
      glycemicImpact: "very-low",
    });

    eat.push({
      id: "millet-rotis",
      iconName: "grain",
      emoji: "🌾",
      name: {
        en: "Millet Rotis (Bajra / Jowar / Ragi)",
        hi: "बाजरा या ज्वार की रोटी",
        te: "సజ్జలు లేదా జొన్న రొట్టెలు",
      },
      reason: {
        en: "Low glycemic index with high dietary fiber prevents insulin surges compared to polished white rice.",
        hi: "कम ग्लाइसेमिक इंडेक्स और फाइबर से भरपूर, जो सफेद चावल की तुलना में शुगर नहीं बढ़ने देता।",
        te: "తక్కువ గ్లైసెమిక్ ఇండెక్స్ మరియు ఎక్కువ పీచు పదార్థం రక్తంలో గ్లూకోజ్ నిలకడగా ఉంచుతుంది.",
      },
      howToTake: {
        en: "Substitute lunch or dinner rice with 1-2 freshly made bajra or jowar rotis with green leafy vegetables.",
        hi: "दोपहर या रात के खाने में सफेद चावल की जगह 1-2 ताजी बाजरा या ज्वार की रोटी खाएं।",
        te: "మధ్యాహ్నం లేదా రాత్రి భోజనంలో తెల్ల అన్నానికి బదులుగా 1-2 సజ్జ లేదా జొన్న రొట్టెలు తినండి.",
      },
      category: "grain",
      badge: { en: "Low GI Carbohydrate", hi: "कम जीआई अनाज", te: "తక్కువ జీఐ ఆహారం" },
      mealTime: "lunch",
      portion: { en: "1-2 medium rotis", hi: "1-2 मध्यम रोटियां", te: "1-2 మధ్యస్థ రొట్టెలు" },
      biomarker: { en: "Postprandial Glucose", hi: "भोजन पश्चात शुगर", te: "భోజనం తర్వాత షుగర్" },
      tags: [
        { en: "Slow Release Energy", hi: "धीमी ऊर्जा", te: "స్థిరమైన శక్తి" },
        { en: "Complex Carbs", hi: "कॉम्प्लेक्स कार्ब्स", te: "కాంప్లెక్స్ కార్బ్స్" },
        { en: "High Magnesium", hi: "मैग्नीशियम युक्त", te: "మెగ్నీషియం సమృద్ధి" },
      ],
      glycemicImpact: "low",
    });

    eat.push({
      id: "karela-jamun",
      iconName: "salad",
      emoji: "🥒",
      name: {
        en: "Karela (Bitter Gourd) & Jamun",
        hi: "करेला और जामुन",
        te: "కాకరకాయ & నేరేడు పండ్లు",
      },
      reason: {
        en: "Contains polypeptide-p and charantin, which may help lower blood sugar.",
        hi: "इसमें पॉलीपेप्टाइड-पी और चैरेंटिन होते हैं जो शुगर कम करने में मदद कर सकते हैं।",
        te: "ఇందులో పాలీపెప్టైడ్-పి ఉంటుంది, ఇది గ్లూకోజ్ తగ్గడానికి సహాయపడవచ్చు.",
      },
      howToTake: {
        en: "Include steamed karela sabzi twice weekly, or have 25ml unsweetened jamun juice before breakfast. Can add to sugar-lowering medicines; watch for low sugar.",
        hi: "हफ्ते में दो बार कम तेल में पकी करेले की सब्जी खाएं या नाश्ते से पहले 25ml जामुन का रस लें। शुगर की दवाओं का असर बढ़ा सकता है; शुगर ज़्यादा कम होने पर ध्यान दें।",
        te: "వారానికి రెండుసార్లు కాకరకాయ కూర తినండి లేదా అల్పాహారానికి ముందు 25ml నేరేడు రసం తీసుకోండి. షుగర్ మందుల ప్రభావాన్ని పెంచవచ్చు; షుగర్ మరీ తగ్గకుండా జాగ్రత్త.",
      },
      category: "vegetable",
      badge: { en: "May lower sugar", hi: "शुगर घटा सकता है", te: "షుగర్ తగ్గించవచ్చు" },
      mealTime: "breakfast",
      portion: { en: "1 small cup / 25ml", hi: "1 छोटी कटोरी / 25ml", te: "1 చిన్న కప్పు / 25ml" },
      biomarker: { en: "Insulin Resistance", hi: "इंसुलिन प्रतिरोध", te: "ఇన్సులిన్ రెసిస్టెన్స్" },
      tags: [
        { en: "Polypeptide-P", hi: "पॉलीपेप्टाइड-पी", te: "పాలీపెప్టైడ్-పి" },
        { en: "Pancreatic Beta Cells", hi: "बीटा सेल सपोर्ट", te: "బీటా కణాల రక్షణ" },
      ],
      glycemicImpact: "very-low",
    });

    avoid.push({
      id: "white-rice-maida",
      iconName: "prohibit",
      swapIconName: "grain",
      emoji: "🍚",
      name: {
        en: "Polished White Rice & Maida",
        hi: "सफेद पॉलिश चावल और मैदा",
        te: "తెల్ల పాలిష్ బియ్యం & మైదా",
      },
      risk: {
        en: "High GI triggers rapid blood glucose surges, spike insulin, and elevates visceral fat storage.",
        hi: "उच्च जीआई खून में तेजी से शुगर बढ़ाता है और शरीर में चर्बी जमा करता है।",
        te: "అధిక గ్లైసెమిక్ ఇండెక్స్ వల్ల తిన్న వెంటనే రక్తంలో చక్కెర తీవ్రంగా పెరుగుతుంది.",
      },
      swapFor: {
        en: "Foxtail Millet (Korra) or Hand-Pounded Brown Rice",
        hi: "कंगनी (फॉक्सटेल मिलेट) या हाथ से कुटा भूरा चावल",
        te: "కొర్రలు లేదా దంపుడు బ్రౌన్ రైస్",
      },
      swapReason: {
        en: "More fibre, which slows digestion and softens the rise in sugar after meals.",
        hi: "इसमें ज़्यादा फाइबर होता है जो खाने के बाद शुगर का बढ़ना धीमा करता है।",
        te: "ఎక్కువ ఫైబర్ ఉండటం వల్ల భోజనం తర్వాత షుగర్ నెమ్మదిగా పెరుగుతుంది.",
      },
      avoidReasonBadge: { en: "High Glycemic Load", hi: "उच्च ग्लाइसेमिक लोड", te: "అధిక గ్లైసెమిక్ లోడ్" },
      swapAdvantageBadge: { en: "Slower sugar rise", hi: "शुगर धीरे बढ़ती है", te: "షుగర్ నెమ్మదిగా పెరుగుతుంది" },
      biomarker: { en: "Blood Glucose Spikes", hi: "ब्लड शुगर स्पाइक्स", te: "బ్లడ్ షుగర్ స్పైక్స్" },
    });

    avoid.push({
      id: "packaged-juices",
      iconName: "prohibit",
      swapIconName: "drop",
      emoji: "🥤",
      name: {
        en: "Packaged Fruit Juices & Colas",
        hi: "पैकेटबंद फलों का रस और मीठे पेय",
        te: "ప్యాక్ చేసిన పండ్ల రసాలు & తీపి పానీయాలు",
      },
      risk: {
        en: "Liquid sugars lack protective dietary fiber and instantly overload hepatic portal circulation.",
        hi: "तरल शुगर बिना फाइबर के सीधे लिवर पर दबाव डालती है और शुगर को बेकाबू करती है।",
        te: "పీచు పదార్థం లేని రసాలు త్వరగా రక్తంలో కలిసి లివర్‌పై భారం వేస్తాయి.",
      },
      swapFor: {
        en: "Whole Green Guava or Fresh Lemon Chia Water",
        hi: "साबुत हरा अमरूद या नींबू चिया बीज पानी",
        te: "తాజా జామకాయ లేదా నిమ్మ చియా సీడ్స్ నీరు",
      },
      swapReason: {
        en: "Intact fiber matrix delivers sustained vitamins without insulin spikes.",
        hi: "प्राकृतिक फाइबर शुगर बढ़ाए बिना विटामिन और तृप्ति प्रदान करता है।",
        te: "సహజ పీచు పదార్థం రక్తంలో చక్కెరను పెంచకుండా శక్తినిస్తుంది.",
      },
      avoidReasonBadge: { en: "Liquid Fructose Load", hi: "तरल फ्रुक्टोज भार", te: "లిక్విడ్ ఫ్రక్టోజ్ భారం" },
      swapAdvantageBadge: { en: "Pectin-Rich Fiber", hi: "पेक्टिन फाइबर युक्त", te: "పెక్టిన్ ఫైబర్ సమృద్ధి" },
      biomarker: { en: "Insulin & Fatty Liver", hi: "इंसुलिन व फैटी लिवर", te: "ఇన్సులిన్ & ఫ్యాటీ లివర్" },
    });
  }

  // 2. ANEMIA / LOW HEMOGLOBIN
  if (isAnemic) {
    triggeredBy.push({
      en: "Low Hemoglobin / Iron Deficiency",
      hi: "कम हीमोग्लोबिन / खून की कमी",
      te: "తక్కువ హీమోగ్లోబిన్ / రక్తహీనత",
    });

    eat.push({
      id: "moringa-palak",
      iconName: "plant",
      emoji: "🥗",
      name: {
        en: "Moringa (Drumstick Leaves) & Palak",
        hi: "सहजन (मुनगा) की पत्तियां और पालक",
        te: "మునగాకు & పాలకూర (Moringa & Spinach)",
      },
      reason: {
        en: "Highest bioavailable plant iron and folate required for rapid synthesis of red blood cells.",
        hi: "प्राकृतिक आयरन और फोलेट का उत्तम स्रोत, जो नए लाल रक्त कण बनाने में सीधे मदद करता है।",
        te: "మునగాకు మరియు పాలకూరలో సహజమైన ఐరన్, ఫోలేట్ అధికంగా ఉండి ఎర్ర రక్తకణాలను పెంచుతాయి.",
      },
      howToTake: {
        en: "Cook drumstick leaves with toor dal or sauté palak with garlic. Squeeze half a lemon for Vitamin C iron absorption.",
        hi: "मुनगा पत्तियों को दाल में पकाएं या पालक में थोड़ा नींबू का रस डालकर खाएं।",
        te: "మునగాకు పప్పు లేదా వెల్లుల్లితో వేయించిన పాలకూర తినండి; ఐరన్ గ్రహించడానికి నిమ్మరసం పిండండి.",
      },
      category: "vegetable",
      badge: { en: "Iron & Folate Powerhouse", hi: "आयरन का उत्तम स्रोत", te: "ఐరన్ సమృద్ధి" },
      mealTime: "lunch",
      portion: { en: "1 medium katori", hi: "1 मध्यम कटोरी", te: "1 మధ్యస్థ కప్పు" },
      biomarker: { en: "Hemoglobin (Hb) & RBC", hi: "हीमोग्लोबिन व आरबीसी", te: "హీమోగ్లోబిన్ & RBC" },
      tags: [
        { en: "Non-Heme Iron", hi: "प्राकृतिक आयरन", te: "సహజ ఐరన్" },
        { en: "Folate B9", hi: "फोलेट B9", te: "ఫోలేట్ B9" },
        { en: "Bioavailable", hi: "आसानी से अवशोषित", te: "త్వరగా గ్రహించబడుతుంది" },
      ],
      glycemicImpact: "very-low",
    });

    eat.push({
      id: "beetroot-anar",
      iconName: "salad",
      emoji: "🍎",
      name: {
        en: "Beetroot & Fresh Pomegranate (Anar)",
        hi: "चुकंदर और ताजा अनार",
        te: "బీట్‌రూట్ & దానిమ్మ పండు",
      },
      reason: {
        en: "Packed with active nitrates, ascorbic acid, and copper to enhance cellular hemoglobin synthesis.",
        hi: "नाइट्रेट और विटामिन सी से भरपूर जो खून की गुणवत्ता और ऑक्सीजन क्षमता सुधारते हैं।",
        te: "రక్త ప్రసరణను మెరుగుపరిచే నైట్రేట్స్ మరియు ఐరన్‌తో రక్తంలో ఆక్సిజన్ మోసే సామర్థ్యాన్ని పెంచుతుంది.",
      },
      howToTake: {
        en: "Eat 1 small bowl of grated beetroot salad or 1 fresh bowl of pomegranate arils as a snack, mid-morning or evening.",
        hi: "नाश्ते के रूप में, दोपहर से पहले या शाम को, 1 कटोरी कद्दूकस चुकंदर का सलाद या ताजा अनार के दाने खाएं।",
        te: "ఉదయం 11 గంటలకు లేదా సాయంత్రం తాజా దానిమ్మ గింజలు లేదా బీట్‌రూట్ సలాడ్ తీసుకోండి.",
      },
      category: "superfood",
      badge: { en: "Cellular Oxygenator", hi: "रक्तवर्धक", te: "రక్తవృద్ధి కారకం" },
      mealTime: "snack",
      portion: { en: "1 small bowl (100g)", hi: "1 छोटी कटोरी (100g)", te: "1 చిన్న కప్పు (100g)" },
      biomarker: { en: "Red Cell Count & Ferritin", hi: "आरबीसी व फेरिटिन", te: "ఎర్ర రక్తకణాలు & ఫెర్రిటిన్" },
      tags: [
        { en: "Natural Nitrates", hi: "प्राकृतिक नाइट्रेट", te: "సహజ నైట్రేట్స్" },
        { en: "Vitamin C Co-factor", hi: "विटामिन सी को-फैक्टर", te: "విటమిన్ సి సహకారం" },
      ],
      glycemicImpact: "low",
    });

    avoid.push({
      id: "tea-coffee-post-meals",
      iconName: "coffee",
      swapIconName: "drop",
      emoji: "☕",
      name: {
        en: "Chai or Coffee Immediately After Meals",
        hi: "खाने के तुरंत बाद चाय या कॉफी",
        te: "భోజనం చేసిన వెంటనే టీ లేదా కాఫీ",
      },
      risk: {
        en: "Tannins in tea and coffee bind iron from food and reduce how much the body absorbs.",
        hi: "चाय-कॉफी के टैनिन भोजन के आयरन को शरीर में सोखने से रोकते हैं।",
        te: "టీ, కాఫీలోని టానిన్లు ఆహారంలోని ఐరన్ ఒంటికి పట్టకుండా అడ్డుకుంటాయి.",
      },
      swapFor: {
        en: "Warm Lemon Water or Spiced Fennel (Saunf) Infusion",
        hi: "गुनगुना नींबू पानी या सौंफ का पानी",
        te: "గోరువెచ్చని నిమ్మ నీరు లేదా సోంపు నీరు",
      },
      swapReason: {
        en: "Vitamin C acidifies stomach pH to boost iron absorption while promoting gentle digestion.",
        hi: "विटामिन सी पेट में आयरन को सोखने में मदद करता है और गैस रोकता है।",
        te: "విటమిన్ సి ఆహారంలోని ఐరన్‌ను శరీరం గ్రహించేలా తోడ్పడుతుంది.",
      },
      avoidReasonBadge: { en: "Iron Tannin Blockade", hi: "आयरन अवशोषण में बाधा", te: "ఐరన్ శోషణకు అడ్డంకి" },
      swapAdvantageBadge: { en: "Better iron uptake", hi: "बेहतर आयरन अवशोषण", te: "మెరుగైన ఐరన్ గ్రహింపు" },
      biomarker: { en: "Serum Ferritin Stores", hi: "सीरम फेरिटिन स्तर", te: "సీరం ఫెర్రిటిన్ నిల్వలు" },
    });
  }

  // 3. CARDIAC / HYPERTENSION / CHOLESTEROL
  if (isCardiacOrHypertensive) {
    triggeredBy.push({
      en: "Hypertension / Cardiac Risk / Lipids",
      hi: "रक्तचाप (BP) / हृदय सुरक्षा / कोलेस्ट्रॉल",
      te: "రక్తపోటు (BP) / గుండె ఆరోగ్యం / కొలెస్ట్రాల్",
    });

    eat.push({
      id: "garlic-clove",
      iconName: "cooking",
      emoji: "🧄",
      name: {
        en: "Raw Crushed Garlic (Lahsun / Vellulli)",
        hi: "कच्चा लहसुन (Lahsun)",
        te: "పచ్చి వెల్లుల్లి (Garlic)",
      },
      reason: {
        en: "Allicin may help relax blood vessels and modestly support blood pressure control.",
        hi: "एलिसिन धमनियों को शिथिल करता है जिससे रक्तचाप नियंत्रित होता है और नसों में रुकावट कम होती है।",
        te: "వెల్లుల్లిలోని అల్లిసిన్ రక్తనాళాలను రిలాక్స్ చేసి బీపీని మరియు కొలెస్ట్రాల్‌ను తగ్గిస్తుంది.",
      },
      howToTake: {
        en: "Crush 1 small garlic clove, wait 5 minutes to activate allicin, swallow with warm water in the morning. Check with your doctor if you take blood thinners.",
        hi: "1 छोटी कली लहसुन कुचलकर 5 मिनट रखें, फिर सुबह गुनगुने पानी के साथ निगल लें। खून पतला करने की दवा लेते हों तो डॉक्टर से पूछें।",
        te: "ఒక వెల్లుల్లి రెబ్బను నలిపి 5 నిమిషాల తర్వాత ఉదయం గోరువెచ్చని నీటితో తీసుకోండి. రక్తం పలుచబరిచే మందులు వాడుతుంటే డాక్టర్‌ను అడగండి.",
      },
      category: "superfood",
      badge: { en: "BP support", hi: "बीपी में सहायक", te: "బీపీకి సహాయం" },
      mealTime: "morning",
      portion: { en: "1 crushed clove", hi: "1 कुचली हुई कली", te: "1 నలిపిన రెబ్బ" },
      biomarker: { en: "Systolic BP & Arterial Tone", hi: "सिस्टोलिक बीपी व धमनियां", te: "సిస్టోలిక్ బీపీ & రక్తనాళాలు" },
      tags: [
        { en: "Active Allicin", hi: "सक्रिय एलिसिन", te: "యాక్టివ్ అల్లిసిన్" },
        { en: "Nitric Oxide Booster", hi: "नाइट्रिक ऑक्साइड बूस्टर", te: "నైట్రిక్ ఆక్సైడ్ బూస్టర్" },
      ],
      glycemicImpact: "very-low",
    });

    eat.push({
      id: "flaxseeds",
      iconName: "sparkle",
      emoji: "🌰",
      name: {
        en: "Roasted Flaxseeds (Alsi / Avisa Ginjalu)",
        hi: "भुनी हुई अलसी (Flaxseeds)",
        te: "వేయించిన అవిస గింజలు (Flaxseeds)",
      },
      reason: {
        en: "Highest plant-based Omega-3 (ALA) and lignans to reduce vascular inflammation and LDL oxidation.",
        hi: "ओमेगा-3 फैटी एसिड और लिग्नान से भरपूर, जो नसों में सूजन और खराब कोलेस्ट्रॉल घटाते हैं।",
        te: "ఒమేగా-3 మరియు లిగ్నన్స్ గుండె ధమనులలో కొవ్వు పేరుకుపోకుండా కాపాడతాయి.",
      },
      howToTake: {
        en: "Grind roasted flaxseeds and sprinkle 1 tablespoon over daily curd, dal, or warm water.",
        hi: "1 चम्मच भुनी अलसी का चूर्ण दही, दाल या गुनगुने पानी में मिलाकर रोजाना लें।",
        te: "రోజూ 1 చెంచా అవిస గింజల పొడిని పెరుగులో లేదా పప్పులో కలుపుకుని తినండి.",
      },
      category: "superfood",
      badge: { en: "Heart-Protective Omega-3", hi: "हृदय-सुरक्षा ओमेगा-3", te: "ఒమేగా-3 గుండె రక్షకం" },
      mealTime: "breakfast",
      portion: { en: "1 tablespoon (10g)", hi: "1 बड़ा चम्मच (10g)", te: "1 పెద్ద చెంచా (10g)" },
      biomarker: { en: "Serum LDL & Triglycerides", hi: "एलडीएल व ट्राइग्लिसराइड", te: "LDL కొలెస్ట్రాల్ & ట్రైగ్లిజరైడ్స్" },
      tags: [
        { en: "Alpha-Linolenic Acid", hi: "ओमेगा-3 (ALA)", te: "ఒమేగా-3 (ALA)" },
        { en: "Cardio-Protective", hi: "हृदय रक्षक", te: "గుండె రక్షణ" },
      ],
      glycemicImpact: "very-low",
    });

    avoid.push({
      id: "pickles-papad",
      iconName: "prohibit",
      swapIconName: "salad",
      emoji: "🧂",
      name: {
        en: "Pickles (Achar), Papad & Added Salt",
        hi: "अचार, पापड़ और अतिरिक्त नमक",
        te: "ఊరగాయలు (Achar), అప్పడాలు & అధిక ఉప్పు",
      },
      risk: {
        en: "Excess sodium causes immediate intravascular fluid retention, straining arteries and kidneys.",
        hi: "अत्यधिक सोडियम शरीर में पानी रोकता है जिससे रक्तचाप तुरंत बढ़ जाता है और हृदय पर दबाव पड़ता है।",
        te: "అధిక ఉప్పు వల్ల రక్తనాళాలపై ఒత్తిడి పెరిగి బీపీ తీవ్రమవుతుంది.",
      },
      swapFor: {
        en: "Fresh Lemon Juice, Roasted Cumin & Pinch of Rock Salt",
        hi: "नींबू का रस, भुना जीरा और सीमित मात्रा में सेंधा नमक",
        te: "నిమ్మరసం, వేయించిన జీలకర్ర పొడి మరియు కొద్దిగా సైంధవ లవణం",
      },
      swapReason: {
        en: "Keeps the taste while cutting down on daily salt.",
        hi: "स्वाद बनाए रखते हुए रोज़ का नमक कम करता है।",
        te: "రుచిని ఇస్తూనే రోజువారీ ఉప్పును తగ్గిస్తుంది.",
      },
      avoidReasonBadge: { en: "High Sodium Load", hi: "अत्यधिक सोडियम", te: "అధిక సోడియం" },
      swapAdvantageBadge: { en: "DASH Compliant", hi: "DASH डाइट आधारित", te: "DASH ఆహార నియమం" },
      biomarker: { en: "Blood Pressure & Fluid Balance", hi: "रक्तचाप व तरल संतुलन", te: "రక్తపోటు & నీటి సమతుల్యత" },
    });
  }

  // 4. LIVER / INFLAMMATION. No generic filler: with nothing on file the guide asks for a record instead.
  if (isLiverOrInfection) {
    if (triggeredBy.length === 0) {
      triggeredBy.push({
        en: "Inflammation or liver markers",
        hi: "सूजन या लिवर के संकेत",
        te: "వాపు లేదా లివర్ సూచికలు",
      });
    }

    eat.push({
      id: "fresh-amla-haldi",
      iconName: "plant",
      emoji: "🍋",
      name: {
        en: "Fresh Amla (Gooseberry) & Haldi",
        hi: "ताजा आंवला और कच्ची हल्दी",
        te: "తాజా ఉసిరికాయ (Amla) & పసుపు",
      },
      reason: {
        en: "A source of vitamin C and curcumin, part of a balanced diet during recovery.",
        hi: "विटामिन सी और करक्यूमिन से भरपूर जो सूजन घटाते हैं और लिवर को विषाक्त पदार्थों से बचाते हैं।",
        te: "విటమిన్ సి మరియు కర్కుమిన్ ఇన్ఫెక్షన్లను తగ్గించి లివర్ పనితీరును మెరుగుపరుస్తాయి.",
      },
      howToTake: {
        en: "Have 1 fresh amla with a pinch of rock salt daily, or take a pinch of pure turmeric in warm water.",
        hi: "रोजाना 1 ताजा आंवला खाएं या गुनगुने पानी में चुटकी भर हल्दी मिलाकर लें।",
        te: "రోజూ 1 తాజా ఉసిరికాయ తినండి లేదా గోరువెచ్చని నీటిలో కొద్దిగా పసుపు కలుపుకుని తాగండి.",
      },
      category: "superfood",
      badge: { en: "Antioxidant Shield", hi: "एंटीऑक्सीडेंट कवच", te: "యాంటీఆక్సిడెంట్ రక్షణ" },
      mealTime: "morning",
      portion: { en: "1 fresh amla / 1 pinch haldi", hi: "1 आंवला / चुटकी हल्दी", te: "1 ఉసిరికాయ / చిటికెడు పసుపు" },
      biomarker: { en: "Cellular Immunity & Liver Enzymes", hi: "इम्यूनिटी व लिवर एंजाइम", te: "రోగనిరోధక శక్తి & లివర్ ఎంజైమ్‌లు" },
      tags: [
        { en: "Vitamin C", hi: "विटामिन सी", te: "విటమిన్ సి" },
        { en: "Curcumin", hi: "करक्यूमिन", te: "కర్కుమిన్" },
        { en: "Hepatoprotective", hi: "लिवर रक्षक", te: "లివర్ రక్షణ" },
      ],
      glycemicImpact: "very-low",
    });

    eat.push({
      id: "spiced-buttermilk",
      iconName: "drop",
      emoji: "🥛",
      name: {
        en: "Fresh Spiced Buttermilk (Chaas / Majjiga)",
        hi: "ताजा छाछ (भुना जीरा और करी पत्ता)",
        te: "తాజా మజ్జిగ (జీలకర్ర & కరివేపాకు)",
      },
      reason: {
        en: "Supplies natural live probiotics (Lactobacillus) to strengthen gut barrier and optimize nutrient absorption.",
        hi: "प्राकृतिक प्रोबायोटिक्स आंतों के स्वास्थ्य को सुधारते हैं और भोजन को आसानी से पचाते हैं।",
        te: "సహజ ప్రోబయోటిక్స్ కడుపులోని మంచి బ్యాక్టీరియాను పెంచి జీర్ణశక్తిని పెంచుతాయి.",
      },
      howToTake: {
        en: "Drink 1 glass after lunch seasoned with crushed curry leaves, ginger, and roasted cumin.",
        hi: "दोपहर के भोजन के बाद 1 गिलास छाछ में भुना जीरा, अदरक और करी पत्ता मिलाकर पिएं।",
        te: "మధ్యాహ్న భోజనం తర్వాత 1 గ్లాసు మజ్జిగలో జీలకర్ర, అల్లం, కరివేపాకు వేసుకుని తాగండి.",
      },
      category: "drink",
      badge: { en: "Gut Probiotic", hi: "पाचन प्रोबायोटिक", te: "జీర్ణ ప్రోబయోటిక్" },
      mealTime: "lunch",
      portion: { en: "1 glass (200ml)", hi: "1 गिलास (200ml)", te: "1 గ్లాసు (200ml)" },
      biomarker: { en: "Gut Microbiome & Digestion", hi: "आंतों का स्वास्थ्य", te: "జీర్ణవ్యవస్థ ఆరోగ్యం" },
      tags: [
        { en: "Live Lactobacillus", hi: "लाइव प्रोबायोटिक", te: "లైవ్ ప్రోబయోటిక్" },
        { en: "Digestive Carminative", hi: "पाचन सहायक", te: "జీర్ణక్రియకు తోడ్పడుతుంది" },
      ],
      glycemicImpact: "very-low",
    });

    eat.push({
      id: "moong-khichdi",
      iconName: "bowl",
      emoji: "🍲",
      name: {
        en: "Moong Dal & Vegetable Khichdi",
        hi: "मूंग दाल और सब्जियों की खिचड़ी",
        te: "పెసరపప్పు & కూరగాయల కిచిడీ",
      },
      reason: {
        en: "Easily assimilated plant proteins and complex fibers that nourish without metabolic burden.",
        hi: "हल्का व सुपाच्य प्रोटीन जो पाचन तंत्र पर बोझ डाले बिना शरीर को ऊर्जा प्रदान करता है।",
        te: "సులువుగా జీర్ణమయ్యే ప్రొటీన్ మరియు పీచు పదార్థం శరీరానికి తక్షణ శక్తినిస్తాయి.",
      },
      howToTake: {
        en: "Have as a light dinner with homemade mint-coriander chutney.",
        hi: "रात के भोजन में पुदीने की चटनी के साथ हल्का सेवन करें।",
        te: "రాత్రి భోజనంలో పుదీనా పచ్చడితో తేలికగా తినండి.",
      },
      category: "grain",
      badge: { en: "Digestive Harmony", hi: "सुपाच्य आहार", te: "సులభ జీర్ణక్రియ" },
      mealTime: "dinner",
      portion: { en: "1 medium plate", hi: "1 मध्यम प्लेट", te: "1 ప్లేటు" },
      biomarker: { en: "Metabolic Rest & Sleep Prep", hi: "पाचन विश्राम", te: "జీర్ణ విశ్రాంతి" },
      tags: [
        { en: "Easily Digestible", hi: "सुपाच्य प्रोटीन", te: "సులువుగా జీర్ణమవుతుంది" },
      ],
      glycemicImpact: "low",
    });

    if (avoid.length === 0) {
      avoid.push({
        id: "late-night-dinner",
        iconName: "prohibit",
        swapIconName: "bowl",
        emoji: "🌙",
        name: {
          en: "Late-Night Heavy Dinners After 9 PM",
          hi: "रात 9 बजे के बाद भारी भोजन",
          te: "రాత్రి 9 గంటల తర్వాత భారీ భోజనం",
        },
        risk: {
          en: "Disrupts circadian metabolic rhythm, leading to acid reflux, poor deep sleep, and morning insulin resistance.",
          hi: "देर रात का भारी खाना नींद खराब करता है और सुबह ब्लड शुगर का स्तर बढ़ा देता है।",
          te: "రాత్రి ఆలస్యంగా తినడం వల్ల నిద్రభంగం, ఎసిడిటీ మరియు ఉదయానికి షుగర్ లెవెల్స్ పెరుగుతాయి.",
        },
        swapFor: {
          en: "Light Dinner Before 8 PM (Moong Khichdi or Steamed Idlis)",
          hi: "रात 8 बजे से पहले हल्का भोजन (मूंग खिचड़ी या इडली)",
          te: "రాత్రి 8 లోపు తేలికపాటి భోజనం (పెసర కిచిడీ లేదా ఇడ్లీ)",
        },
        swapReason: {
          en: "Allows complete gastric emptying before sleep, stabilizing fasting glucose.",
          hi: "सोने से पहले खाना पचने से सुबह की शुगर नियंत्रित रहती है।",
          te: "నిద్రకు ముందే జీర్ణక్రియ పూర్తయి ఉదయం షుగర్ అదుపులో ఉంటుంది.",
        },
        avoidReasonBadge: { en: "Circadian Mismatch", hi: "नींद व पाचन में बाधा", te: "నిద్రకు అంతరాయం" },
        swapAdvantageBadge: { en: "Restful Digestion", hi: "गहरी नींद व पाचन", te: "హాయిగా జీర్ణక్రియ" },
        biomarker: { en: "Fasting Glucose & Sleep Quality", hi: "खाली पेट शुगर व नींद", te: "ఫాస్టింగ్ షుగర్ & నిద్ర" },
      });

      avoid.push({
        id: "processed-snacks",
        iconName: "prohibit",
        swapIconName: "plant",
        emoji: "🍟",
        name: {
          en: "Ultra-Processed Packaged Snacks & Bakery",
          hi: "पैकेटबंद स्नैक्स और बेकरी आइटम",
          te: "ప్యాక్ చేసిన చిరుతిళ్ళు & బేకరీ తిళ్ళు",
        },
        risk: {
          en: "High in inflammatory hydrogenated oils, refined sugars, and chemical emulsifiers damaging gut lining.",
          hi: "इनमें मौजूद वनस्पति तेल और रसायन आंतों की परत को नुकसान पहुंचाते हैं।",
          te: "ఇందులోని రసాయనాలు మరియు అనారోగ్యకరమైన నూనెలు పేగులను బలహీనపరుస్తాయి.",
        },
        swapFor: {
          en: "Dry-Roasted Chana, Peanuts, or Homemade Puffed Rice (Murmura)",
          hi: "भुना चना, भुनी मूंगफली या घर का बना मुरमुरा",
          te: "వేయించిన శనగలు, వేరుశనగలు లేదా మరమరాలు",
        },
        swapReason: {
          en: "Clean complex carbohydrates and plant protein without refined palm oil or toxic acrylamides.",
          hi: "पाम ऑयल और रसायनों से मुक्त स्वच्छ प्रोटीन और फाइबर।",
          te: "హానికర నూనెలు లేకుండా స్వచ్ఛమైన ప్రొటీన్ మరియు ఫైబర్.",
        },
        avoidReasonBadge: { en: "Trans Fat & Refined Flour", hi: "ट्रांस फैट व मैदा", te: "ట్రాన్స్ ఫ్యాట్స్ & మైదా" },
        swapAdvantageBadge: { en: "Zero Palm Oil", hi: "पाम ऑयल मुक्त", te: "పామాయిల్ రహితం" },
        biomarker: { en: "Systemic Inflammation (hs-CRP)", hi: "सूजन (hs-CRP)", te: "శరీర వాపు (hs-CRP)" },
      });
    }
  }

  // Universal Lifestyle Habits (3 key proven routines)
  habits.push({
    id: "habit-walk",
    title: {
      en: "100-Step Post-Meal Walk (Shatapadi)",
      hi: "भोजन के बाद 100 कदम टहलें (शतपदी)",
      te: "భోజనం తర్వాత 100 అడుగులు (శతపది)",
    },
    desc: {
      en: "A gentle 10 to 15-minute relaxed stroll after lunch and dinner can help keep sugar steadier after meals without straining the heart.",
      hi: "खाने के तुरंत बाद बैठने के बजाय 10-15 मिनट धीरे-धीरे टहलने से शुगर स्पाइक नहीं होता और पाचन तेज होता है।",
      te: "భోజనం తర్వాత 10-15 నిమిషాలు నెమ్మదిగా నడవడం వల్ల రక్తంలో షుగర్ స్థిరంగా ఉంటుంది మరియు ఆహారం చక్కగా జీర్ణమవుతుంది.",
    },
    iconName: "walk",
    badge: { en: "15 mins daily", hi: "15 मिनट रोज", te: "రోజూ 15 నిమిషాలు" },
    timing: { en: "Post-Meals (Lunch & Dinner)", hi: "भोजन के बाद", te: "భోజనం తర్వాత" },
    evidence: { en: "Can soften the rise in sugar after meals", hi: "खाने के बाद शुगर का बढ़ना कम कर सकता है", te: "భోజనం తర్వాత షుగర్ పెరుగుదలను తగ్గించవచ్చు" },
  });

  habits.push({
    id: "habit-water",
    title: {
      en: "Hydration Window (2.5L Before 8 PM)",
      hi: "हाइड्रेशन नियम (रात 8 बजे से पहले 2.5L)",
      te: "నీటి సమతుల్యత (రాత్రి 8 లోపు 2.5L)",
    },
    desc: {
      en: "Sip water steadily throughout the daytime. Limiting high fluids after 8 PM avoids midnight bathroom trips, ensuring restorative deep REM sleep.",
      hi: "दिनभर में पर्याप्त पानी पिएं। रात 8 बजे के बाद पानी सीमित रखने से रात की गहरी नींद में खलल नहीं पड़ता।",
      te: "పగటిపూట తగినంత నీరు తాగండి. రాత్రి 8 తర్వాత నీరు తగ్గించడం వల్ల నిద్రకు ఆటంకం కలగదు.",
    },
    iconName: "water",
    badge: { en: "8 AM – 8 PM", hi: "सुबह 8 - रात 8", te: "ఉదయం 8 - రాత్రి 8" },
    timing: { en: "All Day", hi: "दिनभर", te: "రోజంతా" },
    evidence: { en: "Maintains blood volume and prevents nocturia", hi: "गहरी नींद व हाइड्रेशन संतुलन", te: "రక్త ప్రసరణ & నాణ్యమైన నిద్ర" },
  });

  habits.push({
    id: "habit-chew",
    title: {
      en: "Screen-Free Mindful Chewing",
      hi: "स्क्रीन छोड़ कर 20 बार चबाएं",
      te: "స్క్రీన్ చూడకుండా నమిలి తినడం",
    },
    desc: {
      en: "Chew every mouthful at least 20 times without phones or television. Salivary amylase pre-digests starch, preventing bloating and insulin surges.",
      hi: "बिना टीवी या मोबाइल के हर निवाले को 20 बार चबाकर खाएं। लार में मौजूद एंजाइम पाचन को आसान बनाते हैं।",
      te: "టీవీ లేదా మొబైల్ చూడకుండా ఆహారాన్ని 20 సార్లు బాగా నమిలి తినండి. లాలాజలం ఆహారాన్ని తేలికగా జీర్ణం చేస్తుంది.",
    },
    iconName: "mind",
    badge: { en: "20x Chews", hi: "20 बार चबाएं", te: "20 సార్లు నమలండి" },
    timing: { en: "Every Meal", hi: "प्रत्येक भोजन", te: "ప్రతి భోజనంలో" },
    evidence: { en: "Activates cephalic phase insulin and prevents bloating", hi: "पाचन एंजाइम सक्रिय करता है", te: "జీర్ణ ఎంజైములను ఉత్తేజపరుస్తుంది" },
  });

  // Focus Title
  let focusTitle = {
    en: "Personalized Indian Diet & Lifestyle Plan",
    hi: "व्यक्तिगत भारतीय आहार और जीवनशैली योजना",
    te: "వ్యక్తిగతీకరించిన భారతీయ ఆహార & జీవనశైలి ప్రణాళిక",
  };
  let focusSubtitle = {
    en: "General suggestions based on the conditions and results in these records. Check with the doctor before changing diet.",
    hi: "इन रिकॉर्ड की बीमारियों और नतीजों पर आधारित सामान्य सुझाव। खान-पान बदलने से पहले डॉक्टर से पूछें।",
    te: "ఈ రికార్డుల్లోని వ్యాధులు, ఫలితాల ఆధారంగా సాధారణ సూచనలు. ఆహారం మార్చే ముందు డాక్టర్‌ను అడగండి.",
  };

  if (isDiabetic && isCardiacOrHypertensive) {
    focusTitle = {
      en: "Cardio-Diabetic & Glycemic Control Plan",
      hi: "हृदय व शुगर नियंत्रण आहार योजना",
      te: "గుండె & రక్తంలో చక్కెర సమతుల్య ఆహార ప్రణాళిక",
    };
  } else if (isDiabetic) {
    focusTitle = {
      en: "Glycemic Stability & Insulin Sensitivity Diet",
      hi: "शुगर स्थिरता और प्राकृतिक इंसुलिन आहार",
      te: "రక్తంలో చక్కెర స్థిరీకరణ ఆహార ప్రణాళిక",
    };
  } else if (isAnemic) {
    focusTitle = {
      en: "Iron-Rich Blood Building & Anti-Anemia Plan",
      hi: "आयरन युक्त रक्तवर्धक आहार योजना",
      te: "ఐరన్ సమృద్ధి & రక్తవృద్ధి ఆహార ప్రణాళిక",
    };
  } else if (isCardiacOrHypertensive) {
    focusTitle = {
      en: "Heart-Healthy Low Sodium (DASH) Diet",
      hi: "हृदय-सुरक्षा कम सोडियम आहार योजना",
      te: "గుండె రక్షణ & తక్కువ ఉప్పు ఆహార ప్రణాళిక",
    };
  }

  return {
    focusTitle,
    focusSubtitle,
    triggeredBy,
    eat,
    avoid,
    habits,
  };
}

import type { DesignResult } from "./schema";

// Sample plan shown when ANTHROPIC_API_KEY is not set, so the app can be tried
// before any keys are added. It does not look at the uploaded photo.

export function demoDesign(event: string): DesignResult {
  return {
    usable_photo: true,
    photo_issue: "",
    space: {
      space_type: "Demo mode — sample space",
      summary:
        "This is a sample design so you can explore the app. Add your ANTHROPIC_API_KEY and the designer will study your actual photo: its walls, light, size and the best spot for the stage.",
      estimated_size: "About 20 × 16 ft (6 × 5 m) — sample value",
      light: "Warm evening light with two wall sockets near the main wall — sample value",
      architectural_features: ["Main feature wall", "Two windows", "Open floor area", "Doorway on one side"],
      strengths: [
        "A clean main wall makes a natural stage backdrop",
        "Open floor area fits floor seating or 30–40 chairs",
        "Windows give soft daylight for photos",
      ],
      challenges: [
        "The doorway must stay clear for guest flow",
        "Limited sockets — plan one heavy-duty extension board per side",
      ],
      best_stage_spot:
        "Centred on the main wall facing the entrance, so every guest sees the couple as they walk in.",
      guest_capacity: "About 35 seated or 60 standing",
    },
    concepts: [
      {
        name: "Marigold Courtyard Glow",
        tagline: "A sunlit burst of marigolds, mirrors and fairy lights made for dancing.",
        style: "Traditional festive",
        best_for_event: event || "Mehndi",
        match_score: 94,
        why_it_works:
          "Bright marigold strands lift a plain wall instantly and photograph beautifully at golden hour. Floor seating keeps the room open for the dholki and dancing.",
        palette: [
          { name: "Marigold", hex: "#F2A007" },
          { name: "Leaf green", hex: "#3E7B27" },
          { name: "Hot pink", hex: "#D6246E" },
          { name: "Antique gold", hex: "#B8892F" },
          { name: "Ivory", hex: "#FBF4E6" },
        ],
        stage: {
          placement: "Centred against the main wall, 2 ft out from it so marigold strands can hang behind.",
          size: "10 × 8 ft, 1.5 ft high (3 × 2.4 m, 45 cm)",
          backdrop: "Curtain of marigold and rose-petal strands with a carved wooden jharokha frame in the middle",
          seating: "Low gold takht with bolster cushions and a small swing (jhoola) to one side",
          florals: "Marigold strands, pink roses at the corners, banana leaves at the base",
          lighting: "Warm fairy-light curtain behind the flowers and two brass lanterns",
        },
        decor_zones: [
          { zone: "Entrance", ideas: "Marigold torans over the door and an urli bowl of floating flowers and diyas" },
          { zone: "Ceiling", ideas: "Criss-cross strings of marigold and bright gota-patti fabric streamers" },
          { zone: "Floor seating", ideas: "White sheets with mirror-work cushions and low brass tables" },
          { zone: "Photo corner", ideas: "Colourful umbrellas hung upside down over a cycle-rickshaw prop" },
          { zone: "Mehndi station", ideas: "Two low stools with cushions and baskets of bangles" },
        ],
        lighting_plan:
          "Daylight from the windows for the afternoon; after sunset, fairy lights, lanterns and diyas in glass holders for a warm glow.",
        shopping_list: [
          { item: "Marigold strands (5 ft)", quantity: "120", est_cost: "$90" },
          { item: "Fairy-light curtains", quantity: "6", est_cost: "$60" },
          { item: "Takht / low sofa rental", quantity: "1", est_cost: "$70" },
          { item: "Mirror-work cushions", quantity: "20", est_cost: "$80" },
          { item: "Brass lanterns", quantity: "6", est_cost: "$45" },
          { item: "Gota-patti streamers", quantity: "40 m", est_cost: "$25" },
        ],
        budget_total: "$450 – $700 (sample)",
        money_saving_tips: [
          "Buy marigolds the morning of the event from the wholesale flower market",
          "Borrow cushions and brass pieces from relatives",
        ],
        setup: { time_needed: "5–6 hours", crew: "3 family members + 1 electrician", diy_friendly: true },
        image_prompt: "",
      },
      {
        name: "Ivory & Gold Royal Evening",
        tagline: "Candlelit ivory drapes and gold details for a serene, regal ceremony.",
        style: "Royal / Mughal",
        best_for_event: "Nikah",
        match_score: 88,
        why_it_works:
          "Ivory draping hides busy walls and reflects warm light, making the room look larger. Gold accents add grandeur without overwhelming a home space.",
        palette: [
          { name: "Ivory", hex: "#F7F1E3" },
          { name: "Champagne", hex: "#E3CFA4" },
          { name: "Antique gold", hex: "#B8892F" },
          { name: "Sage", hex: "#9CAF88" },
        ],
        stage: {
          placement: "Against the main wall with draped fabric pulled to both corners.",
          size: "12 × 8 ft, 1 ft high (3.6 × 2.4 m, 30 cm)",
          backdrop: "Mughal arch panel in ivory with gold trim, framed by layered chiffon drapes",
          seating: "Carved ivory-and-gold sofa for the couple",
          florals: "White roses, baby's breath and eucalyptus at the arch base",
          lighting: "Pillar candles in hurricane glass and warm uplights behind the drapes",
        },
        decor_zones: [
          { zone: "Entrance", ideas: "Ivory drape swags with white rose garlands" },
          { zone: "Ceiling", ideas: "Sheer fabric canopy with a central crystal chandelier" },
          { zone: "Aisle", ideas: "Rose-petal aisle lined with lanterns" },
          { zone: "Guest seating", ideas: "Gold Chiavari chairs with ivory cushions" },
        ],
        lighting_plan: "Warm white only — uplights, candles and one chandelier. Avoid coloured LEDs.",
        shopping_list: [
          { item: "Chiffon draping", quantity: "60 m", est_cost: "$120" },
          { item: "Arch panel rental", quantity: "1", est_cost: "$150" },
          { item: "White roses", quantity: "200 stems", est_cost: "$160" },
          { item: "LED pillar candles", quantity: "24", est_cost: "$50" },
          { item: "Chiavari chairs rental", quantity: "40", est_cost: "$160" },
        ],
        budget_total: "$900 – $1,400 (sample)",
        money_saving_tips: ["Use LED candles — safer near fabric and reusable", "Rent the arch instead of building"],
        setup: { time_needed: "6–8 hours", crew: "Decorator team of 3", diy_friendly: false },
        image_prompt: "",
      },
      {
        name: "Blush Garden Soirée",
        tagline: "Soft pastels, hanging florals and greenery for a dreamy reception.",
        style: "Floral garden",
        best_for_event: "Walima / Reception",
        match_score: 81,
        why_it_works:
          "Hanging florals draw the eye upward and soften hard edges, while pastels photograph beautifully under warm light.",
        palette: [
          { name: "Blush", hex: "#F3C6C9" },
          { name: "Dusty rose", hex: "#C98A93" },
          { name: "Sage", hex: "#A3B18A" },
          { name: "Cream", hex: "#FFF8EE" },
          { name: "Brushed gold", hex: "#C8A45D" },
        ],
        stage: {
          placement: "Against the main wall with a floral installation suspended above.",
          size: "10 × 8 ft, 1 ft high (3 × 2.4 m, 30 cm)",
          backdrop: "Round moon-gate arch covered in blush and white flowers with greenery",
          seating: "Cream velvet loveseat",
          florals: "Blush roses, hydrangeas and trailing greenery",
          lighting: "Warm string lights woven through a hanging greenery cloud",
        },
        decor_zones: [
          { zone: "Ceiling", ideas: "Suspended greenery cloud with string lights" },
          { zone: "Tables", ideas: "Low pastel centrepieces with tea lights" },
          { zone: "Entrance", ideas: "Floral welcome easel framed by potted olive trees" },
          { zone: "Photo corner", ideas: "Neon-free floral wall with a swing" },
        ],
        lighting_plan: "Warm string lights and candles; one soft spotlight on the stage for photos.",
        shopping_list: [
          { item: "Moon-gate arch rental", quantity: "1", est_cost: "$120" },
          { item: "Mixed pastel flowers", quantity: "250 stems", est_cost: "$220" },
          { item: "Artificial greenery garlands", quantity: "30", est_cost: "$90" },
          { item: "String lights", quantity: "10 × 10 m", est_cost: "$60" },
        ],
        budget_total: "$700 – $1,100 (sample)",
        money_saving_tips: ["Mix artificial greenery with fresh flowers at eye level only"],
        setup: { time_needed: "5–7 hours", crew: "2 family members + florist", diy_friendly: true },
        image_prompt: "",
      },
    ],
    recommended_index: 0,
    designer_notes: [
      "Test every light and extension board the night before.",
      "Keep a 4 ft clear path from the entrance to the stage.",
      "Do a quick phone photo test at event time to check the lighting.",
    ],
    avoid: ["Real candles near draped fabric", "Blocking the only doorway with the stage or props"],
  };
}

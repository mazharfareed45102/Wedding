import { z } from "zod";

// The structured design plan Claude returns. Field descriptions are sent to the
// model as part of the JSON schema, so they double as instructions.

const PaletteColor = z.object({
  name: z.string().describe("Friendly color name, e.g. 'Marigold' or 'Antique gold'"),
  hex: z.string().describe("6-digit hex code, e.g. #E8A317"),
});

const Stage = z.object({
  placement: z
    .string()
    .describe(
      "Exactly where the stage goes in THIS photo, referencing visible features (walls, windows, doors, trees, stairs) and which way it faces guests",
    ),
  size: z.string().describe("Recommended stage width x depth x height, in feet and metres"),
  backdrop: z.string().describe("The backdrop/frame design behind the couple"),
  seating: z.string().describe("Seating for the couple on stage (sofa, takht, swing/jhoola, chairs...)"),
  florals: z.string().describe("Flowers and greenery on and around the stage"),
  lighting: z.string().describe("Stage lighting"),
});

const DecorZone = z.object({
  zone: z.string().describe("Area name, e.g. Entrance, Ceiling, Walls, Floor, Guest seating, Photo corner"),
  ideas: z.string().describe("Concrete decor for that area"),
});

const ShoppingItem = z.object({
  item: z.string(),
  quantity: z.string(),
  est_cost: z.string().describe("Estimated cost in the user's local currency"),
});

export const DesignConceptSchema = z.object({
  name: z.string().describe("Evocative concept name, e.g. 'Marigold Courtyard Glow'"),
  tagline: z.string().describe("One sentence that sells the mood"),
  style: z.string(),
  best_for_event: z.string().describe("Which wedding function this concept suits best"),
  match_score: z
    .number()
    .describe("0-100: how well this concept fits this specific space, event, budget and preferences"),
  why_it_works: z.string().describe("Why this concept suits THIS space, in 2-3 sentences"),
  palette: z.array(PaletteColor).describe("4 to 6 colors"),
  stage: Stage,
  decor_zones: z.array(DecorZone).describe("4 to 6 zones beyond the stage"),
  lighting_plan: z.string().describe("Overall lighting plan, including day vs evening"),
  shopping_list: z.array(ShoppingItem).describe("6 to 12 key items to buy or rent"),
  budget_total: z.string().describe("Estimated total range in local currency"),
  money_saving_tips: z.array(z.string()).describe("2 to 4 tips"),
  setup: z.object({
    time_needed: z.string(),
    crew: z.string().describe("Who is needed, e.g. '2 family members + 1 electrician'"),
    diy_friendly: z.boolean(),
  }),
  image_prompt: z
    .string()
    .describe(
      "Instruction for a photo-editing AI that will decorate the user's ORIGINAL photo with this concept. See the system prompt for how to write it.",
    ),
});

export const DesignResultSchema = z.object({
  usable_photo: z
    .boolean()
    .describe("false if the photo is not a space that can be decorated (e.g. a selfie, a document, too dark or blurry)"),
  photo_issue: z
    .string()
    .describe("Empty string if usable_photo is true; otherwise what is wrong and what photo to take instead"),
  space: z.object({
    space_type: z.string().describe("e.g. 'Indoor living room', 'Open courtyard', 'Front lawn'"),
    summary: z.string().describe("What you see, as an expert walking the space, in 2-4 sentences"),
    estimated_size: z.string().describe("Approximate dimensions in feet and metres"),
    light: z.string().describe("Natural light, existing fixtures, and power points you can see"),
    architectural_features: z.array(z.string()),
    strengths: z.array(z.string()).describe("2 to 4 things that work in this space's favour"),
    challenges: z.array(z.string()).describe("2 to 4 constraints to design around"),
    best_stage_spot: z.string().describe("The single best stage location and why"),
    guest_capacity: z.string().describe("Comfortable guest capacity seated and standing"),
  }),
  concepts: z.array(DesignConceptSchema).describe("Exactly 3 distinct design concepts, best match first"),
  recommended_index: z.number().describe("Index (0-2) of the concept you recommend most"),
  designer_notes: z.array(z.string()).describe("3 to 5 expert tips specific to this space and event"),
  avoid: z.array(z.string()).describe("2 to 4 mistakes to avoid in this space"),
});

export type DesignResult = z.infer<typeof DesignResultSchema>;
export type DesignConcept = z.infer<typeof DesignConceptSchema>;

export interface AnalyzeResponse {
  design: DesignResult;
  demo: boolean;
}

export interface GenerateResponse {
  demo: boolean;
  image?: string; // data URL
  provider?: string;
  model?: string;
}

export type ImageProvider = "gemini" | "openai";

export interface StatusResponse {
  designer: boolean;
  imageProvider: ImageProvider | null;
  passcodeRequired: boolean;
}

export const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

export interface InputImage {
  data: string; // base64, no data: prefix
  mediaType: AllowedMediaType;
}

export interface GenerateRequest {
  image: InputImage;
  mode: "design" | "refine";
  /** The concept's image prompt (design) or the requested change (refine). */
  prompt: string;
  /** Width / height of the original photo. */
  aspect: number;
}

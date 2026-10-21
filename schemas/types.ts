import { z } from "zod";

// ==========================================
// 0. Common & Tag Enums (Centralized per SPEC_V2)
// ==========================================

export const SubjectTagEnum = z.enum([
  "toan-tin",
  "khoa-hoc-tu-nhien",
  "xa-hoi-nhan-van",
  "ngoai-ngu",
  "kinh-te-quan-tri",
  "tong-hop",
]);
export type SubjectTag = z.infer<typeof SubjectTagEnum>;

export const StyleTagEnum = z.enum([
  "hoc-thuat-nghiem-tuc",
  "hien-dai-toi-gian",
  "sinh-dong-tre-trung",
  "cong-nghe-tuong-lai",
]);
export type StyleTag = z.infer<typeof StyleTagEnum>;

export const EffectTagEnum = z.enum([
  "nhe-nhang-fade",
  "nang-dong-kinetic",
  "chu-danh-may-typewriter",
]);
export type EffectTag = z.infer<typeof EffectTagEnum>;

export const TemplateIdEnum = z.enum([
  "title-slide",
  "learning-objectives",
  "concept-explain",
  "bullet-breakdown",
  "image-explain",
  "comparison",
  "timeline",
  "formula-explain",
  "quiz",
  "summary",
]);
export type TemplateId = z.infer<typeof TemplateIdEnum>;

export const AnimationPresetEnum = z.enum([
  "fade-in",
  "slide-in",
  "zoom-in",
  "typewriter",
  "step-by-step",
  "highlight-keyword",
]);
export type AnimationPreset = z.infer<typeof AnimationPresetEnum>;

export const TTSProviderEnum = z.enum(["vieneu", "viettel", "fake"]);
export type TTSProvider = z.infer<typeof TTSProviderEnum>;

export const FileTypeEnum = z.enum(["pptx", "pdf", "docx", "md"]);
export type FileType = z.infer<typeof FileTypeEnum>;

export const SlotRoleEnum = z.enum([
  "title",
  "subtitle",
  "badge",
  "body",
  "bullets",
  "media",
  "diagram",
  "formula",
  "quiz",
  "timeline",
]);
export type SlotRole = z.infer<typeof SlotRoleEnum>;

export const SlotAcceptsTypeEnum = z.enum([
  "text",
  "list",
  "image",
  "video",
  "diagram",
  "chart",
  "formula",
]);
export type SlotAcceptsType = z.infer<typeof SlotAcceptsTypeEnum>;

export const LayoutPurposeEnum = z.enum([
  "title",
  "concept-explain",
  "bullet-breakdown",
  "image-explain",
  "comparison",
  "timeline",
  "formula-explain",
  "quiz",
  "summary",
  "custom",
]);
export type LayoutPurpose = z.infer<typeof LayoutPurposeEnum>;

export const MediaSourceTypeEnum = z.enum([
  "document",
  "diagram",
  "chart",
  "upload",
  "ai-image",
]);
export type MediaSourceType = z.infer<typeof MediaSourceTypeEnum>;

export const MediaTypeEnum = z.enum(["image", "video", "diagram"]);
export type MediaType = z.infer<typeof MediaTypeEnum>;

// ==========================================
// 1. DocumentContext Schemas
// ==========================================

export const ExtractedImageSchema = z.object({
  id: z.string(),
  filePath: z.string(),
  originalName: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  format: z.string().optional(),
});
export type ExtractedImage = z.infer<typeof ExtractedImageSchema>;

export const DocumentTableSchema = z.object({
  headers: z.array(z.string()).optional(),
  rows: z.array(z.array(z.string())).optional(),
});
export type DocumentTable = z.infer<typeof DocumentTableSchema>;

export const DocumentSectionSchema = z.object({
  sectionId: z.string(),
  title: z.string(),
  contentOrder: z.number().int(),
  bullets: z.array(z.string()).default([]),
  tables: z.array(DocumentTableSchema).default([]),
  speakerNotes: z.string().optional(),
  imageIds: z.array(z.string()).default([]),
});
export type DocumentSection = z.infer<typeof DocumentSectionSchema>;

export const DocumentContextSchema = z.object({
  title: z.string(),
  sourceFileName: z.string(),
  fileType: FileTypeEnum,
  sections: z.array(DocumentSectionSchema),
  author: z.string().optional(),
  subject: z.string().optional(),
  extractedImages: z.array(ExtractedImageSchema).default([]),
  metadata: z.record(z.any()).default({}),
});
export type DocumentContext = z.infer<typeof DocumentContextSchema>;

// ==========================================
// 2. LessonOutline Schemas
// ==========================================

export const OutlineSlideSchema = z.object({
  slideId: z.string(),
  suggestedTemplateId: z.union([TemplateIdEnum, z.string()]).optional(),
  suggestedLayoutId: z.string().optional(),
  title: z.string(),
  keyTakeaways: z.array(z.string()),
  speakerNotesDraft: z.string(),
  contentPayload: z.record(z.any()).optional(),
});
export type OutlineSlide = z.infer<typeof OutlineSlideSchema>;

export const QuizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int(),
  explanation: z.string(),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const OutlineSectionSchema = z.object({
  sectionTitle: z.string(),
  description: z.string().optional(),
  slideCount: z.number().int(),
});
export type OutlineSection = z.infer<typeof OutlineSectionSchema>;

export const LessonOutlineSchema = z.object({
  topic: z.string(),
  targetAudience: z.string(),
  estimatedDurationMinutes: z.number(),
  learningObjectives: z.array(z.string()).min(1),
  slides: z.array(OutlineSlideSchema).min(1),
  summary: z.string(),
  sections: z.array(OutlineSectionSchema).default([]),
  quiz: z.array(QuizQuestionSchema).default([]),
  status: z.enum(["draft", "approved"]).default("draft"),
});
export type LessonOutline = z.infer<typeof LessonOutlineSchema>;

// ==========================================
// 3. TemplatePack Schemas (v2)
// ==========================================

export const SlotConstraintsSchema = z.object({
  maxChars: z.number().int().optional(),
  maxItems: z.number().int().optional(),
  aspectRatio: z.string().optional(),
});
export type SlotConstraints = z.infer<typeof SlotConstraintsSchema>;

export const SlotSchema = z.object({
  id: z.string(),
  role: SlotRoleEnum,
  accepts: z.array(SlotAcceptsTypeEnum),
  constraints: SlotConstraintsSchema.optional(),
  optional: z.boolean().default(false),
  defaultValue: z.any().optional(),
});
export type Slot = z.infer<typeof SlotSchema>;

export const VariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  layoutType: z.string().optional(),
});
export type Variant = z.infer<typeof VariantSchema>;

export const DecorElementSchema = z.object({
  id: z.string(),
  type: z.string(),
  content: z.any().optional(),
  style: z.record(z.any()).optional(),
});
export type DecorElement = z.infer<typeof DecorElementSchema>;

export const AnimationItemSchema = z.object({
  target: z.string(),
  preset: AnimationPresetEnum,
  delay: z.number().min(0.0),
  duration: z.number().min(0.1),
  easing: z.string().default("power2.out"),
});
export type AnimationItem = z.infer<typeof AnimationItemSchema>;

export const LayoutSchema = z.object({
  id: z.string(),
  name: z.string(),
  purpose: LayoutPurposeEnum,
  slots: z.array(SlotSchema),
  decor: z.array(DecorElementSchema).default([]),
  variants: z.array(VariantSchema),
  defaultAnimations: z.array(AnimationItemSchema).default([]),
});
export type Layout = z.infer<typeof LayoutSchema>;

export const PackTagsSchema = z.object({
  subject: z.array(SubjectTagEnum),
  style: z.array(StyleTagEnum),
  effect: z.array(EffectTagEnum),
});
export type PackTags = z.infer<typeof PackTagsSchema>;

export const PackColorsSchema = z.object({
  primary: z.string().optional(),
  primaryHover: z.string().optional(),
  accent: z.string().optional(),
  bgCanvas: z.string().optional(),
  bgCard: z.string().optional(),
  textMain: z.string().optional(),
  textSub: z.string().optional(),
  border: z.string().optional(),
});
export type PackColors = z.infer<typeof PackColorsSchema>;

export const PackFontsSchema = z.object({
  heading: z.string().default("Be Vietnam Pro, sans-serif"),
  body: z.string().default("Be Vietnam Pro, sans-serif"),
  code: z.string().default("JetBrains Mono, monospace"),
});
export type PackFonts = z.infer<typeof PackFontsSchema>;

export const PackTokensSchema = z.object({
  colors: PackColorsSchema,
  fonts: PackFontsSchema.default({}),
  spacing: z.record(z.any()).optional(),
});
export type PackTokens = z.infer<typeof PackTokensSchema>;

export const TemplatePackSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  previewVideoUrl: z.string().optional(),
  aspectRatio: z.enum(["16:9"]).default("16:9"),
  tags: PackTagsSchema,
  tokens: PackTokensSchema,
  layouts: z.array(LayoutSchema),
});
export type TemplatePack = z.infer<typeof TemplatePackSchema>;

// ==========================================
// 4. LessonSceneJSON Schemas (v2)
// ==========================================

export const MediaCandidateSchema = z.object({
  id: z.string(),
  source: MediaSourceTypeEnum,
  type: MediaTypeEnum,
  url: z.string(),
  alt: z.string().optional(),
  relevance: z.number().min(0.0).max(1.0).default(1.0),
  license: z.string().default("educational-fair-use"),
});
export type MediaCandidate = z.infer<typeof MediaCandidateSchema>;

export const VoiceConfigSchema = z.object({
  narration: z.string(),
  provider: TTSProviderEnum,
  voiceId: z.string().optional(),
  audioUrl: z.string().nullable().optional(),
  durationSeconds: z.number().min(0.0).nullable().optional(),
});
export type VoiceConfig = z.infer<typeof VoiceConfigSchema>;

export const SlideElementSchema = z.object({
  id: z.string(),
  type: z.string(),
  content: z.any().optional(),
  style: z.record(z.any()).optional(),
});
export type SlideElement = z.infer<typeof SlideElementSchema>;

export const SlideSceneSchema = z.object({
  slideId: z.string(),
  layoutId: z.string().optional(),
  templateId: z.union([TemplateIdEnum, z.string()]).optional(),
  variantId: z.string().default("default"),
  layoutVariant: z.string().optional().default("default"),
  title: z.string().optional().default(""),
  subtitle: z.string().optional(),
  slotValues: z.record(z.any()).default({}),
  media: z.array(MediaCandidateSchema).default([]),
  elements: z.array(SlideElementSchema).default([]),
  animations: z.array(AnimationItemSchema).default([]),
  voice: VoiceConfigSchema,
  durationSeconds: z.number().min(1.0),
  notes: z.string().optional(),
});
export type SlideScene = z.infer<typeof SlideSceneSchema>;

export const LessonSceneSchema = z.object({
  schemaVersion: z.number().int().default(2),
  packId: z.string().default("basic"),
  projectId: z.string(),
  title: z.string(),
  slides: z.array(SlideSceneSchema).min(1),
  theme: z
    .object({
      colorScheme: z.string().default("academic-ocean"),
      fontFamily: z.string().default("Be Vietnam Pro, sans-serif"),
      aspectRatio: z.string().default("16:9"),
    })
    .optional(),
  totalDurationSeconds: z.number().optional(),
});
export type LessonSceneJSON = z.infer<typeof LessonSceneSchema>;
